"use client";
import { createContext, useCallback, useContext, useState } from "react";

type Kind = "success" | "error" | "info";
interface Item { id: number; msg: string; kind: Kind }

const Ctx = createContext<(msg: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

const BORDER: Record<Kind, string> = {
  success: "border-l-emerald-500", error: "border-l-red-500", info: "border-l-brand",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Item[]>([]);
  const push = useCallback((msg: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, msg, kind }]);
    setTimeout(() => setItems((p) => p.filter((t) => t.id !== id)), 3500);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {items.map((t) => (
          <div key={t.id} className={`max-w-sm rounded-lg border border-l-4 border-line bg-surface px-4 py-3 text-sm shadow-lg ${BORDER[t.kind]}`}>
            {t.msg}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}