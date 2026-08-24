import type { Page } from "../types";

interface Props {
  current: Page;
  onChange: (p: Page) => void;
}

const items: { page: Page; label: string; icon: string }[] = [
  { page: "home", label: "Home", icon: "🏠" },
  { page: "sunday", label: "Sunday", icon: "📋" },
  { page: "saturday", label: "Saturday", icon: "📝" },
  { page: "history", label: "History", icon: "🗂" },
  { page: "settings", label: "Settings", icon: "⚙️" },
];

export default function BottomNav({ current, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-cream-200 safe-area-bottom">
      <div className="flex max-w-lg mx-auto">
        {items.map((item) => {
          const active = current === item.page;
          return (
            <button
              key={item.page}
              onClick={() => onChange(item.page)}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={`flex-1 flex flex-col items-center gap-0.5 py-2.5 px-1 text-xs font-semibold transition-colors ${
                active
                  ? "text-forest"
                  : "text-bark-muted hover:text-bark-light"
              }`}
            >
              <span className="text-lg leading-none" aria-hidden>
                {item.icon}
              </span>
              <span className={`${active ? "text-forest" : ""}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute bottom-0 h-0.5 w-10 bg-forest rounded-t" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
