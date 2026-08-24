interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function PageHeader({ title, subtitle, onBack }: Props) {
  return (
    <header className="sticky top-0 z-40 bg-forest text-white px-4 pt-4 pb-3 shadow-md">
      <div className="max-w-lg mx-auto flex items-center gap-3">
        {onBack && (
          <button
            onClick={onBack}
            aria-label="Go back"
            className="p-2 -ml-2 rounded-lg hover:bg-forest-light transition-colors"
          >
            <svg
              width="20"
              height="20"
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
        <div>
          <h1 className="font-display text-xl font-bold leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-forest-subtle opacity-90">{subtitle}</p>
          )}
        </div>
      </div>
    </header>
  );
}
