"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  title, onClose, children, wide,
}: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl border border-line bg-surface shadow-xl ${wide ? "max-w-2xl" : "max-w-lg"}`}
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-semibold">{title}</h2>
          <button onClick={onClose} aria-label="Close"><X className="size-5 text-muted" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}