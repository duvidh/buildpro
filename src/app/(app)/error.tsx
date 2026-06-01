"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App-level error boundary.
 *
 * Most "errors" seen here in production are ChunkLoadErrors: after a new deploy,
 * a stale service-worker / browser cache requests a JS chunk whose hashed name
 * no longer exists. Those are recoverable — we force a ONE-TIME hard reload
 * (guarded by sessionStorage so we never loop) to pull the fresh assets. Any
 * other error shows a friendly retry UI instead of a blank/raw error.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorBoundary");

  const isChunkError =
    /ChunkLoadError|Loading chunk|Failed to fetch dynamically imported module|importing a module script failed/i.test(
      `${error?.name} ${error?.message}`,
    );

  useEffect(() => {
    if (!isChunkError) return;
    const KEY = "bp_chunk_reloaded";
    // Only auto-reload once per session to avoid an infinite reload loop.
    if (typeof window !== "undefined" && !sessionStorage.getItem(KEY)) {
      sessionStorage.setItem(KEY, "1");
      window.location.reload();
    }
  }, [isChunkError]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
        <RefreshCw className="h-6 w-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">{t("title")}</h2>
        <p className="max-w-sm text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => reset()} variant="outline">
          {t("retry")}
        </Button>
        <Button onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 me-1.5" />
          {t("reload")}
        </Button>
      </div>
    </div>
  );
}
