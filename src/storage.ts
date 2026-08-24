import type {
  AppSettings,
  SundayRecord,
  SaturdayRecord,
  Teacher,
  TeacherSubmission,
} from "./types";

const DEFAULT_TEACHERS: Teacher[] = [
  { id: "samuel", name: "Sir Dadzie" },
  { id: "asantewaa", name: "Blessing" },
  { id: "chris", name: "Chris" }
];

export const DEFAULT_SUNDAY_TEMPLATE = `SUNDAY ATTENDANCE
Date: {date}

{teacher_lines}

Bible Study Total: {bible_study_total}
My Cell Attendance: {cell_attendance}
Total Attendance: {grand_total}

Notes: {notes}`;

export const DEFAULT_SATURDAY_TEMPLATE = `Time: {time}
Venue: {venue}
Attendance: {attendance}
Offering: {offering}
Topic: {topic}`;

const DEFAULT_SETTINGS: AppSettings = {
  cellName: "YASHAR CELL",
  leaderName: "Sir Dadzie",
  teachers: DEFAULT_TEACHERS,
  sundayTemplate: DEFAULT_SUNDAY_TEMPLATE,
  saturdayTemplate: DEFAULT_SATURDAY_TEMPLATE,
  defaultTime: "4:30",
  defaultVenue: "Jubilee Mall",
};

const KEYS = {
  settings: "csa_settings",
  sunday: "csa_sunday_records",
  saturday: "csa_saturday_records",
  submissions: "csa_teacher_submissions",
};

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Settings ──────────────────────────────────────────────────────────────────

export function getSettings(): AppSettings {
  const stored = get<Partial<AppSettings>>(KEYS.settings, {});
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function saveSettings(s: AppSettings): void {
  set(KEYS.settings, s);
}

// ── Teacher submissions (device-local pending submissions) ────────────────────

export function getTeacherSubmissions(): TeacherSubmission[] {
  return get<TeacherSubmission[]>(KEYS.submissions, []);
}

export function getTeacherSubmissionsForDate(date: string): TeacherSubmission[] {
  return getTeacherSubmissions().filter((s) => s.date === date);
}

export function saveTeacherSubmission(sub: TeacherSubmission): void {
  const all = getTeacherSubmissions();
  const idx = all.findIndex((s) => s.id === sub.id);
  if (idx >= 0) {
    all[idx] = sub;
  } else {
    all.push(sub);
  }
  set(KEYS.submissions, all);
}

export function deleteTeacherSubmission(id: string): void {
  set(
    KEYS.submissions,
    getTeacherSubmissions().filter((s) => s.id !== id)
  );
}

// ── Sunday records ────────────────────────────────────────────────────────────

export function getSundayRecords(): SundayRecord[] {
  return get<SundayRecord[]>(KEYS.sunday, []);
}

export function saveSundayRecord(record: SundayRecord): void {
  const records = getSundayRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  set(KEYS.sunday, records);
}

export function deleteSundayRecord(id: string): void {
  set(
    KEYS.sunday,
    getSundayRecords().filter((r) => r.id !== id)
  );
}

// ── Saturday records ──────────────────────────────────────────────────────────

export function getSaturdayRecords(): SaturdayRecord[] {
  return get<SaturdayRecord[]>(KEYS.saturday, []);
}

export function saveSaturdayRecord(record: SaturdayRecord): void {
  const records = getSaturdayRecords();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) {
    records[idx] = record;
  } else {
    records.unshift(record);
  }
  set(KEYS.saturday, records);
}

export function deleteSaturdayRecord(id: string): void {
  set(
    KEYS.saturday,
    getSaturdayRecords().filter((r) => r.id !== id)
  );
}

// ── Backup / restore ──────────────────────────────────────────────────────────

export function exportAllData(): string {
  return JSON.stringify(
    {
      settings: getSettings(),
      sunday: getSundayRecords(),
      saturday: getSaturdayRecords(),
      submissions: getTeacherSubmissions(),
      exportedAt: new Date().toISOString(),
    },
    null,
    2
  );
}

export function importAllData(json: string): void {
  const data = JSON.parse(json);
  if (data.settings) set(KEYS.settings, data.settings);
  if (data.sunday) set(KEYS.sunday, data.sunday);
  if (data.saturday) set(KEYS.saturday, data.saturday);
  if (data.submissions) set(KEYS.submissions, data.submissions);
}

export function resetAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}

// ── Utilities ─────────────────────────────────────────────────────────────────

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDisplayDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  const months = [
    "Jan","Feb","Mar","Apr","May","Jun",
    "Jul","Aug","Sep","Oct","Nov","Dec",
  ];
  return `${d} ${months[parseInt(m) - 1]} ${y}`;
}

// ── Seed sample data ──────────────────────────────────────────────────────────

