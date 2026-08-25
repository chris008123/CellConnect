import { useState, useRef } from "react";
import type { AppSettings, Teacher } from "../types";
import {
  getSettings,
  saveSettings,
  exportAllData,
  importAllData,
  resetAllData,
  generateId,
  DEFAULT_SATURDAY_TEMPLATE,
} from "../storage";
import PageHeader from "../components/PageHeader";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [saved, setSaved] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [importError, setImportError] = useState("");
  const [importSuccess, setImportSuccess] = useState(false);
  const [newTeacher, setNewTeacher] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function update(patch: Partial<AppSettings>) {
    setSettings((s) => ({ ...s, ...patch }));
  }

  function handleSave() {
    saveSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function addTeacher() {
    const name = newTeacher.trim();
    if (!name) return;
    const teacher: Teacher = { id: generateId(), name };
    update({ teachers: [...settings.teachers, teacher] });
    setNewTeacher("");
  }

  function renameTeacher(id: string, name: string) {
    update({
      teachers: settings.teachers.map((t) =>
        t.id === id ? { ...t, name } : t
      ),
    });
  }

  function removeTeacher(id: string) {
    update({ teachers: settings.teachers.filter((t) => t.id !== id) });
  }

  function updateTeacherPhone(id: string, phone: string) {
    update({
      teachers: settings.teachers.map((t) =>
        t.id === id ? { ...t, phone } : t
      ),
    });
  }

  function handleExport() {
    const data = exportAllData();
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `church-secretary-backup-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        importAllData(ev.target?.result as string);
        setSettings(getSettings());
        setImportSuccess(true);
        setImportError("");
        setTimeout(() => setImportSuccess(false), 2500);
      } catch {
        setImportError("Invalid backup file. Please check the file and try again.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleReset() {
    resetAllData();
    setSettings(getSettings());
    setShowReset(false);
  }

  function resetTemplates() {
    update({
      saturdayTemplate: DEFAULT_SATURDAY_TEMPLATE,
    });
  }

  const sectionCls = "mb-6 bg-white rounded-2xl border border-cream-200 shadow-sm overflow-hidden";
  const sectionHeaderCls = "px-4 py-3 bg-forest-subtle border-b border-cream-200 font-bold text-forest-dark text-sm";
  const inputCls = "w-full border-2 border-cream-200 rounded-xl px-4 py-3 text-bark text-base font-semibold focus:border-forest focus:outline-none bg-white";
  const labelCls = "block text-sm font-bold text-bark-light mb-1";
  const rowCls = "px-4 py-3 border-b border-cream-200 last:border-0";

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="Settings" />

      <main className="flex-1 px-4 pt-5 pb-28 max-w-lg mx-auto w-full">

        {/* Cell info */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>Cell Information</div>
          <div className={rowCls}>
            <label className={labelCls} htmlFor="cell-name">Cell Name</label>
            <input
              id="cell-name"
              type="text"
              value={settings.cellName}
              onChange={(e) => update({ cellName: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className={rowCls}>
            <label className={labelCls} htmlFor="leader-name">Group Leader Name</label>
            <input
              id="leader-name"
              type="text"
              value={settings.leaderName}
              onChange={(e) => update({ leaderName: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Default values */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>Default Values</div>
          <div className={rowCls}>
            <label className={labelCls} htmlFor="def-time">Default Meeting Time</label>
            <input
              id="def-time"
              type="text"
              value={settings.defaultTime}
              onChange={(e) => update({ defaultTime: e.target.value })}
              className={inputCls}
              placeholder="e.g. 4:30 PM"
            />
          </div>
          <div className={rowCls}>
            <label className={labelCls} htmlFor="def-venue">Default Venue</label>
            <input
              id="def-venue"
              type="text"
              value={settings.defaultVenue}
              onChange={(e) => update({ defaultVenue: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        {/* Teachers */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>Bible Study Teacher Roster</div>
          {settings.teachers.map((teacher) => (
            <div key={teacher.id} className={`${rowCls} flex flex-col gap-2`}>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={teacher.name}
                  onChange={(e) => renameTeacher(teacher.id, e.target.value)}
                  aria-label="Teacher name"
                  className="flex-1 border-2 border-cream-200 rounded-xl px-3 py-2 text-bark text-sm font-semibold focus:border-forest focus:outline-none bg-white"
                />
                <button
                  onClick={() => removeTeacher(teacher.id)}
                  aria-label={`Remove ${teacher.name}`}
                  className="text-danger p-2 rounded-lg hover:bg-danger-bg transition-colors"
                >
                  ✕
                </button>
              </div>
              <input
                type="tel"
                value={teacher.phone ?? ""}
                onChange={(e) => updateTeacherPhone(teacher.id, e.target.value)}
                placeholder="Contact number (optional)"
                aria-label={`${teacher.name} contact number`}
                className="w-full border-2 border-cream-200 rounded-xl px-3 py-2 text-bark-muted text-sm focus:border-forest focus:outline-none bg-white"
              />
            </div>
          ))}
          <div className="px-4 py-3 flex gap-2">
            <input
              type="text"
              value={newTeacher}
              onChange={(e) => setNewTeacher(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addTeacher()}
              placeholder="New teacher name"
              className="flex-1 border-2 border-cream-200 rounded-xl px-3 py-2 text-bark text-sm font-semibold focus:border-forest focus:outline-none bg-white"
            />
            <button
              onClick={addTeacher}
              className="px-4 py-2 bg-forest text-white font-bold text-sm rounded-xl active:scale-95 transition-all"
            >
              Add
            </button>
          </div>
        </div>

        
        {/* Data management */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>Data & Backup</div>
          <div className={rowCls}>
            <button
              onClick={handleExport}
              className="w-full py-3 bg-forest text-white font-bold text-sm rounded-xl active:scale-95 transition-all"
            >
              📦 Export Backup (JSON)
            </button>
          </div>
          <div className={rowCls}>
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full py-3 bg-white border-2 border-forest text-forest font-bold text-sm rounded-xl active:scale-95 transition-all"
            >
              📂 Import Backup
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImport}
              className="hidden"
              aria-label="Import backup file"
            />
            {importError && (
              <p className="mt-2 text-xs text-danger">{importError}</p>
            )}
            {importSuccess && (
              <p className="mt-2 text-xs text-forest font-bold">
                ✓ Backup imported successfully!
              </p>
            )}
          </div>
          <div className={rowCls}>
            <button
              onClick={() => setShowReset(true)}
              className="w-full py-3 bg-danger-bg text-danger font-bold text-sm rounded-xl active:scale-95 transition-all border-2 border-red-200"
            >
              🗑 Reset All Data
            </button>
            <p className="mt-1 text-xs text-bark-muted">
              This will delete all records and restore default settings.
            </p>
          </div>
        </div>



        {/* Original Excel database */}
        <div className={sectionCls}>
          <div className={sectionHeaderCls}>Original Excel Database</div>
          <div className={rowCls}>
            <label className={labelCls} htmlFor="excel-url">
              Spreadsheet Link
            </label>
            <p className="text-xs text-bark-muted mb-2">
              Paste the link to your Google Sheets, OneDrive, or Dropbox file.
            </p>
            <input
              id="excel-url"
              type="url"
              value={settings.excelSheetUrl}
              onChange={(e) => update({ excelSheetUrl: e.target.value })}
              placeholder="https://docs.google.com/spreadsheets/..."
              className={inputCls}
            />
          </div>
          <div className={rowCls}>
            <button
              onClick={() => window.open(settings.excelSheetUrl, "_blank", "noopener,noreferrer")}
              disabled={!settings.excelSheetUrl.trim()}
              className="w-full py-3 bg-forest text-white font-bold text-sm rounded-xl active:scale-95 transition-all disabled:opacity-40"
            >
              📊 Open Excel Database
            </button>
            {!settings.excelSheetUrl.trim() && (
              <p className="mt-1 text-xs text-bark-muted">
                Add a link above to enable this button.
              </p>
            )}
          </div>
        </div>




        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full py-4 bg-forest text-white font-bold text-base rounded-2xl shadow-md active:scale-95 transition-all mb-4"
        >
          {saved ? "✓ Settings Saved!" : "💾 Save Settings"}
        </button>
      </main>

      {showReset && (
        <ConfirmDialog
          message="This will permanently delete all records and restore default settings. Are you absolutely sure?"
          confirmLabel="Yes, Reset Everything"
          danger
          onConfirm={handleReset}
          onCancel={() => setShowReset(false)}
        />
      )}
    </div>
  );
}