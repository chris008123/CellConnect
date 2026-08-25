import type { ReactNode } from "react";

type StatusVariant = "error" | "warning" | "success" | "info";

interface Props {
  variant: StatusVariant;
  message: string;
  className?: string;
  children?: ReactNode;
}

const VARIANT_STYLES: Record<StatusVariant, string> = {
  error: "bg-danger-bg border-red-200 text-danger",
  warning: "bg-warning-bg border-yellow-300 text-warning",
  success: "bg-forest-subtle border-forest/20 text-forest",
  info: "bg-cream border-cream-200 text-bark-light",
};

export default function StatusBanner({ variant, message, className = "", children }: Props) {
  return (
    <div className={`border rounded-xl px-4 py-3 ${VARIANT_STYLES[variant]} ${className}`}>
      <p className={`text-sm font-bold ${children ? "mb-2" : ""}`}>{message}</p>
      {children}
    </div>
  );
}