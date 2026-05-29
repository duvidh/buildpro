"use client";

import { useEffect } from "react";

/**
 * Requests browser push-notification permission once on mount.
 * Call this hook from the app layout so it runs on every page.
 * The actual notification firing is handled by NotificationDropdown's polling loop.
 */
export function usePushNotifications() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window))   return;

    // Only prompt if the user hasn't made a choice yet
    if (window.Notification.permission === "default") {
      // Use a short delay so it doesn't fire immediately on page load
      const t = setTimeout(() => {
        window.Notification.requestPermission().catch(() => {
          // Ignore — some browsers reject programmatic requests
        });
      }, 3_000);
      return () => clearTimeout(t);
    }
  }, []);
}
