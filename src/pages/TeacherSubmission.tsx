import { useEffect, useState } from "react";
import type { Attendee, TeacherSubmission } from "../types";
import {
  getSettings,
  generateId,
  todayISO,
  formatDisplayDate,
  saveDraftSubmission,
  getDraftSubmission,
  clearDraftSubmission,
  type DraftSubmission,
} from "../storage";
import { upsertSubmissionRemote } from "../remoteSubmissions";
import { encodeSubmission, copyToClipboard, normalizeTeacherName } from "../utils";
import PageHeader from "../components/PageHeader";
import StatusBanner from "../components/StatusBanner";

interface Props {
  onBack: () => void;
  editingSubmission?: TeacherSubmission | null;
}

function emptyAttendee(): Attendee {
  return { id: generateId(), name: "", phone: "" };
}

export default function TeacherSubmission({ onBack, editingSubmission }: Props) {
  const settings = getSettings();
  const isEditing = !!editingSubmission;

  const knownTeacher =
    !!editingSubmission &&
    settings.teachers.some(
      (t) => normalizeTeacherName(t.name) === normalizeTeacherName(editingSubmission.teacherName)
    );

  const [teacherName, setTeacherName] = useState(() => {
    if (!editingSubmission) return "";
    return knownTeacher
      ? settings.teachers.find(
          (t) => normalizeTeacherName(t.name) === normalizeTeacherName(editingSubmission.teacherName)
        )!.name
      : "__custom__";
  });
  const [customName, setCustomName] = useState(() =>
    editingSubmission && !knownTeacher ? editingSubmission.teacherName : ""
  );
  const [date, setDate] = useState(() => editingSubmission?.date ?? todayISO());
  const [attendees, setAttendees] = useState<Attendee[]>(() =>
    editingSubmission && editingSubmission.attendees.length > 0
      ? editingSubmission.attendees.map((a) => ({ ...a }))
      : [emptyAttendee()]
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [shareCode, setShareCode] = useState("");
  const [codeCopied, setCodeCopied] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);

  // ── Saving state ────────────────────────────────────────────────────────────
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  // ── Offline draft (only relevant for a brand-new submission, not an edit) ───
  const [draftAvailable, setDraftAvailable] = useState<DraftSubmission | null>(null);

  useEffect(() => {
    if (editingSubmission) return;
    const draft = getDraftSubmission();
    if (draft && (draft.teacherName.trim() || draft.attendees.some((a) => a.name.trim()))) {
      setDraftAvailable(draft);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isEditing || submitted) return;
    const draft: DraftSubmission = {
      teacherName: teacherName === "__custom__" ? customName : teacherName,
      date,
      attendees,
    };
    const hasContent =
      draft.teacherName.trim() ||
      attendees.some((a) => a.name.trim() || a.phone.trim());
    if (hasContent) {
      saveDraftSubmission(draft);
    }
  }, [teacherName, customName, date, attendees, isEditing, submitted]);

  function restoreDraft() {
    if (!draftAvailable) return;
    const matched = settings.teachers.find(
      (t) => normalizeTeacherName(t.name) === normalizeTeacherName(draftAvailable.teacherName)
    );
    setTeacherName(matched ? matched.name : "__custom__");
    setCustomName(matched ? "" : draftAvailable.teacherName);
    setDate(draftAvailable.date || todayISO());
    setAttendees(
      draftAvailable.attendees.length > 0 ? draftAvailable.attendees : [emptyAttendee()]
    );
    setDraftAvailable(null);
  }

  function discardDraft() {
    clearDraftSubmission();
    setDraftAvailable(null);
  }

  const finalTeacherName = teacherName === "__custom__" ? customName : teacherName;

  // Duplicate detection (attendee names/phones within this submission)
  const nameCounts: Record<string, number> = {};
  const phoneCounts: Record<string, number> = {};
  attendees.forEach((a) => {
    const n = a.name.trim().toLowerCase();
    const p = a.phone.trim();
    if (n) nameCounts[n] = (nameCounts[n] ?? 0) + 1;
    if (p) phoneCounts[p] = (phoneCounts[p] ?? 0) + 1;
  });

  function addAttendee() {
    setAttendees((prev) => [...prev, emptyAttendee()]);
  }

  function removeAttendee(id: string) {
    setAttendees((prev) => prev.filter((a) => a.id !== id));
  }

  function updateAttendee(id: string, field: keyof Attendee, value: string) {
    setAttendees((prev) =>
      prev.map((a) => (a.id === id ? { ...a, [field]: value } : a))
    );
    setErrors((e) => ({ ...e, [id + field]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!finalTeacherName.trim()) e.teacher = "Please enter or select your name.";
    if (!date) e.date = "Please select a date.";
    attendees.forEach((a) => {
      if (!a.name.trim()) e[a.id + "name"] = "Name is required.";
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;

    setSaveError("");
    setSaving(true);

    const sub: TeacherSubmission = {
      id: editingSubmission?.id ?? generateId(),
      teacherName: finalTeacherName.trim(),
      date,
      attendees: attendees.map((a) => ({
        ...a,
        name: a.name.trim(),
        phone: a.phone.trim(),
      })),
      submittedAt: new Date().toISOString(),
    };

    try {
      await upsertSubmissionRemote(sub);
      clearDraftSubmission();
      setSavedLocally(true);

      if (isEditing) {
        setSaving(false);
        onBack();
        return;
      }

      const code = encodeSubmission(sub);
      setShareCode(code);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setSaveError(
        "Couldn't save to the server. Check your connection and try again — nothing has been lost, your entries are still here."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleCopyCode() {
    const ok = await copyToClipboard(shareCode);
    if (ok) {
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2500);
    }
  }

  function handleNewSubmission() {
    setTeacherName("");
    setCustomName("");
    setDate(todayISO());
    setAttendees([emptyAttendee()]);
    setErrors({});
    setSubmitted(false);
    setShareCode("");
    setSavedLocally(false);
    setSaveError("");
  }

  const inputCls =
    "border-2 border-cream-200 rounded-xl px-3 py-2.5 text-bark text-sm font-semibold focus:border-forest focus:outline-none bg-white w-full";

  if (submitted) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader title="Submission Complete" onBack={onBack} />
        <main className="flex-1 px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
          <div className="bg-forest-subtle border border-forest/20 rounded-2xl p-5 mb-5 text-center">
            <div className="text-4xl mb-3">✅</div>
            <h2 className="font-display font-bold text-forest-dark text-xl mb-1">
              Thank you, {finalTeacherName}!
            </h2>
            <p className="text-sm text-bark-light">
              {attendees.length} {attendees.length === 1 ? "person" : "people"}{" "}
              recorded for {formatDisplayDate(date)}.
            </p>
          </div>

          {savedLocally && (
            <p className="text-xs text-forest font-semibold text-center mb-4">
              ✓ Synced to the shared database — your secretary can see it right
              away, from any phone.
            </p>
          )}

          {/* Optional backup: manual code, in case sync ever fails */}
          <div className="bg-white border-2 border-cream-200 rounded-2xl p-4 mb-4">
            <h3 className="font-bold text-bark text-sm mb-1">
              Optional backup code
            </h3>
            <p className="text-xs text-bark-muted mb-3">
              Your attendance already synced automatically. This code is just a
              backup — only needed if your secretary ever asks for it because
              of a connection issue.
            </p>

            <button
              onClick={handleCopyCode}
              className="w-full py-3 bg-forest text-white font-bold text-sm rounded-xl active:scale-95 transition-all"
            >
              {codeCopied ? "✓ Copied!" : "📋 Copy Backup Code"}
            </button>
          </div>

          <button
            onClick={handleNewSubmission}
            className="w-full py-3 border-2 border-forest text-forest font-bold text-sm rounded-xl"
          >
            Submit Another Attendance
          </button>
          <button
            onClick={onBack}
            className="w-full mt-2 py-3 text-bark-muted font-semibold text-sm rounded-xl"
          >
            Back to Dashboard
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title={isEditing ? "Edit Attendance" : "Teacher Attendance Form"}
        subtitle={
          isEditing ? "Update who attended your class" : "Record who attended your class"
        }
        onBack={onBack}
      />

      <main className="flex-1 px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        {draftAvailable && (
          <StatusBanner
            variant="warning"
            message="📝 We found an unsaved draft from last time."
            className="mb-4"
          >
            <div className="flex gap-2">
              <button
                onClick={restoreDraft}
                className="flex-1 py-2 bg-forest text-white font-bold text-xs rounded-lg active:scale-95 transition-all"
              >
                Restore Draft
              </button>
              <button
                onClick={discardDraft}
                className="flex-1 py-2 border border-forest/30 text-bark-muted font-bold text-xs rounded-lg active:scale-95 transition-all"
              >
                Discard
              </button>
            </div>
          </StatusBanner>
        )}

        {/* Teacher name */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-bark-light mb-1" htmlFor="teacher-select">
            Your Name
          </label>
          <select
            id="teacher-select"
            value={teacherName}
            onChange={(e) => { setTeacherName(e.target.value); setErrors((er) => ({ ...er, teacher: "" })); }}
            className={inputCls}
          >
            <option value="">— Select your name —</option>
            {settings.teachers.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
            <option value="__custom__">Other (type below)</option>
          </select>
          {teacherName === "__custom__" && (
            <input
              type="text"
              value={customName}
              onChange={(e) => { setCustomName(e.target.value); setErrors((er) => ({ ...er, teacher: "" })); }}
              placeholder="Enter your name"
              className={`${inputCls} mt-2`}
            />
          )}
          {errors.teacher && (
            <p className="text-xs text-danger mt-1">{errors.teacher}</p>
          )}
        </div>

        {/* Date */}
        <div className="mb-5">
          <label className="block text-sm font-bold text-bark-light mb-1" htmlFor="sub-date">
            Sunday Date
          </label>
          <input
            id="sub-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
          {errors.date && (
            <p className="text-xs text-danger mt-1">{errors.date}</p>
          )}
        </div>

        {/* Attendees */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-bold text-bark text-sm">
              Attendees
            </h2>
            <span className="bg-forest text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {attendees.length} present
            </span>
          </div>

          <div className="flex flex-col gap-3">
            {attendees.map((attendee, idx) => {
              const dupName =
                attendee.name.trim() &&
                nameCounts[attendee.name.trim().toLowerCase()] > 1;
              const dupPhone =
                attendee.phone.trim() &&
                phoneCounts[attendee.phone.trim()] > 1;

              return (
                <div
                  key={attendee.id}
                  className="bg-white border-2 border-cream-200 rounded-2xl p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-bark-muted uppercase tracking-wide">
                      Person {idx + 1}
                    </span>
                    {attendees.length > 1 && (
                      <button
                        onClick={() => removeAttendee(attendee.id)}
                        aria-label="Remove attendee"
                        className="text-danger text-xs font-bold px-2 py-1 rounded-lg hover:bg-danger-bg transition-colors"
                      >
                        ✕ Remove
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <div>
                      <input
                        type="text"
                        value={attendee.name}
                        onChange={(e) =>
                          updateAttendee(attendee.id, "name", e.target.value)
                        }
                        placeholder="Full name *"
                        aria-label={`Person ${idx + 1} full name`}
                        className={`${inputCls} ${
                          errors[attendee.id + "name"] || dupName
                            ? "border-danger"
                            : ""
                        }`}
                      />
                      {errors[attendee.id + "name"] && (
                        <p className="text-xs text-danger mt-0.5">
                          {errors[attendee.id + "name"]}
                        </p>
                      )}
                      {dupName && !errors[attendee.id + "name"] && (
                        <p className="text-xs text-warning mt-0.5">
                          ⚠️ This name appears more than once.
                        </p>
                      )}
                    </div>

                    <div>
                      <input
                        type="tel"
                        inputMode="tel"
                        value={attendee.phone}
                        onChange={(e) =>
                          updateAttendee(attendee.id, "phone", e.target.value)
                        }
                        placeholder="Phone number"
                        aria-label={`Person ${idx + 1} phone number`}
                        className={`${inputCls} ${dupPhone ? "border-warning" : ""}`}
                      />
                      {dupPhone && (
                        <p className="text-xs text-warning mt-0.5">
                          ⚠️ This number appears more than once.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={addAttendee}
            className="mt-3 w-full py-3 border-2 border-dashed border-forest/40 text-forest font-bold text-sm rounded-2xl hover:bg-forest-subtle transition-colors active:scale-95"
          >
            + Add Attendee
          </button>
        </div>

        {saveError && (
          <StatusBanner variant="error" message={saveError} className="mb-3" />
        )}

        {/* Submit */}
        <div className="mt-5">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="w-full py-4 bg-forest text-white font-bold text-base rounded-2xl shadow active:scale-95 transition-all disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : isEditing
              ? "Save Changes"
              : `Submit Attendance (${attendees.length})`}
          </button>
          <p className="text-xs text-bark-muted text-center mt-2">
            Only people who actually attended should be listed.
          </p>
        </div>
      </main>
    </div>
  );
}
