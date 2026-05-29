"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useIsOnline(): boolean {
  // Default to true on the server / first render to avoid hydration mismatch
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Sync with the real value after mount
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsOnline(navigator.onLine);

    const handleOnline  = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online",  handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online",  handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

// ─── Banner component ─────────────────────────────────────────────────────────

export function OfflineIndicator() {
  const isOnline = useIsOnline();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        // Sticky bar that sits above all content (z-50)
        "fixed bottom-0 inset-x-0 z-50",
        "flex items-center justify-center gap-2.5",
        "bg-amber-500 text-amber-950",
        "px-4 py-2.5 text-sm font-medium",
        // Slide up animation
        "animate-in slide-in-from-bottom-2 duration-300",
        // Safe-area padding for notched phones
        "pb-[calc(0.625rem+env(safe-area-inset-bottom))]",
      ].join(" ")}
    >
      <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span dir="rtl">
        ⚠️ אתה נמצא כרגע במצב לא מקוון (Offline). שינויים לא יישמרו עד לחידוש הרשת.
      </span>
    </div>
  );
}
