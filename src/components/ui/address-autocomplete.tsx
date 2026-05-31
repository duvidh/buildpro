"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { searchAddress, type GeoResult } from "@/lib/geocode";

type AddressAutocompleteProps = {
  value: string;
  onChange: (v: string) => void;
  onSelect: (r: { label: string; lat: number; lon: number; city?: string }) => void;
  placeholder?: string;
  id?: string;
  dir?: "rtl" | "ltr";
};

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder,
  id,
  dir,
}: AddressAutocompleteProps) {
  const t = useTranslations("address");
  const locale = useLocale();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GeoResult[]>([]);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const blurRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against stale async responses overwriting newer ones.
  const reqIdRef = useRef(0);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (blurRef.current) clearTimeout(blurRef.current);
    };
  }, []);

  function runSearch(query: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const res = await searchAddress(q, locale);
      // Ignore if a newer request started after this one.
      if (myReq !== reqIdRef.current) return;
      setResults(res);
      setLoading(false);
      setOpen(true);
    }, 350);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    onChange(v);
    setOpen(true);
    runSearch(v);
  }

  function handleSelect(r: GeoResult) {
    onChange(r.label);
    onSelect(r);
    setResults([]);
    setOpen(false);
  }

  function handleBlur() {
    // Delay so a click on a suggestion registers before we close.
    blurRef.current = setTimeout(() => setOpen(false), 150);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") setOpen(false);
  }

  const q = value.trim();
  const showDropdown = open && q.length >= 3;

  return (
    <div className="relative">
      <Input
        id={id}
        dir={dir}
        value={value}
        onChange={handleChange}
        onFocus={() => { if (q.length >= 3) setOpen(true); }}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
      />

      {showDropdown && (
        <div
          className="absolute z-50 mt-1 w-full overflow-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md max-h-64"
          dir={dir}
        >
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t("searching")}
            </div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-muted-foreground">
              {q.length < 3 ? t("typeMore") : t("noResults")}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((r, i) => (
                <li key={`${r.label}-${i}`}>
                  <button
                    type="button"
                    // onMouseDown fires before input blur, so the selection sticks.
                    onMouseDown={(e) => { e.preventDefault(); handleSelect(r); }}
                    className={cn(
                      "flex w-full items-start gap-2 px-3 py-2 text-start text-sm",
                      "hover:bg-accent hover:text-accent-foreground transition-colors",
                    )}
                  >
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{r.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
