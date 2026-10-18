import type { Page } from "../types";
import {
  getSundayRecords,
  getSaturdayRecords,
  formatDisplayDate,
} from "../storage";

interface Props {
  onNavigate: (p: Page) => void;
}

export default function Home({ onNavigate }: Props) {
  const sunday = getSundayRecords()[0] ?? null;
  const saturday = getSaturdayRecords()[0] ?? null;

  const today = new Date().toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex flex-col min-h-full">
      {/* Header banner */}
      <header className="bg-forest text-white px-5 pt-8 pb-6">
        <div className="max-w-lg mx-auto">
          <p className="text-forest-subtle text-sm font-semibold tracking-wide uppercase opacity-80">
            Cell Secretary
          </p>
          <h1 className="font-display text-2xl font-bold mt-1 leading-snug">
            Church Secretary
            <br />
            Assistant
          </h1>
          <p className="mt-2 text-sm text-forest-subtle opacity-90">{today}</p>
          <div className="mt-3 h-0.5 w-12 bg-gold rounded" />
        </div>
      </header>

      <main className="flex-1 px-4 pt-6 pb-24 max-w-lg mx-auto w-full">
        {/* Primary action buttons */}
        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => onNavigate("sunday")}
            className="w-full bg-forest text-white rounded-2xl p-5 shadow-md active:scale-95 transition-transform text-left flex items-center gap-4"
          >
            <span className="text-3xl">📋</span>
            <div>
              <div className="font-bold text-lg leading-tight">
                Sunday Attendance
              </div>
              <div className="text-sm text-forest-subtle opacity-90 mt-0.5">
                Record and send weekly attendance
              </div>
            </div>
          </button>

          <button
            onClick={() => onNavigate("saturday")}
            className="w-full bg-bark text-white rounded-2xl p-5 shadow-md active:scale-95 transition-transform text-left flex items-center gap-4"
          >
            <span className="text-3xl">📝</span>
            <div>
              <div className="font-bold text-lg leading-tight">
                Saturday Cell Report
              </div>
              <div className="text-sm text-cream-200 opacity-90 mt-0.5">
                File your weekly cell meeting report
              </div>
            </div>
          </button>
        </div>

        <button
          onClick={() => onNavigate("register")}
          className="mt-3 w-full bg-white border-2 border-forest rounded-2xl p-4 shadow-sm active:scale-95 transition-transform text-left flex items-center gap-4"
        >
          <span className="text-2xl">➕</span>
          <div>
            <div className="font-bold text-forest-dark text-base leading-tight">
              Register Member
            </div>
            <div className="text-xs text-bark-muted mt-0.5">
              Add a new member to your cell
            </div>
          </div>
        </button>

        {/* Secondary actions */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate("history")}
            className="bg-white border-2 border-cream-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-transform text-left"
          >
            <div className="text-2xl mb-1">🗂</div>
            <div className="font-bold text-bark text-sm">History</div>
            <div className="text-xs text-bark-muted mt-0.5">View past records</div>
          </button>
          <button
            onClick={() => onNavigate("settings")}
            className="bg-white border-2 border-cream-200 rounded-2xl p-4 shadow-sm active:scale-95 transition-transform text-left"
          >
            <div className="text-2xl mb-1">⚙️</div>
            <div className="font-bold text-bark text-sm">Settings</div>
            <div className="text-xs text-bark-muted mt-0.5">Teachers & templates</div>
          </button>
        </div>

        {/* Recent records */}
        {(sunday || saturday) && (
          <section className="mt-6">
            <h2 className="font-display text-base font-semibold text-bark-light mb-3">
              Recent Records
            </h2>
            <div className="flex flex-col gap-2">
              {sunday && (
                <div
                  className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm cursor-pointer active:bg-cream"
                  onClick={() => onNavigate("sunday")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📋</span>
                      <div>
                        <div className="font-bold text-sm text-bark">
                          Sunday Attendance
                        </div>
                        <div className="text-xs text-bark-muted">
                          {formatDisplayDate(sunday.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-forest text-sm">
                        {(() => {
                          const cell = parseInt(sunday.cellAttendance, 10);
                          const bsTotal = Object.values(sunday.attendances).reduce(
                            (s, v) => s + (parseInt(v, 10) || 0),
                            0
                          );
                          return isNaN(cell) ? bsTotal : bsTotal + cell;
                        })()}
                      </div>
                      <div className="text-xs text-bark-muted">total</div>
                    </div>
                  </div>
                </div>
              )}

              {saturday && (
                <div
                  className="bg-white border border-cream-200 rounded-xl p-4 shadow-sm cursor-pointer active:bg-cream"
                  onClick={() => onNavigate("saturday")}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">📝</span>
                      <div>
                        <div className="font-bold text-sm text-bark">
                          Cell Report
                        </div>
                        <div className="text-xs text-bark-muted">
                          {formatDisplayDate(saturday.date)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-bark-light text-sm">
                        {saturday.attendance || "—"}
                      </div>
                      <div className="text-xs text-bark-muted">attended</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {!sunday && !saturday && (
          <div className="mt-8 text-center text-bark-muted text-sm">
            <p className="text-3xl mb-3">✝️</p>
            <p>No records yet. Start by recording Sunday attendance.</p>
          </div>
        )}
      </main>
    </div>
  );
}
