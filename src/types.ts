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
}

export type Page =
  | "home"
  | "sunday"
  | "saturday"
  | "history"
  | "settings"
  | "register"
  | "teacher-submit";

export type MembershipStatus = "STAYING" | "VISITING";

/** Raw form state for the New Cell Member page (everything is a string until validated). */
export interface NewMemberForm {
  fullName: string;
  birthDay: string;   // "1"-"31" (required)
  birthMonth: string; // "1"-"12" (required)
  birthYear: string;  // 4 digits, optional
  phone: string;
  email: string;
  hallHostel: string;
  homeLocation: string;
  membershipStatus: MembershipStatus | "";
}

export type HistoryTab = "sunday" | "saturday";
