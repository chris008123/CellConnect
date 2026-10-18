import type { MembershipStatus, NewMemberForm } from "./types";

export const MEMBERSHIP_STATUSES: { value: MembershipStatus; label: string }[] = [
  { value: "STAYING", label: "Staying" },
  { value: "VISITING", label: "Visiting" },
];

export type MemberFormErrors = Partial<Record<keyof NewMemberForm, string>>;

export interface CleanMember {
  fullName: string;
  dateOfBirth: string;
  phone: string;
  email: string | null;
  hallHostel: string;
  homeLocation: string;
  membershipStatus: MembershipStatus;
}

/** Collapse internal whitespace and trim. */
export function cleanText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/**
 * Normalizes a phone number to E.164 where it can do so without guessing.
 *  - "+233 24 123 4567", "00233241234567"  -> "+233241234567"
 *  - "024 123 4567" (10 digits, leading 0)  -> "+233241234567" (Ghana local format)
 *  - "233241234567"                         -> "+233241234567"
 * Returns null when the number can't be interpreted safely, so no digits or
 * country codes are ever silently dropped.
 */
export function normalizePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Only digits and common separators (+ only as the first character)
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, "");
  const hadPlus = trimmed.startsWith("+");

  if (hadPlus) {
    // already international
  } else if (digits.startsWith("00")) {
    digits = digits.slice(2);
  } else if (digits.startsWith("0")) {
    // Ghana local format: 0 + 9 digits
    if (digits.length !== 10) return null;
    digits = "233" + digits.slice(1);
  } else if (digits.startsWith("233")) {
    // Ghana number written with country code but no +
  } else {
    // Other digits-only input: we can't tell the country, so ask for it
    return null;
  }

  const e164 = `+${digits}`;
  return /^\+[1-9]\d{7,14}$/.test(e164) ? e164 : null;
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export function localTodayISO(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function isRealISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d
  );
}

export function validateMemberForm(
  form: NewMemberForm,
  now: Date = new Date()
): { errors: MemberFormErrors; clean: CleanMember | null } {
  const errors: MemberFormErrors = {};

  const fullName = cleanText(form.fullName);
  if (!fullName) errors.fullName = "Please enter the member's full name.";
  else if (fullName.length > 120) errors.fullName = "Name is too long (max 120 characters).";

  if (!form.dateOfBirth) {
    errors.dateOfBirth = "Please select a date of birth.";
  } else if (!isRealISODate(form.dateOfBirth)) {
    errors.dateOfBirth = "That isn't a valid date.";
  } else if (form.dateOfBirth > localTodayISO(now)) {
    errors.dateOfBirth = "Date of birth can't be in the future.";
  } else if (form.dateOfBirth < "1900-01-01") {
    errors.dateOfBirth = "Please check the year — that date looks too old.";
  }

  const phone = normalizePhone(form.phone);
  if (!form.phone.trim()) {
    errors.phone = "Please enter a phone number.";
  } else if (!phone) {
    errors.phone =
      "Enter a valid number, e.g. 024 123 4567 or +233 24 123 4567. Include the country code for non-Ghana numbers.";
  }

  const emailRaw = form.email.trim();
  const email = emailRaw ? normalizeEmail(emailRaw) : null;
  if (email && !isValidEmail(email)) {
    errors.email = "Enter a valid email address, or leave it blank.";
  }

  const hallHostel = cleanText(form.hallHostel);
  if (!hallHostel) errors.hallHostel = "Please enter the hall, hostel or accommodation name.";
  else if (hallHostel.length > 120) errors.hallHostel = "Too long (max 120 characters).";

  const homeLocation = cleanText(form.homeLocation);
  if (!homeLocation) errors.homeLocation = "Please enter the home town or area.";
  else if (homeLocation.length > 120) errors.homeLocation = "Too long (max 120 characters).";

  if (form.membershipStatus !== "STAYING" && form.membershipStatus !== "VISITING") {
    errors.membershipStatus = "Please choose Staying or Visiting.";
  }

  if (Object.keys(errors).length > 0 || !phone) return { errors, clean: null };

  return {
    errors,
    clean: {
      fullName,
      dateOfBirth: form.dateOfBirth,
      phone,
      email,
      hallHostel,
      homeLocation,
      membershipStatus: form.membershipStatus as MembershipStatus,
    },
  };
}
