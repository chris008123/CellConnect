export interface Teacher {
  id: string;
  name: string;
  phone?: string;
}

export interface Attendee {
  id: string;
  name: string;
  phone: string;
}

export interface TeacherSubmission {
  id: string;
  teacherName: string;
  date: string;
  attendees: Attendee[];
  submittedAt: string;
}

export interface SundayRecord {
  id: string;
  date: string;
  // New submission-based data
  submissions: TeacherSubmission[];
  // Legacy fields kept for backward compatibility
  attendances: Record<string, string>;
  cellAttendance: string;
  notes: string;
  createdAt: string;
}

export interface SaturdayRecord {
  id: string;
  date: string;
  time: string;
  venue: string;
  attendance: string;
  offering: string;
  topic: string;
  createdAt: string;
}

export interface AppSettings {
  cellName: string;
  leaderName: string;
  teachers: Teacher[];
  sundayTemplate: string;
  saturdayTemplate: string;
  defaultTime: string;
  defaultVenue: string;
  excelSheetUrl: string;
}

export type Page =
  | "home"
  | "sunday"
  | "saturday"
  | "history"
  | "settings"
  | "teacher-submit";

export type HistoryTab = "sunday" | "saturday";
