"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Menu,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { NotificationDropdown } from "@/components/notifications/notification-dropdown";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import type { UserRole } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Avatar,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AppSidebar } from "./app-sidebar";
import { logout } from "@/actions/auth";

type SessionUser = { name: string; email: string; initials: string; role: UserRole };

// Page title resolution — driven by the header.pages translation namespace
function usePageTitle(pathname: string): string {
  const t = useTranslations("header.pages");
  // Exact match
  const segments = pathname.split("/").filter(Boolean);
  const root = segments[0] ?? "dashboard";
  try {
    // Try to get translation (throws/returns undefined if key missing)
    return t(root as Parameters<typeof t>[0]);
  } catch {
    return "BuildPro";
  }
}

export function AppHeader({
  notificationCount = 0,
  user,
}: {
  notificationCount?: number;
  user: SessionUser;
}) {
  const pathname          = usePathname();
  const title             = usePageTitle(pathname);
  const tCommon           = useTranslations("common");
  const [searchValue, setSearchValue] = useState("");
  const tHeader           = useTranslations("header");
  const debounceRef       = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, startTransition] = useTransition();

  // Request browser push-notification permission once on mount
  usePushNotifications();

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Global search will be wired here
    }, 250);
  }, []);

  function handleLogout() {
    startTransition(async () => {
      await logout();
    });
  }

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/80 glass-header sticky top-0 z-30 px-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden" aria-label="פתח תפריט">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-64">
          <AppSidebar user={user} />
        </SheetContent>
      </Sheet>

      {/* Page title */}
      <h1 className="shrink-0 text-base font-semibold text-foreground sm:text-lg">
        {title}
      </h1>

      {/* Global search */}
      <div className="relative flex-1 max-w-sm hidden sm:block">
        <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={tHeader("searchPlaceholder")}
          className="pe-9 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background"
        />
      </div>

      <div className="flex-1" />

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Notification bell */}
      <NotificationDropdown initialCount={notificationCount} />

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {user.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {user.name}
            </span>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground font-normal">{user.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center gap-2 cursor-pointer w-full">
              <User className="h-4 w-4" />
              {tCommon("profile")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer w-full">
              <Settings className="h-4 w-4" />
              {tCommon("systemSettings")}
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive cursor-pointer"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 me-2" />
            {tCommon("logout")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
