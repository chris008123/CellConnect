import { useState, useEffect } from "react";
import type { SaturdayRecord } from "../types";
import {
  getSettings,
  getSaturdayRecords,
  saveSaturdayRecord,
  generateId,
  todayISO,
} from "../storage";
import { buildSaturdayMessage, validateWholeNumber, validateOffering } from "../utils";
import PageHeader from "../components/PageHeader";
import MessagePreview from "../components/MessagePreview";
import ConfirmDialog from "../components/ConfirmDialog";

interface Props {
  editRecord?: SaturdayRecord;
  onSaved?: () => void;
}

function blank(overrides?: Partial<SaturdayRecord>): SaturdayRecord {
  const settings = getSettings();
  const latestSunday = (() => {
    try {
      const s = JSON.parse(localStorage.getItem("csa_sunday_records") ?? "[]");
      if (Array.isArray(s) && s.length > 0) {
        const bsTotal = Object.values(s[0].attendances as Record<string,string>).reduce(
          (acc: number, v: string) => acc + (parseInt(v, 10) || 0), 0
        );
        const cell = parseInt(s[0].cellAttendance, 10);
        return String(bsTotal + (isNaN(cell) ? 0 : cell));
      }
    } catch { /* empty */ }
    return "";
  })();
  return {
    id: generateId(),
    date: todayISO(),
    time: settings.defaultTime,
    venue: settings.defaultVenue,
    attendance: latestSunday,
    offering: "",
    topic: "",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export default function SaturdayReport({ editRecord, onSaved }: Props) {
  const settings = getSettings();
  const [form, setForm] = useState<SaturdayRecord>(() =>
    editRecord ? { ...editRecord } : blank()
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showClear, setShowClear] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (editRecord) setForm({ ...editRecord });
  }, [editRecord?.id]);

  const message = buildSaturdayMessage(form, settings);

  function set(field: keyof SaturdayRecord, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: "" }));
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.date) e.date = "Date is required.";
    if (!validateWholeNumber(form.attendance)) e.attendance = "Must be a whole number.";
    if (!validateOffering(form.offering)) e.offering = "Up to 2 decimal places.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleSave() {
    if (!validate()) return;
    saveSaturdayRecord({ ...form, createdAt: form.createdAt || new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  }

  function handleClear() {
    setForm(blank());
    setErrors({});
    setShowClear(false);
  }

  const inputCls =
    "w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-bark text-base font-semibold focus:border-forest focus:outline-none transition-colors bg-white";
  const labelCls = "block text-sm font-bold text-bark-light mb-1";
  const errorCls = "text-xs text-danger mt-1";

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Saturday Cell Report" subtitle={editRecord ? "Editing record" : undefined} />

      <main className="flex-1 px-4 pt-5 pb-28 max-w-lg mx-auto w-full">
        <div className="flex flex-col gap-4">
          {/* Date */}
          <div>
            <label className={labelCls} htmlFor="sat-date">Date</label>
            <input
              id="sat-date"
              type="date"
              value={form.date}
              onChange={(e) => set("date", e.target.value)}
              className={inputCls}
            />
            {errors.date && <p className={errorCls}>{errors.date}</p>}
          </div>

          {/* Time */}
          <div>
            <label className={labelCls} htmlFor="sat-time">Time</label>
            <input
              id="sat-time"
              type="text"
              value={form.time}
              onChange={(e) => set("time", e.target.value)}
              placeholder="e.g. 4:30 PM"
              className={inputCls}
            />
          </div>

          {/* Venue */}
          <div>
            <label className={labelCls} htmlFor="sat-venue">Venue</label>
            <input
              id="sat-venue"
              type="text"
              value={form.venue}
              onChange={(e) => set("venue", e.target.value)}
              className={inputCls}
            />
          </div>

          {/* Attendance */}
          <div>
            <label className={labelCls} htmlFor="sat-att">Attendance</label>
            <input
              id="sat-att"
              type="number"
              inputMode="numeric"
              min="0"
              value={form.attendance}
              onChange={(e) => set("attendance", e.target.value)}
              placeholder="Number of people"
              className={inputCls}
            />
            {form.attendance === "" && (
              <p className="text-xs text-bark-muted mt-1">
                Auto-filled from latest Sunday total if available.
              </p>
            )}
            {errors.attendance && <p className={errorCls}>{errors.attendance}</p>}
          </div>

          {/* Offering */}
          <div>
            <label className={labelCls} htmlFor="sat-offering">Offering (GH₵)</label>
            <input
              id="sat-offering"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={form.offering}
              onChange={(e) => set("offering", e.target.value)}
              placeholder="0.00"
              className={inputCls}
            />
            {errors.offering && <p className={errorCls}>{errors.offering}</p>}
          </div>

          {/* Topic */}
          <div>
            <label className={labelCls} htmlFor="sat-topic">Topic / Message Title</label>
            <input
              id="sat-topic"
              type="text"
              value={form.topic}
              onChange={(e) => set("topic", e.target.value)}
              placeholder="e.g. Walking in Faith"
              className={inputCls}
            />
          </div>
        </div>

        {/* Message preview */}
        <MessagePreview message={message} />

        {/* Action buttons */}
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={handleSave}
            className="w-full py-4 bg-forest-dark text-white font-bold text-base rounded-xl shadow active:scale-95 transition-all"
          >
            {saved ? "✓ Saved!" : "💾 Save Report"}
          </button>
          <button
            onClick={() => setShowClear(true)}
            className="w-full py-3 border-2 border-cream-200 text-bark-muted font-bold text-sm rounded-xl active:bg-cream transition-colors"
          >
            Clear Form
          </button>
        </div>
      </main>

      {showClear && (
        <ConfirmDialog
          message="Clear all form fields and start fresh?"
          confirmLabel="Clear"
          danger
          onConfirm={handleClear}
          onCancel={() => setShowClear(false)}
        />
      )}
    </div>
  );
}
