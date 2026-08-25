interface Props {
  message?: string;
  icon?: string;
  className?: string;
}

export default function LoadingScreen({
  message = "Loading…",
  icon = "⏳",
  className = "",
}: Props) {
  return (
    <div className={`bg-white border border-cream-200 rounded-2xl p-8 text-center mb-4 ${className}`}>
      <p className="text-3xl mb-2">{icon}</p>
      <p className="text-sm text-bark-muted">{message}</p>
    </div>
  );
}
