import { useRef, useState } from "react";
import type { ReactNode } from "react";
import type { NewMemberForm } from "../types";
import { formatDisplayDate } from "../storage";
import { newRequestId, registerMemberRemote } from "../remoteMembers";
import {
  MEMBERSHIP_STATUSES,
  localTodayISO,
  validateMemberForm,
  type CleanMember,
  type MemberFormErrors,
} from "../memberValidation";
import PageHeader from "../components/PageHeader";
import StatusBanner from "../components/StatusBanner";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_FORM: NewMemberForm = {
  fullName: "",
  dateOfBirth: "",
  phone: "",
  email: "",
  hallHostel: "",
  homeLocation: "",
  membershipStatus: "",
};

const sectionCls = "mb-5 bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden";
const sectionHeaderCls =
  "px-4 py-3 bg-forest-subtle border-b border-cream-200 font-bold text-forest-dark text-sm";
const rowCls = "px-4 py-3 border-b border-cream-200 last:border-0";
const labelCls = "block text-sm font-bold text-bark-light mb-1";
const inputBase =
  "w-full border-2 rounded-xl px-4 py-3 text-bark text-base font-semibold focus:outline-none bg-white";

function inputCls(hasError: boolean) {
  return `${inputBase} ${hasError ? "border-danger focus:border-danger" : "border-cream-200 focus:border-forest"}`;
}

function Field({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className={rowCls}>
      <label className={labelCls} htmlFor={id}>
        {label}
        {required ? (
          <span className="text-danger" aria-hidden>
            {" "}
            *
          </span>
        ) : (
          <span className="text-bark-muted font-semibold"> (optional)</span>
        )}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-bark-muted mt-1">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs text-danger font-semibold mt-1">
          {error}
        </p>
      )}
    </div>
  );
}

interface Props {
  /** True on the shared "?register" link that new members fill in themselves. */
  publicMode?: boolean;
}

