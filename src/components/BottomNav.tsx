import type { Page } from "../types";

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

const items: { page: Page; label: string; icon: string }[] = [
  { page: "home", label: "Home", icon: "🏠" },
  { page: "sunday", label: "Sunday", icon: "📋" },
  { page: "saturday", label: "Saturday", icon: "📝" },
  { page: "register", label: "Register", icon: "➕" },
  { page: "history", label: "History", icon: "🗂" },
  { page: "settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 px-3 pb-3 safe-area-bottom pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        <div className="flex items-center gap-1 bg-white/90 backdrop-blur-lg border border-cream-200 rounded-full shadow-lg shadow-bark/10 px-1.5 py-1.5">
          {items.map((item) => {
            const active = current === item.page;
            return (
              <button
                key={item.page}
                onClick={() => onChange(item.page)}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-full transition-all duration-300 ease-out overflow-hidden ${
                  active
                    ? "flex-[1.6] bg-forest text-white py-2.5 px-3 shadow-sm"
                    : "flex-1 text-bark-muted py-2.5 px-2 hover:text-bark-light hover:bg-cream-100"
                }`}
              >
                <span
                  className={`leading-none transition-transform duration-300 ${
                    active ? "text-base scale-110" : "text-lg"
                  }`}
                  aria-hidden
                >
                  {item.icon}
                </span>
                <span
                  className={`text-xs font-bold whitespace-nowrap transition-all duration-300 ${
                    active
                      ? "max-w-[80px] opacity-100 ml-0"
                      : "max-w-0 opacity-0 ml-0"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
