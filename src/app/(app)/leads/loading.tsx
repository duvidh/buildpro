import { Skeleton } from "@/components/ui/skeleton";

export default function LeadsLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-3 w-52" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-xl" />
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-7 w-24 rounded-full" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-3 h-10 bg-[#fdfbf7] border-b border-border/50">
          {[180, 100, 140, 80, 90, 90, 80, 80, 100].map((w, i) => (
            <Skeleton key={i} className="h-3 shrink-0" style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 h-12 border-b border-border/40 last:border-0"
          >
            <Skeleton className="h-4 w-[180px] shrink-0" />
            <Skeleton className="h-4 w-[100px] shrink-0" />
            <Skeleton className="h-4 w-[140px] shrink-0 hidden md:block" />
            <Skeleton className="h-4 w-[80px] shrink-0 hidden sm:block" />
            <Skeleton className="h-5 w-[90px] rounded-full shrink-0" />
            <Skeleton className="h-5 w-[90px] rounded-full shrink-0" />
            <Skeleton className="h-4 w-[80px] shrink-0 hidden lg:block" />
            <Skeleton className="h-4 w-[80px] shrink-0 hidden md:block" />
            <Skeleton className="h-7 w-[100px] rounded-xl shrink-0 ms-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