export default function RegisterMember({ publicMode = false }: Props) {
  // ── Form ────────────────────────────────────────────────────────────────────
  const [form, setForm] = useState<NewMemberForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<MemberFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [successName, setSuccessName] = useState("");
  const [duplicate, setDuplicate] = useState<CleanMember | null>(null);
  const [showClear, setShowClear] = useState(false);

  // One id per form "attempt": a retry or double tap of the same registration
  // is recognised by the server and can't create a second record.
  const requestId = useRef(newRequestId());
  const inFlight = useRef(false);

  function setField<K extends keyof NewMemberForm>(key: K, value: NewMemberForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
    setSubmitError("");
    setSuccessName("");
    if (duplicate) {
      setDuplicate(null);
      // The details changed, so this is a different registration attempt.
      requestId.current = newRequestId();
    }
  }

  const isDirty = Object.values(form).some((v) => v !== "");

  function resetForm() {
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError("");
    setDuplicate(null);
    requestId.current = newRequestId();
  }

  async function submit(allowDuplicate: boolean) {
    if (inFlight.current) return;

    const { errors: found, clean } = validateMemberForm(form);
    setErrors(found);
    setSuccessName("");
    if (!clean) {
      setSubmitError("");
      const first = Object.keys(found)[0];
      if (first) document.getElementById(`member-${first}`)?.focus();
      return;
    }

    inFlight.current = true;
    setSaving(true);
    setSubmitError("");
    try {
      const result = await registerMemberRemote(requestId.current, clean, allowDuplicate);
      switch (result.status) {
        case "created":
          setSuccessName(clean.fullName);
          resetForm();
          window.scrollTo(0, 0);
          break;
        case "duplicate":
          setDuplicate(clean);
          break;
        case "invalid":
          if (result.field) setErrors({ [result.field]: result.message });
          else setSubmitError(result.message);
          break;
      }
    } catch (err) {
      console.error(err);
      setSubmitError(
        "Couldn't save your details. Check your connection and try again — what you typed is still here."
      );
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit(false);
  }

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader
        title="New Cell Member"
        subtitle={publicMode ? "Welcome!" : undefined}
      />

      <main className="flex-1 px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        <p className="text-sm text-bark-light mb-4">
          {publicMode
            ? "Welcome! Please fill in your details below."
            : "Register a new member of your church cell by completing the form below."}
        </p>

        {successName && (
          <StatusBanner
            variant="success"
            message={
              publicMode
                ? `✓ Thank you, ${successName}! You're registered.`
                : `✓ ${successName} has been registered.`
            }
            className="mb-4"
          />
        )}

        {submitError && (
          <StatusBanner variant="error" message={submitError} className="mb-4" />
        )}

        {duplicate && (
          <StatusBanner
            variant="warning"
            message="A member with this phone number is already registered."
            className="mb-4"
          >
            <p className="text-xs mb-3">
              {publicMode
                ? "If this is you, you're already registered. If someone else shares this number, you can register anyway."
                : `This could be the same person. Nothing has been changed or overwritten. Check the number, or register ${duplicate.fullName} anyway if this is a different person.`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDuplicate(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-cream-200 bg-white text-bark font-bold text-sm"
              >
                Edit details
              </button>
              <button
                type="button"
                onClick={() => submit(true)}
                disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-forest text-white font-bold text-sm disabled:opacity-60"
              >
                Register anyway
              </button>
            </div>
          </StatusBanner>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* 1. Personal information */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>Personal Information</div>
            <Field id="member-fullName" label="Full Name" required error={errors.fullName}>
              <input
                id="member-fullName"
                type="text"
                autoComplete="off"
                value={form.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
                aria-invalid={!!errors.fullName}
                aria-describedby={errors.fullName ? "member-fullName-error" : undefined}
                placeholder="Enter full name"
                className={inputCls(!!errors.fullName)}
              />
            </Field>
            <Field
              id="member-dateOfBirth"
              label="Date of Birth"
              required
              error={errors.dateOfBirth}
              hint={form.dateOfBirth ? formatDisplayDate(form.dateOfBirth) : undefined}
            >
              <input
                id="member-dateOfBirth"
                type="date"
                max={localTodayISO()}
                value={form.dateOfBirth}
                onChange={(e) => setField("dateOfBirth", e.target.value)}
                aria-invalid={!!errors.dateOfBirth}
                aria-describedby={errors.dateOfBirth ? "member-dateOfBirth-error" : undefined}
                className={inputCls(!!errors.dateOfBirth)}
              />
            </Field>
          </section>

          {/* 2. Contact and location */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>Contact and Location</div>
            <Field
              id="member-phone"
              label="Phone Number"
              required
              error={errors.phone}
              hint="e.g. 024 123 4567 or +233 24 123 4567"
            >
              <input
                id="member-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                value={form.phone}
                onChange={(e) => setField("phone", e.target.value)}
                aria-invalid={!!errors.phone}
                aria-describedby={errors.phone ? "member-phone-error" : undefined}
                placeholder="Enter phone number"
                className={inputCls(!!errors.phone)}
              />
            </Field>
            <Field id="member-email" label="Email Address" error={errors.email}>
              <input
                id="member-email"
                type="email"
                inputMode="email"
                autoComplete="off"
                autoCapitalize="none"
                value={form.email}
                onChange={(e) => setField("email", e.target.value)}
                aria-invalid={!!errors.email}
                aria-describedby={errors.email ? "member-email-error" : undefined}
                placeholder="name@example.com"
                className={inputCls(!!errors.email)}
              />
            </Field>
            <Field id="member-hallHostel" label="Hall / Hostel" required error={errors.hallHostel}>
              <input
                id="member-hallHostel"
                type="text"
                autoComplete="off"
                value={form.hallHostel}
                onChange={(e) => setField("hallHostel", e.target.value)}
                aria-invalid={!!errors.hallHostel}
                aria-describedby={errors.hallHostel ? "member-hallHostel-error" : undefined}
                placeholder="Enter hall, hostel, or accommodation name"
                className={inputCls(!!errors.hallHostel)}
              />
            </Field>
            <Field
              id="member-homeLocation"
              label="Home Location"
              required
              error={errors.homeLocation}
            >
              <input
                id="member-homeLocation"
                type="text"
                autoComplete="off"
                value={form.homeLocation}
                onChange={(e) => setField("homeLocation", e.target.value)}
                aria-invalid={!!errors.homeLocation}
                aria-describedby={errors.homeLocation ? "member-homeLocation-error" : undefined}
                placeholder="Enter town, area, or residential location"
                className={inputCls(!!errors.homeLocation)}
              />
            </Field>
          </section>

          {/* 3. Membership details */}
          <section className={sectionCls}>
            <div className={sectionHeaderCls}>Membership Details</div>
            <div className={rowCls}>
              <fieldset
                aria-describedby={errors.membershipStatus ? "member-membershipStatus-error" : undefined}
              >
                <legend className={labelCls}>
                  Membership Status
                  <span className="text-danger" aria-hidden>
                    {" "}
                    *
                  </span>
                </legend>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" id="member-membershipStatus">
                  {MEMBERSHIP_STATUSES.map((opt) => {
                    const selected = form.membershipStatus === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex items-center justify-center py-3 rounded-xl border-2 text-sm font-bold cursor-pointer transition-all focus-within:outline-2 focus-within:outline-forest ${
                          selected
                            ? "bg-forest text-white border-forest"
                            : errors.membershipStatus
                              ? "bg-white text-bark-light border-danger"
                              : "bg-white text-bark-light border-cream-200 hover:bg-cream-100"
                        }`}
                      >
                        <input
                          type="radio"
                          name="membershipStatus"
                          value={opt.value}
                          checked={selected}
                          onChange={() => setField("membershipStatus", opt.value)}
                          className="sr-only"
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
                {errors.membershipStatus && (
                  <p
                    id="member-membershipStatus-error"
                    role="alert"
                    className="text-xs text-danger font-semibold mt-1"
                  >
                    {errors.membershipStatus}
                  </p>
                )}
              </fieldset>
            </div>
          </section>

          <button
            type="submit"
            disabled={saving}
            aria-busy={saving}
            className="w-full py-4 bg-forest text-white font-bold text-base rounded-2xl shadow-md active:scale-95 transition-all disabled:opacity-60 mb-3"
          >
            {saving ? "Registering…" : publicMode ? "Submit" : "Register Member"}
          </button>
          <button
            type="button"
            onClick={() => (isDirty ? setShowClear(true) : resetForm())}
            disabled={saving}
            className="w-full py-3 bg-white border-2 border-forest text-forest font-bold text-sm rounded-2xl active:scale-95 transition-all disabled:opacity-40 mb-4"
          >
            Clear Form
          </button>
        </form>
      </main>

      {showClear && (
        <ConfirmDialog
          message="Clear everything you've entered?"
          confirmLabel="Clear Form"
          danger
          onConfirm={() => {
            resetForm();
            setShowClear(false);
          }}
          onCancel={() => setShowClear(false)}
        />
      )}
    </div>
  );
}
