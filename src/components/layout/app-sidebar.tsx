"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  TrendingUp,
  Users,
  FolderKanban,
  FileText,
  UserCog,
  Wrench,
  ClipboardList,
  CheckSquare,
  Package,
  ShoppingBag,
  Wallet,
  Settings,
  Building2,
  HardHat,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { APP_CONFIG } from "@/lib/config/app-config";

type SessionUser = { name: string; email: string; initials: string };

const navGroups = [
  {
    label: "ניהול",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "לוח בקרה" },
      { href: "/leads", icon: TrendingUp, label: "לידים ומכירות" },
      { href: "/clients", icon: Users, label: "לקוחות" },
      { href: "/projects", icon: FolderKanban, label: "פרויקטים" },
      { href: "/quotes", icon: FileText, label: "הצעות מחיר" },
    ],
  },
  {
    label: "שטח ומשאבים",
    items: [
      { href: "/field", icon: HardHat, label: "דיווחים מהשטח" },
      { href: "/hr", icon: UserCog, label: "כוח אדם" },
      { href: "/equipment", icon: Wrench, label: "ציוד" },
      { href: "/daily-logs", icon: ClipboardList, label: "יומן עבודה" },
      { href: "/tasks", icon: CheckSquare, label: "משימות" },
    ],
  },
  {
    label: "רכש וכספים",
    items: [
      { href: "/subcontractors", icon: Package, label: "ספקים וקבלנים" },
      { href: "/catalog", icon: ShoppingBag, label: "קטלוג" },
      { href: "/finance", icon: Wallet, label: "כספים" },
    ],
  },
];

export function AppSidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col bg-sidebar border-e border-sidebar-border">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground leading-none">{APP_CONFIG.companyName}</p>
          <p className="text-[11px] text-sidebar-foreground/50 mt-0.5">{APP_CONFIG.companyTagline}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.label}>
            <p className="mb-2 px-2 text-[10px] font-semibold tracking-wide text-sidebar-foreground/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const isActive =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-sidebar-primary/15 text-sidebar-primary"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-sidebar-primary/15 text-sidebar-primary"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          הגדרות
        </Link>
        <Separator className="bg-sidebar-border my-2" />
        <div className="flex items-center gap-3 px-3 py-2">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarFallback className="bg-sidebar-primary/20 text-sidebar-primary text-xs font-bold">
              {user.initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate leading-none">
              {user.name}
            </p>
            <p className="text-[11px] text-sidebar-foreground/50 mt-0.5 truncate">
              {user.email}
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
