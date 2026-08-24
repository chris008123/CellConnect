interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function PageHeader({ title, subtitle, onBack }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-forest text-white px-4 pt-3 pb-2.5 rounded-b-2xl shadow-md shadow-forest/20">
      <div className="max-w-lg mx-auto flex items-center gap-2.5">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="flex items-center justify-center w-8 h-8 -ml-1.5 rounded-full hover:bg-white/15 active:scale-90 transition-all"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden
            >
              <path
                d="M12.5 16L7 10l5.5-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold leading-tight tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-forest-subtle opacity-90 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}
