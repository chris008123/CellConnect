import type {
  AppSettings,
  SundayRecord,
  SaturdayRecord,
  TeacherSubmission,
} from "./types";
import { formatDisplayDate } from "./storage";

// ── Sunday message builder ────────────────────────────────────────────────────

export function buildSundayMessage(
  record: SundayRecord,
  settings: AppSettings
): string {
  const attendeeLines = (record.submissions ?? [])
    .flatMap((submission) => submission.attendees)
    .map((attendee) => `${attendee.name} = ${attendee.phone ?? ""}`)
    .join("\n");

  return attendeeLines;
}

// ── Saturday message builder ──────────────────────────────────────────────────

export function buildSaturdayMessage(
  record: SaturdayRecord,
  settings: AppSettings
): string {
  return settings.saturdayTemplate
    .replace("{date}", formatDisplayDate(record.date))
    .replace("{time}", record.time || "—")
    .replace("{venue}", record.venue || "—")
    .replace("{attendance}", record.attendance || "—")
    .replace("{offering}", record.offering ? `GH₵ ${record.offering}` : "—")
    .replace("{topic}", record.topic || "—");
}

// ── Submission totals ─────────────────────────────────────────────────────────

export function calcSubmissionTotals(submissions: TeacherSubmission[]): {
  bsTotal: number;
  grandTotal: number;
} {
  const bsTotal = submissions.reduce((sum, s) => sum + s.attendees.length, 0);
  return { bsTotal, grandTotal: bsTotal };
}

// ── Legacy totals (kept for any backward-compat callers) ──────────────────────

export function calcSundayTotals(
  attendances: Record<string, string>,
  teacherIds: string[],
  cellAttendance: string
): { bsTotal: number; cellVal: number | null; grandTotal: number } {
  const bsTotal = teacherIds.reduce((sum, id) => {
    const v = parseInt(attendances[id] ?? "", 10);
    return sum + (isNaN(v) ? 0 : v);
  }, 0);
  const cell = parseInt(cellAttendance, 10);
  const cellVal = isNaN(cell) ? null : cell;
  const grandTotal = bsTotal + (cellVal ?? 0);
  return { bsTotal, cellVal, grandTotal };
}

// ── Submission share codes ────────────────────────────────────────────────────

export function encodeSubmission(sub: TeacherSubmission): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(sub)));
  } catch {
    return "";
  }
}

export function decodeSubmission(code: string): TeacherSubmission | null {
  try {
    const trimmed = code.trim().replace(/\s/g, "");
    return JSON.parse(decodeURIComponent(atob(trimmed))) as TeacherSubmission;
  } catch {
    return null;
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateWholeNumber(val: string): boolean {
  if (val === "") return true;
  return /^\d+$/.test(val) && parseInt(val, 10) >= 0;
}

export function validateOffering(val: string): boolean {
  if (val === "") return true;
  return /^\d+(\.\d{0,2})?$/.test(val);
}

export function normalizeTeacherName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  }
}