import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import type { TeacherSubmission, SundayRecord } from "../types";
import {
  getSettings,
  getSundayRecords,
  saveSundayRecord,
  generateId,
  todayISO,
  formatDisplayDate,
} from "../storage";
import {
  fetchSubmissionsForDate,
  upsertSubmissionRemote,
  deleteSubmissionRemote,
  subscribeToDateChanges,
  unsubscribeChannel,
} from "../remoteSubmissions";
import {
  buildSundayMessage,
  calcSubmissionTotals,
  decodeSubmission,
} from "../utils";
import PageHeader from "../components/PageHeader";
import MessagePreview from "../components/MessagePreview";
import ConfirmDialog from "../components/ConfirmDialog";
import TeacherSubmissionForm from "./TeacherSubmission";

interface Props {
  onSaved?: () => void;
}

type SubView = "dashboard" | "teacher-form" | "import-code" | "view-submission";

export default function SundayAttendance({ onSaved }: Props) {
  const settings = getSettings();

  const [date, setDate] = useState(todayISO());
  const [submissions, setSubmissions] = useState<TeacherSubmission[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);
  const [submissionsError, setSubmissionsError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [subView, setSubView] = useState<SubView>("dashboard");
  const [viewingSubmission, setViewingSubmission] = useState<TeacherSubmission | null>(null);
  const [editingSubmission, setEditingSubmission] = useState<TeacherSubmission | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [importCode, setImportCode] = useState("");
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState("");
  const [importSaving, setImportSaving] = useState(false);
  const [existingRecord, setExistingRecord] = useState<SundayRecord | null>(null);

  const channelRef = useRef<RealtimeChannel | null>(null);

  // Local record metadata (notes + "already saved" indicator) — this stays
  // local; only the live submissions list comes from Supabase.
  function loadRecordMeta(d: string) {
    const records = getSundayRecords();
    const rec = records.find((r) => r.date === d) ?? null;
    setExistingRecord(rec);
    setNotes(rec?.notes ?? "");
  }

  async function loadSubmissions(d: string, opts?: { silent?: boolean }) {
    if (!opts?.silent) setSubmissionsLoading(true);
    setSubmissionsError("");
    try {
      const remote = await fetchSubmissionsForDate(d);
      setSubmissions(remote);
    } catch (err) {
      console.error(err);
      setSubmissionsError(
        "Couldn't load submissions from the server. Check your connection and try Refresh."
      );
    } finally {
      if (!opts?.silent) setSubmissionsLoading(false);
    }
  }

  async function handleManualRefresh() {
    setRefreshing(true);
    await loadSubmissions(date, { silent: true });
    setRefreshing(false);
  }

  // Load + subscribe whenever the selected date changes
  useEffect(() => {
    loadRecordMeta(date);
    loadSubmissions(date);

    if (channelRef.current) {
      unsubscribeChannel(channelRef.current);
      channelRef.current = null;
    }
    channelRef.current = subscribeToDateChanges(date, () => {
      loadSubmissions(date, { silent: true });
    });

    return () => {
      if (channelRef.current) {
        unsubscribeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const { bsTotal } = calcSubmissionTotals(submissions);
  const grandTotal = bsTotal;

  // Build a SundayRecord for message preview
  const draftRecord: SundayRecord = {
    id: existingRecord?.id ?? generateId(),
    date,
    submissions,
    attendances: {},
    cellAttendance: String(grandTotal),
    notes,
    createdAt: existingRecord?.createdAt ?? new Date().toISOString(),
  };

  const message = buildSundayMessage(draftRecord, settings);

  function handleSave() {
    const record: SundayRecord = {
      ...draftRecord,
      submissions,
    };
    saveSundayRecord(record);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  }

  async function handleDeleteSubmission() {
    if (!deleteTarget) return;
    const id = deleteTarget;
    setDeleteTarget(null);

    const prev = submissions;
    setSubmissions((p) => p.filter((s) => s.id !== id));

    try {
      await deleteSubmissionRemote(id);
    } catch (err) {
      console.error(err);
      setSubmissions(prev);
      setSubmissionsError("Couldn't remove that submission. Please try again.");
    }
  }

  async function handleImportCode() {
    setImportError("");
    const sub = decodeSubmission(importCode);
    if (!sub) {
      setImportError("Invalid code. Please check and try again.");
      return;
    }

    const imported: TeacherSubmission = {
      ...sub,
      id: generateId(),
      date,
      submittedAt: new Date().toISOString(),
    };

    setImportSaving(true);
    try {
      await upsertSubmissionRemote(imported);
      setImportCode("");
      setImportSuccess(
        `Imported ${imported.teacherName}'s submission (${imported.attendees.length} people).`
      );
      setSubView("dashboard");
      loadSubmissions(date, { silent: true });
      setTimeout(() => setImportSuccess(""), 3000);
    } catch (err) {
      console.error(err);
      setImportError(
        "Couldn't save the imported submission to the server. Check your connection and try again."
      );
    } finally {
      setImportSaving(false);
    }
  }

  // ── Sub-views ──────────────────────────────────────────────────────────────

  if (subView === "teacher-form") {
    return (
      <TeacherSubmissionForm
        editingSubmission={editingSubmission}
        onBack={() => {
          setSubView("dashboard");
          setEditingSubmission(null);
          loadRecordMeta(date);
          loadSubmissions(date, { silent: true });
        }}
      />
    );
  }

  if (subView === "view-submission" && viewingSubmission) {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader
          title={`${viewingSubmission.teacherName}'s Class`}
          subtitle={`${viewingSubmission.attendees.length} attended`}
          onBack={() => { setSubView("dashboard"); setViewingSubmission(null); }}
        />
        <main className="flex-1 px-4 pt-5 pb-24 max-w-lg mx-auto w-full">
          <div className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-forest-subtle border-b border-cream-200 flex items-center justify-between">
              <span className="font-bold text-forest-dark text-sm">Attendee List</span>
              <span className="bg-forest text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {viewingSubmission.attendees.length}
              </span>
            </div>
            {viewingSubmission.attendees.map((a, idx) => (
              <div
                key={a.id}
                className={`px-4 py-3 flex items-center justify-between ${
                  idx < viewingSubmission.attendees.length - 1
                    ? "border-b border-cream-200"
                    : ""
                }`}
              >
                <div>
                  <div className="font-semibold text-bark text-sm">{a.name}</div>
                  <div className="text-xs text-bark-muted mt-0.5">
                    {a.phone || "No number"}
                  </div>
                </div>
                <span className="text-xs text-bark-muted bg-cream px-2 py-1 rounded-lg">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-bark-muted text-center mt-4">
            📵 Phone numbers are for secretary reference only and will not appear in WhatsApp messages.
          </p>
        </main>
      </div>
    );
  }

  if (subView === "import-code") {
    return (
      <div className="flex flex-col min-h-full">
        <PageHeader
          title="Import Submission Code"
          subtitle="Optional backup — only needed if sync fails"
          onBack={() => { setSubView("dashboard"); setImportError(""); setImportCode(""); }}
        />
        <main className="flex-1 px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
          <p className="text-sm text-bark-light mb-4">
            Submissions normally sync automatically. Only use this if a teacher
            couldn't connect and sent you a backup code via WhatsApp instead.
          </p>
          <label className="block text-sm font-bold text-bark-light mb-1">
            Paste Submission Code
          </label>
          <textarea
            value={importCode}
            onChange={(e) => { setImportCode(e.target.value); setImportError(""); }}
            rows={6}
            placeholder="Paste the code here..."
            className="w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-bark text-sm font-mono focus:border-forest focus:outline-none bg-white resize-none"
          />
          {importError && (
            <p className="text-sm text-danger mt-2">{importError}</p>
          )}
          <button
            onClick={handleImportCode}
            disabled={!importCode.trim() || importSaving}
            className="mt-4 w-full py-4 bg-forest text-white font-bold text-base rounded-2xl shadow active:scale-95 transition-all disabled:opacity-40"
          >
            {importSaving ? "Saving…" : "Import Submission"}
          </button>
        </main>
      </div>
    );
  }

  // ── Main Secretary Dashboard ───────────────────────────────────────────────

  const missingTeachers = settings.teachers.filter(
    (t) =>
      !submissions.some(
        (s) => s.teacherName.toLowerCase() === t.name.toLowerCase()
      )
  );

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Sunday Attendance" subtitle="Secretary Dashboard" />

      <main className="flex-1 px-4 pt-5 pb-28 max-w-lg mx-auto w-full">

        {/* Date picker */}
        <div className="mb-4">
          <label className="block text-sm font-bold text-bark-light mb-1" htmlFor="sec-date">
            Sunday Date
          </label>
          <input
            id="sec-date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-bark text-base font-semibold focus:border-forest focus:outline-none bg-white"
          />
          {existingRecord && (
            <p className="text-xs text-forest font-semibold mt-1">
              ✓ A saved record exists for this date.
            </p>
          )}
        </div>

        {/* Sync status + manual refresh */}
        <div className="flex items-center justify-between mb-5">
          <p className="text-xs text-bark-muted">
            {submissionsLoading
              ? "Loading submissions…"
              : `Live — ${submissions.length} submission${submissions.length === 1 ? "" : "s"} for this date`}
          </p>
          <button
            onClick={handleManualRefresh}
            disabled={refreshing || submissionsLoading}
            aria-label="Refresh submissions"
            className="flex items-center gap-1 text-xs font-bold text-forest px-2.5 py-1.5 rounded-full border border-forest/30 hover:bg-forest-subtle active:scale-95 transition-all disabled:opacity-40"
          >
            <span className={refreshing ? "inline-block animate-spin" : "inline-block"}>
              🔄
            </span>
            Refresh
          </button>
        </div>

        {submissionsError && (
          <div className="bg-danger-bg border border-red-200 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-bold text-danger">{submissionsError}</p>
          </div>
        )}

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          <button
            onClick={() => {
              setEditingSubmission(null);
              setSubView("teacher-form");
            }}
            className="py-3 bg-forest text-white font-bold text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>✏️</span> Teacher Form
          </button>
          <button
            onClick={() => setSubView("import-code")}
            className="py-3 border-2 border-forest text-forest font-bold text-sm rounded-xl active:scale-95 transition-all flex items-center justify-center gap-1.5"
          >
            <span>📥</span> Import Code
          </button>
        </div>

        {importSuccess && (
          <div className="bg-forest-subtle border border-forest/20 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm text-forest font-bold">✓ {importSuccess}</p>
          </div>
        )}

        {/* Missing teachers warning */}
        {missingTeachers.length > 0 && (
          <div className="bg-warning-bg border border-yellow-300 rounded-xl px-4 py-3 mb-4">
            <p className="text-sm font-bold text-warning">
              ⚠️ Awaiting submissions from:{" "}
              {missingTeachers.map((t) => t.name).join(", ")}
            </p>
          </div>
        )}

        {/* Submissions list */}
        {submissionsLoading && submissions.length === 0 ? (
          <div className="bg-white border border-cream-200 rounded-2xl p-8 text-center mb-4">
            <p className="text-3xl mb-2">⏳</p>
            <p className="text-sm text-bark-muted">Loading submissions…</p>
          </div>
        ) : submissions.length === 0 ? (
          <div className="bg-white border border-cream-200 rounded-2xl p-8 text-center mb-4">
            <p className="text-3xl mb-2">📬</p>
            <p className="text-sm text-bark-muted">
              No submissions yet for {formatDisplayDate(date)}.
            </p>
            <p className="text-xs text-bark-muted mt-1">
              Use the Teacher Form to add attendance, or wait — this updates
              live as teachers submit.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2 mb-4">
            {submissions.map((sub) => (
              <div
                key={sub.id}
                className="bg-white border border-cream-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <button
                  className="w-full text-left px-4 py-4 flex items-center justify-between"
                  onClick={() => {
                    setViewingSubmission(sub);
                    setSubView("view-submission");
                  }}
                >
                  <div>
                    <div className="font-bold text-bark">{sub.teacherName}</div>
                    <div className="text-xs text-bark-muted mt-0.5">
                      Tap to view attendees
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-bold text-forest text-xl">
                        {sub.attendees.length}
                      </div>
                      <div className="text-xs text-bark-muted">present</div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
                      <path d="M6 4l4 4-4 4" stroke="#7A9882" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </button>
                <div className="flex border-t border-cream-200">
                  <button
                    onClick={() => {
                      setEditingSubmission(sub);
                      setSubView("teacher-form");
                    }}
                    className="flex-1 py-2.5 text-xs font-bold text-forest-dark border-r border-cream-200"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(sub.id)}
                    className="flex-1 py-2.5 text-xs font-bold text-danger"
                  >
                    🗑 Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Totals panel */}
        {submissions.length > 0 && (
          <div className="bg-forest-subtle border border-forest/20 rounded-2xl p-4 mb-4">
            <h2 className="font-bold text-forest-dark text-sm mb-3">
              Attendance Summary
            </h2>
            {submissions.map((sub) => (
              <div key={sub.id} className="flex justify-between text-sm text-bark-light mb-1">
                <span>{sub.teacherName}</span>
                <span className="font-bold">{sub.attendees.length}</span>
              </div>
            ))}
            <div className="border-t border-forest/20 mt-3 pt-3 flex justify-between">
              <span className="font-bold text-bark">Total Attendance</span>
              <span className="font-bold text-forest-dark text-2xl">{grandTotal}</span>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="mb-2">
          <label className="block text-sm font-bold text-bark-light mb-1" htmlFor="sec-notes">
            Notes (optional)
          </label>
          <textarea
            id="sec-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Any additional notes..."
            className="w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-bark text-sm focus:border-forest focus:outline-none bg-white resize-none"
          />
        </div>

        {/* Message preview */}
        {submissions.length > 0 && (
          <MessagePreview message={message} />
        )}

        {/* Save button */}
        <div className="mt-4">
          <button
            onClick={handleSave}
            disabled={submissions.length === 0}
            className="w-full py-4 bg-forest-dark text-white font-bold text-base rounded-2xl shadow active:scale-95 transition-all disabled:opacity-40"
          >
            {saved ? "✓ Saved!" : "💾 Save Record"}
          </button>
          {submissions.length === 0 && (
            <p className="text-xs text-bark-muted text-center mt-1">
              Add at least one teacher submission to save.
            </p>
          )}
        </div>
      </main>

      {deleteTarget && (
        <ConfirmDialog
          message="Remove this teacher submission? This will delete their attendee list for this date."
          confirmLabel="Remove"
          danger
          onConfirm={handleDeleteSubmission}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
