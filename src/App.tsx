import { useState } from "react";
import type { Page, SundayRecord, SaturdayRecord } from "./types";
import { seedSampleDataIfNeeded } from "./storage";
import BottomNav from "./components/BottomNav";
import Home from "./pages/Home";
import SundayAttendance from "./pages/SundayAttendance";
import SaturdayReport from "./pages/SaturdayReport";
import History from "./pages/History";
import Settings from "./pages/Settings";
import RegisterMember from "./pages/RegisterMember";

seedSampleDataIfNeeded();

// Pages that show the bottom nav
const NAV_PAGES: Page[] = ["home", "sunday", "saturday", "register", "history", "settings"];

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [editSaturday, setEditSaturday] = useState<SaturdayRecord | undefined>();
  const [refreshKey, setRefreshKey] = useState(0);

  function navigateTo(p: Page) {
    if (p !== "saturday") setEditSaturday(undefined);
    setPage(p);
    window.scrollTo(0, 0);
  }

  function handleEditSunday(_r: SundayRecord) {
    // Sunday page manages its own date selection; navigate there
    setPage("sunday");
    window.scrollTo(0, 0);
  }

  function handleEditSaturday(r: SaturdayRecord) {
    setEditSaturday(r);
    setPage("saturday");
    window.scrollTo(0, 0);
  }

  function handleSaved() {
    setRefreshKey((k) => k + 1);
  }

  const showNav = NAV_PAGES.includes(page);

  return (
    <div className="relative min-h-screen bg-cream font-body">
      <div className="max-w-lg mx-auto min-h-screen flex flex-col">
        {page === "home" && (
          <Home key={refreshKey} onNavigate={navigateTo} />
        )}
        {page === "sunday" && (
          <SundayAttendance key={refreshKey} onSaved={handleSaved} />
        )}
        {page === "saturday" && (
          <SaturdayReport
            key={editSaturday?.id ?? "new-saturday"}
            editRecord={editSaturday}
            onSaved={handleSaved}
          />
        )}
        {page === "register" && <RegisterMember />}
        {page === "history" && (
          <History
            key={refreshKey}
            onEditSunday={handleEditSunday}
            onEditSaturday={handleEditSaturday}
          />
        )}
        {page === "settings" && (
          <Settings key={refreshKey} />
        )}
      </div>

      {showNav && <BottomNav current={page} onChange={navigateTo} />}
    </div>
  );
}
