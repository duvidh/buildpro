"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import {
  Bell,
  Menu,
  Search,
  Settings,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
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
import { MOCK_CURRENT_USER } from "@/lib/config/app-config";

const pageTitles: Record<string, string> = {
  "/dashboard":    "לוח בקרה",
  "/leads":        "לידים ומכירות",
  "/clients":      "לקוחות",
  "/projects":     "פרויקטים",
  "/quotes":       "הצעות מחיר",
  "/field":        "דיווחים מהשטח",
  "/hr":           "כוח אדם",
  "/equipment":    "ציוד",
  "/daily-logs":   "יומן עבודה",
  "/tasks":        "משימות",
  "/subcontractors": "ספקים וקבלנים",
  "/catalog":      "קטלוג",
  "/finance":      "כספים",
  "/settings":     "הגדרות",
  "/profile":      "פרופיל אישי",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  const match = Object.keys(pageTitles).find((k) =>
    pathname.startsWith(k + "/")
  );
  return match ? pageTitles[match] : "BuildPro";
}

export function AppHeader() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const [searchValue, setSearchValue] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback((value: string) => {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Global search will be wired here
    }, 250);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      {/* Mobile sidebar trigger */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="shrink-0 md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="p-0 w-64">
          <AppSidebar />
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
          placeholder="חיפוש גלובלי..."
          className="pe-9 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background"
        />
      </div>

      <div className="flex-1" />

      {/* Notification bell */}
      <Button variant="ghost" size="icon" className="relative shrink-0">
        <Bell className="h-5 w-5" />
        <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 flex items-center justify-center text-[10px] leading-none rounded-full">
          3
        </Badge>
      </Button>

      {/* User dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 px-2 hover:bg-accent"
          >
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {MOCK_CURRENT_USER.initials}
              </AvatarFallback>
            </Avatar>
            <span className="hidden sm:block text-sm font-medium text-foreground">
              {MOCK_CURRENT_USER.name}
            </span>
            <ChevronDown className="hidden sm:block h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuLabel>
            <p className="font-medium">{MOCK_CURRENT_USER.name}</p>
            <p className="text-xs text-muted-foreground font-normal">{MOCK_CURRENT_USER.email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/profile" className="flex items-center gap-2 cursor-pointer w-full">
              <User className="h-4 w-4" />
              פרופיל אישי
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="flex items-center gap-2 cursor-pointer w-full">
              <Settings className="h-4 w-4" />
              הגדרות מערכת
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem className="text-destructive focus:text-destructive cursor-pointer">
            <LogOut className="h-4 w-4 me-2" />
            התנתקות
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
