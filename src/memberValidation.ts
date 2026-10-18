import type { MembershipStatus, NewMemberForm } from "./types";

export const MEMBERSHIP_STATUSES: { value: MembershipStatus; label: string }[] = [
  { value: "STAYING", label: "Staying" },
  { value: "VISITING", label: "Visiting" },
];

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Days in a month. With no year, February allows the 29th. */
export function daysInMonth(month: number, year: number | null): number {
  if (month === 2) return year === null || isLeapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export type MemberFormErrors = Partial<Record<keyof NewMemberForm, string>>;

export interface CleanMember {
  fullName: string;
  birthDay: number;
  birthMonth: number;
  birthYear: number | null;
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

  // Date of birth: day and month are required, the year is optional.
  const day = parseInt(form.birthDay, 10);
  const month = parseInt(form.birthMonth, 10);
  const yearRaw = form.birthYear.trim();
  let year: number | null = null;

  if (!(day >= 1 && day <= 31) || !(month >= 1 && month <= 12)) {
    const msg = "Please select the day and month you were born. (The year is optional.)";
    if (!(day >= 1 && day <= 31)) errors.birthDay = msg;
    if (!(month >= 1 && month <= 12)) errors.birthMonth = msg;
  }
  if (yearRaw) {
    if (!/^\d{4}$/.test(yearRaw)) {
      errors.birthYear = "Enter a 4-digit year (for example 2004), or leave it blank.";
    } else {
      year = Number(yearRaw);
    }
  }
  if (!errors.birthDay && !errors.birthMonth) {
    if (day > daysInMonth(month, year)) {
      errors.birthDay =
        year === null
          ? "That day doesn't exist in the month you chose."
          : "That date doesn't exist. Please check the day, month and year.";
    } else if (year !== null) {
      const iso = `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      if (year < 1900) errors.birthYear = "Please check the year — that looks too old.";
      else if (iso > localTodayISO(now)) errors.birthYear = "Date of birth can't be in the future.";
    }
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
      birthDay: day,
      birthMonth: month,
      birthYear: year,
      phone,
      email,
      hallHostel,
      homeLocation,
      membershipStatus: form.membershipStatus as MembershipStatus,
    },
  };
}
