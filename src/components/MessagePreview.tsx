import { useState } from "react";
import { copyToClipboard } from "../utils";

interface Props {
  message: string;
  label?: string;
}

export default function MessagePreview({ message, label = "WhatsApp Message Preview" }: Props) {
  const [copied, setCopied] = useState(false);
  const [showWA, setShowWA] = useState(false);

  async function handleCopy() {
    const ok = await copyToClipboard(message);
    if (ok) {
      setCopied(true);
      setShowWA(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="mt-6">
      <h2 className="text-sm font-bold uppercase tracking-widest text-bark-muted mb-2">
        {label}
      </h2>
      <div className="bg-[#E8F5E9] rounded-xl border border-green-200 p-4 shadow-sm">
        <pre className="whatsapp-preview text-sm text-bark leading-relaxed">
          {message}
        </pre>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        <button
          onClick={handleCopy}
          className="w-full py-4 bg-forest text-white font-bold text-base rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {copied ? (
            <>
              <span>✓</span> Copied!
            </>
          ) : (
            <>
              <span>📋</span> Copy for WhatsApp
            </>
          )}
        </button>

        {showWA && (
          <a
            href="https://wa.me/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 bg-[#25D366] text-white font-bold text-base rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <span>💬</span> Open WhatsApp
          </a>
        )}
      </div>
    </div>
  );
}
