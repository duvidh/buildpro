"use client";

import { useEffect, useState } from "react";

/**
 * LivingBackground
 *
 * Three slow-drifting blobs fixed behind all content (z-index: -1).
 * Colors are driven by CSS custom properties (--blob-1/2/3-rgb) that every
 * theme defines, so the blobs always complement the active palette.
 * Respects the `buildpro-no-animations` localStorage key — when set to "1"
 * the blobs are rendered static (no animation).
 */
export function LivingBackground() {
  const [mounted, setMounted] = useState(false);
  const [animated, setAnimated] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    function syncPref() {
      try {
        setAnimated(localStorage.getItem("buildpro-no-animations") !== "1");
      } catch {
        setAnimated(true);
      }
    }
    syncPref();
    window.addEventListener("storage", syncPref);
    return () => window.removeEventListener("storage", syncPref);
  }, []);

  if (!mounted) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden"
    >
      {/* Blob 1 — top-right */}
      <div
        className={animated ? "animate-blob-1" : undefined}
        style={{
          position: "absolute",
          top: "-15%",
          right: "-10%",
          width: "55vw",
          height: "55vw",
          maxWidth: 700,
          maxHeight: 700,
          borderRadius: "60% 40% 70% 30% / 50% 60% 40% 50%",
          background: "radial-gradient(circle at 40% 40%, rgb(var(--blob-1-rgb) / 0.12), transparent 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Blob 2 — bottom-left */}
      <div
        className={animated ? "animate-blob-2" : undefined}
        style={{
          position: "absolute",
          bottom: "-20%",
          left: "-15%",
          width: "60vw",
          height: "60vw",
          maxWidth: 800,
          maxHeight: 800,
          borderRadius: "40% 60% 30% 70% / 60% 40% 60% 40%",
          background: "radial-gradient(circle at 60% 60%, rgb(var(--blob-2-rgb) / 0.10), transparent 70%)",
          filter: "blur(50px)",
        }}
      />

      {/* Blob 3 — center */}
      <div
        className={animated ? "animate-blob-3" : undefined}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "40vw",
          height: "40vw",
          maxWidth: 550,
          maxHeight: 550,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgb(var(--blob-3-rgb) / 0.07), transparent 65%)",
          filter: "blur(60px)",
        }}
      />
    </div>
  );
}
