import { useState } from "react";
import type { SundayRecord, SaturdayRecord, HistoryTab } from "../types";
import {
  getSundayRecords,
  getSaturdayRecords,
  deleteSundayRecord,
  deleteSaturdayRecord,
  formatDisplayDate,
  generateId,
  saveSundayRecord,
  saveSaturdayRecord,
  getSettings,
} from "../storage";
import { buildSundayMessage, buildSaturdayMessage } from "../utils";
import PageHeader from "../components/PageHeader";
import ConfirmDialog from "../components/ConfirmDialog";

interface Props {
  onEditSunday: (r: SundayRecord) => void;
  onEditSaturday: (r: SaturdayRecord) => void;
}

export default function History({ onEditSunday, onEditSaturday }: Props) {
  const [tab, setTab] = useState<HistoryTab>("sunday");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; type: HistoryTab } | null>(null);
  const [viewRecord, setViewRecord] = useState<SundayRecord | SaturdayRecord | null>(null);

  const settings = getSettings();
  const sundayRecords = getSundayRecords().filter(
    (r) => !search || r.date.includes(search)
  );
  const saturdayRecords = getSaturdayRecords().filter(
    (r) => !search || r.date.includes(search)
  );

  function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "sunday") {
      deleteSundayRecord(deleteTarget.id);
    } else {
      deleteSaturdayRecord(deleteTarget.id);
    }
    setDeleteTarget(null);
    setViewRecord(null);
  }

  function duplicateSunday(r: SundayRecord) {
    saveSundayRecord({ ...r, id: generateId(), createdAt: new Date().toISOString() });
  }

  function duplicateSaturday(r: SaturdayRecord) {
    saveSaturdayRecord({ ...r, id: generateId(), createdAt: new Date().toISOString() });
  }

  const tabCls = (t: HistoryTab) =>
    `flex-1 py-3 text-sm font-bold transition-colors border-b-2 ${
      tab === t
        ? "border-forest text-forest"
        : "border-transparent text-bark-muted"
    }`;

  return (
    <div className="flex flex-col min-h-full">
      <PageHeader title="History" />

      {/* Tabs */}
      <div className="flex bg-white border-b border-cream-200 max-w-lg mx-auto w-full">
        <button className={tabCls("sunday")} onClick={() => setTab("sunday")}>
          📋 Sunday Attendance
        </button>
        <button className={tabCls("saturday")} onClick={() => setTab("saturday")}>
          📝 Cell Reports
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 bg-cream max-w-lg mx-auto w-full">
        <input
          type="date"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by date"
          className="w-full border-2 border-cream-200 rounded-xl px-4 py-2.5 text-bark text-sm font-semibold focus:border-forest focus:outline-none bg-white"
          aria-label="Search by date"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="mt-1 text-xs text-bark-muted underline"
          >
            Clear filter
          </button>
        )}
      </div>

      <main className="flex-1 px-4 pb-28 max-w-lg mx-auto w-full">
        {tab === "sunday" && (
          <div className="flex flex-col gap-3">
            {sundayRecords.length === 0 && (
              <p className="text-center text-bark-muted py-12">No Sunday records found.</p>
            )}
            {sundayRecords.map((r) => {
              const bsTotal = Object.values(r.attendances).reduce(
                (s, v) => s + (parseInt(v, 10) || 0), 0
              );
              const cell = parseInt(r.cellAttendance, 10);
              const grand = bsTotal + (isNaN(cell) ? 0 : cell);
              return (
                <div key={r.id} className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
                  <button
                    className="w-full text-left px-4 py-4 flex items-center justify-between"
                    onClick={() => setViewRecord(r)}
                  >
                    <div>
                      <div className="font-bold text-bark">{formatDisplayDate(r.date)}</div>
                      <div className="text-xs text-bark-muted mt-0.5">
                        Bible Study: {bsTotal} · My Cell: {r.cellAttendance || "—"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-forest text-lg">{grand}</div>
                      <div className="text-xs text-bark-muted">total</div>
                    </div>
                  </button>
                  <div className="flex border-t border-cream-200">
                    <button
                      onClick={() => { onEditSunday(r); }}
                      className="flex-1 py-2.5 text-xs font-bold text-forest-dark border-r border-cream-200"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => duplicateSunday(r)}
                      className="flex-1 py-2.5 text-xs font-bold text-bark-light border-r border-cream-200"
                    >
                      📋 Duplicate
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ id: r.id, type: "sunday" })}
                      className="flex-1 py-2.5 text-xs font-bold text-danger"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === "saturday" && (
          <div className="flex flex-col gap-3">
            {saturdayRecords.length === 0 && (
              <p className="text-center text-bark-muted py-12">No cell reports found.</p>
            )}
            {saturdayRecords.map((r) => (
              <div key={r.id} className="bg-white border border-cream-200 rounded-2xl shadow-sm overflow-hidden">
                <button
                  className="w-full text-left px-4 py-4 flex items-center justify-between"
                  onClick={() => setViewRecord(r)}
                >
                  <div>
                    <div className="font-bold text-bark">{formatDisplayDate(r.date)}</div>
                    <div className="text-xs text-bark-muted mt-0.5">
                      {r.venue} · {r.time}
                    </div>
                    {r.topic && (
                      <div className="text-xs text-bark-muted italic mt-0.5">
                        "{r.topic}"
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-bark-light text-lg">{r.attendance || "—"}</div>
                    <div className="text-xs text-bark-muted">attended</div>
                  </div>
                </button>
                <div className="flex border-t border-cream-200">
                  <button
                    onClick={() => { onEditSaturday(r); }}
                    className="flex-1 py-2.5 text-xs font-bold text-forest-dark border-r border-cream-200"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => duplicateSaturday(r)}
                    className="flex-1 py-2.5 text-xs font-bold text-bark-light border-r border-cream-200"
                  >
                    📋 Duplicate
                  </button>
                  <button
                    onClick={() => setDeleteTarget({ id: r.id, type: "saturday" })}
                    className="flex-1 py-2.5 text-xs font-bold text-danger"
                  >
                    🗑 Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Detail view modal */}
      {viewRecord && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-end"
          onClick={() => setViewRecord(null)}
        >
          <div
            className="bg-white w-full max-w-lg mx-auto rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-cream-200 rounded mx-auto mb-4" />
            <h3 className="font-display font-bold text-lg text-bark mb-3">
              {"date" in viewRecord && "attendances" in viewRecord
                ? "Sunday Attendance"
                : "Saturday Cell Report"}
            </h3>
            <pre className="whatsapp-preview text-sm text-bark bg-[#E8F5E9] rounded-xl p-4 border border-green-200">
              {"attendances" in viewRecord
                ? buildSundayMessage(viewRecord as SundayRecord, settings)
                : buildSaturdayMessage(viewRecord as SaturdayRecord, settings)}
            </pre>
            <button
              onClick={() => setViewRecord(null)}
              className="mt-4 w-full py-3 bg-forest text-white font-bold rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          message="Delete this record? This cannot be undone."
          confirmLabel="Delete"
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