export function seedSampleDataIfNeeded(): void {
  const sunday = getSundayRecords();
  const saturday = getSaturdayRecords();
  if (sunday.length > 0 || saturday.length > 0) return;

  const sampleSubmissions: TeacherSubmission[] = [
    {
      id: generateId(),
      teacherName: "Theo",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Kofi Mensah", phone: "024****001" },
        { id: generateId(), name: "Ama Asante", phone: "020****002" },
        { id: generateId(), name: "Kweku Boateng", phone: "054****003" },
        { id: generateId(), name: "Abena Osei", phone: "027****004" },
        { id: generateId(), name: "Yaw Darko", phone: "026****005" },
      ],
      submittedAt: new Date("2026-08-17T10:15:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Nana",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Efua Amponsah", phone: "023****010" },
        { id: generateId(), name: "Kojo Frimpong", phone: "050****011" },
        { id: generateId(), name: "Adwoa Tetteh", phone: "055****012" },
        { id: generateId(), name: "Kwame Acheampong", phone: "024****013" },
      ],
      submittedAt: new Date("2026-08-17T10:28:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Emmanuella",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Esi Quaye", phone: "020****020" },
        { id: generateId(), name: "Nana Akua Boadu", phone: "027****021" },
        { id: generateId(), name: "Fiifi Mensah", phone: "024****022" },
        { id: generateId(), name: "Akosua Yeboah", phone: "026****023" },
        { id: generateId(), name: "Kwabena Asante", phone: "054****024" },
        { id: generateId(), name: "Afia Nyarko", phone: "050****025" },
      ],
      submittedAt: new Date("2026-08-17T10:45:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Angel",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Maame Serwaa", phone: "023****030" },
        { id: generateId(), name: "Kwesi Owusu", phone: "024****031" },
        { id: generateId(), name: "Adwoa Poku", phone: "020****032" },
        { id: generateId(), name: "Kofi Ntim", phone: "054****033" },
      ],
      submittedAt: new Date("2026-08-17T11:02:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Foster",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Akua Sarfo", phone: "027****040" },
        { id: generateId(), name: "Yaw Asante", phone: "026****041" },
        { id: generateId(), name: "Ama Adusei", phone: "020****042" },
        { id: generateId(), name: "Kofi Boakye", phone: "024****043" },
        { id: generateId(), name: "Abena Afriyie", phone: "050****044" },
        { id: generateId(), name: "Kweku Antwi", phone: "023****045" },
      ],
      submittedAt: new Date("2026-08-17T11:20:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Kekeli",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Dodzi Agbenyo", phone: "027****050" },
        { id: generateId(), name: "Selorm Adzaho", phone: "024****051" },
        { id: generateId(), name: "Eyram Bansah", phone: "020****052" },
        { id: generateId(), name: "Afi Dzagbletey", phone: "026****053" },
        { id: generateId(), name: "Mawuli Gah", phone: "054****054" },
      ],
      submittedAt: new Date("2026-08-17T11:35:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Jeffery",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Samuel Osei", phone: "023****060" },
        { id: generateId(), name: "Grace Agyemang", phone: "020****061" },
        { id: generateId(), name: "Daniel Kwofie", phone: "024****062" },
        { id: generateId(), name: "Priscilla Tawiah", phone: "050****063" },
        { id: generateId(), name: "Emmanuel Adu", phone: "027****064" },
        { id: generateId(), name: "Rebecca Asante", phone: "026****065" },
      ],
      submittedAt: new Date("2026-08-17T11:50:00").toISOString(),
    },
    {
      id: generateId(),
      teacherName: "Saviour",
      date: "2026-08-17",
      attendees: [
        { id: generateId(), name: "Victor Agbenyega", phone: "024****070" },
        { id: generateId(), name: "Christiana Amegah", phone: "020****071" },
        { id: generateId(), name: "Francis Ametefe", phone: "027****072" },
        { id: generateId(), name: "Joana Tsatsu", phone: "023****073" },
        { id: generateId(), name: "Albert Gbedze", phone: "054****074" },
      ],
      submittedAt: new Date("2026-08-17T12:05:00").toISOString(),
    },
  ];

  const bsTotal = sampleSubmissions.reduce(
    (sum, s) => sum + s.attendees.length,
    0
  );

  const sampleSunday: SundayRecord = {
    id: generateId(),
    date: "2026-08-17",
    submissions: sampleSubmissions,
    attendances: {},
    cellAttendance: String(bsTotal),
    notes: "Good turnout. Several visitors attended.",
    createdAt: new Date("2026-08-17T12:30:00").toISOString(),
  };

  const sampleSaturday: SaturdayRecord = {
    id: generateId(),
    date: "2026-08-16",
    time: "4:30",
    venue: "Jubilee Mall",
    attendance: String(bsTotal),
    offering: "45.00",
    topic: "Walking in Faith",
    createdAt: new Date("2026-08-16T18:00:00").toISOString(),
  };

  saveSundayRecord(sampleSunday);
  saveSaturdayRecord(sampleSaturday);
}
