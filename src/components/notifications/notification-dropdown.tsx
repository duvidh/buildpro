"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import {
  Bell, Check, CheckCheck, CheckSquare2, Factory,
  FileText, Loader2, BellOff,
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/actions/notifications";

// ─── Types ────────────────────────────────────────────────────────────────────

type Notification = {
  id:          string;
  type:        string;
  title:       string;
  body:        string | null;
  read:        boolean;
  relatedId:   string | null;
  relatedType: string | null;
  createdAt:   string; // serialised as ISO string by the server action
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function NotificationIcon({ type }: { type: string }) {
  const cls = "h-3.5 w-3.5 shrink-0";
  if (type === "TASK_COMPLETED")   return <CheckSquare2 className={`${cls} text-emerald-500`} />;
  if (type === "PREFAB_MILESTONE") return <Factory      className={`${cls} text-violet-500`}  />;
  if (type === "FILE_UPLOADED")    return <FileText     className={`${cls} text-blue-500`}    />;
  return <Bell className={`${cls} text-muted-foreground`} />;
}

/** Fire a native browser notification if permission is granted. */
function fireNativeNotification(title: string, body?: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window))   return;
  if (window.Notification.permission !== "granted") return;
  try {
    new window.Notification(title, {
      body: body ?? "",
      icon: "/favicon.ico",
    });
  } catch {
    // some browsers block new Notification() outside a SW context — ignore
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

/** Poll interval in milliseconds (45 s keeps cache warm and feels responsive). */
const POLL_INTERVAL_MS = 45_000;

export function NotificationDropdown({ initialCount }: { initialCount: number }) {
  const t = useTranslations("notifications");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const [open,          setOpen]          = useState(false);
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [unreadCount,   setUnreadCount]   = useState(initialCount);
  const [loading,       setLoading]       = useState(false);
  const [, startTransition] = useTransition();

  // Track previous count so we can detect newly-arrived notifications
  const prevCountRef = useRef(initialCount);

  // ── Background polling ───────────────────────────────────────────────────
  useEffect(() => {
    const tick = async () => {
      try {
        const fresh = await getUnreadNotificationCount();
        const prev  = prevCountRef.current;

        if (fresh !== prev) {
          setUnreadCount(fresh);

          // New notifications arrived — trigger native push if permitted
          if (fresh > prev) {
            const delta = fresh - prev;
            fireNativeNotification(
              t("newNotifications", { count: delta, plural: delta > 1 ? "s" : "" }),
              t("clickForDetails"),
            );

            // If the dropdown is open, refresh its list too
            if (open) {
              const data = await getUserNotifications();
              setNotifications(data as unknown as Notification[]);
            } else {
              // Invalidate cached list so it reloads on next open
              setNotifications(null);
            }
          }

          prevCountRef.current = fresh;
        }
      } catch {
        // silently swallow network errors between polls
      }
    };

    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [open, t]);

  // ── Fetch on first open ──────────────────────────────────────────────────
  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && notifications === null) {
      setLoading(true);
      startTransition(async () => {
        const data = await getUserNotifications();
        setNotifications(data as unknown as Notification[]);
        setLoading(false);
      });
    }
  };

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev?.map((n) => (n.id === id ? { ...n, read: true } : n)) ?? null,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      prevCountRef.current = Math.max(0, prevCountRef.current - 1);
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
      setNotifications((prev) => prev?.map((n) => ({ ...n, read: true })) ?? null);
      setUnreadCount(0);
      prevCountRef.current = 0;
    });
  };

  const hasUnread = unreadCount > 0;

  function formatRelative(iso: string): string {
    const intlLocale = locale === "he" ? "he-IL" : "en-US";
    const ms  = Date.now() - new Date(iso).getTime();
    const min = Math.floor(ms / 60_000);
    if (min < 1)    return tCommon("relativeTime.justNow");
    if (min < 60)   return tCommon("relativeTime.minutesAgo", { min });
    const hrs = Math.floor(min / 60);
    if (hrs < 24)   return tCommon("relativeTime.hoursAgo", { hrs });
    const days = Math.floor(hrs / 24);
    if (days === 1) return tCommon("relativeTime.yesterday");
    if (days < 7)   return tCommon("relativeTime.daysAgo", { days });
    return new Date(iso).toLocaleDateString(intlLocale, { day: "2-digit", month: "2-digit" });
  }

  return (
    <DropdownMenu open={open} onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative shrink-0"
          aria-label={`${unreadCount} ${t("title")}`}
        >
          <Bell className="h-5 w-5" />
          {hasUnread && (
            <span className="absolute -top-0.5 -start-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 max-h-[420px] overflow-hidden flex flex-col">
        {/* Header */}
        <DropdownMenuLabel className="flex items-center justify-between py-2.5 shrink-0" dir="rtl">
          <span className="font-semibold">{t("title")}</span>
          {hasUnread && notifications && notifications.some((n) => !n.read) && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
            >
              <CheckCheck className="h-3 w-3" />
              {t("markAll")}
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="shrink-0" />

        {/* Body — scrollable */}
        <div className="overflow-y-auto flex-1" dir="rtl">
          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty */}
          {!loading && notifications !== null && notifications.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
              <BellOff className="h-6 w-6 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </div>
          )}

          {/* List */}
          {!loading &&
            notifications?.map((n) => (
              <div
                key={n.id}
                className={[
                  "flex items-start gap-3 px-3 py-2.5 border-b border-border/50 last:border-0",
                  !n.read ? "bg-primary/[0.04]" : "",
                ].join(" ")}
              >
                {/* Icon */}
                <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                  <NotificationIcon type={n.type} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.read ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </p>
                  {n.body && (
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                  )}
                  <p className="mt-1 text-[10px] text-muted-foreground/60">
                    {formatRelative(n.createdAt)}
                  </p>
                </div>

                {/* Mark as read */}
                {!n.read && (
                  <button
                    onClick={() => handleMarkOne(n.id)}
                    title={t("markRead")}
                    className="mt-1 shrink-0 rounded p-1 text-muted-foreground/50 hover:bg-muted hover:text-primary transition-colors"
                  >
                    <Check className="h-3 w-3" />
                  </button>
                )}
              </div>
            ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
