"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Search, FolderKanban, Users, CheckSquare, Loader2 } from "lucide-react";
import { globalSearch, type SearchResult } from "@/actions/search";
import { Input } from "@/components/ui/input";

const TYPE_META = {
  project: { icon: FolderKanban, labelKey: "groupProjects", color: "text-violet-500" },
  client:  { icon: Users,        labelKey: "groupClients",  color: "text-emerald-500" },
  task:    { icon: CheckSquare,  labelKey: "groupTasks",    color: "text-orange-500" },
} as const;

const DEBOUNCE_MS = 300;

export function GlobalSearch() {
  const t = useTranslations("header");
  const pathname = usePathname();

  const [query,     setQuery]     = useState("");
  const [results,   setResults]   = useState<SearchResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [open,      setOpen]      = useState(false);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestSeq   = useRef(0);

  function reset() {
    setQuery("");
    setResults(null);
    setOpen(false);
  }

  // Close when navigating — "adjust state during render" pattern (no effect).
  const [lastPathname, setLastPathname] = useState(pathname);
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    reset();
  }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function handleChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = value.trim();
    if (q.length < 2) {
      setResults(null);
      setSearching(false);
      setOpen(false);
      return;
    }

    setOpen(true);
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const seq = ++requestSeq.current;
      try {
        const found = await globalSearch(q);
        // Drop stale responses that resolve after a newer keystroke.
        if (seq === requestSeq.current) {
          setResults(found);
          setSearching(false);
        }
      } catch {
        if (seq === requestSeq.current) {
          setResults([]);
          setSearching(false);
        }
      }
    }, DEBOUNCE_MS);
  }

  const groups = (["project", "client", "task"] as const)
    .map((type) => ({ type, items: (results ?? []).filter((r) => r.type === type) }))
    .filter((g) => g.items.length > 0);

  return (
    <div ref={containerRef} className="relative flex-1 max-w-sm hidden sm:block">
      <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <Input
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onFocus={() => { if (query.trim().length >= 2) setOpen(true); }}
        onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
        placeholder={t("searchPlaceholder")}
        role="combobox"
        aria-expanded={open}
        className="pe-9 text-sm bg-muted/50 border-transparent focus:border-border focus:bg-background"
      />

      {/* Results panel */}
      {open && (
        <div
          className="absolute inset-x-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-border
            bg-popover shadow-lg animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="max-h-[60vh] overflow-y-auto py-1">
            {searching ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {t("search.searching")}
              </div>
            ) : groups.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">
                {t("search.noResults")}
              </p>
            ) : (
              groups.map((group) => {
                const meta = TYPE_META[group.type];
                return (
                  <div key={group.type}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground/70">
                      {t(`search.${meta.labelKey}` as Parameters<typeof t>[0])}
                    </p>
                    {group.items.map((item) => (
                      <Link
                        key={`${item.type}-${item.id}`}
                        href={item.url}
                        onClick={reset}
                        className="flex items-center gap-2.5 px-3 py-2 transition-colors hover:bg-muted/60"
                      >
                        <meta.icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                          {item.title}
                        </span>
                        {item.subtitle && (
                          <span className="max-w-[40%] shrink-0 truncate text-xs text-muted-foreground">
                            {item.subtitle}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
