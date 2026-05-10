import { Skeleton } from "@/components/ui/skeleton";

export default function ClientsLoading() {
  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-9 w-9 rounded-lg" />
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-3 w-56" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-2xl border border-border/50 bg-white/90 shadow-[0_4px_24px_rgb(0,0,0,0.04)] overflow-hidden">
        {/* Header row */}
        <div className="flex items-center gap-3 px-3 h-10 bg-[#fdfbf7] border-b border-border/50">
          {[220, 110, 150, 70, 100, 90, 80, 60].map((w, i) => (
            <Skeleton key={i} className="h-3 shrink-0" style={{ width: w }} />
          ))}
        </div>
        {/* Data rows */}
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 px-3 h-14 border-b border-border/40 last:border-0"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 w-[220px] shrink-0">
              <Skeleton className="h-8 w-8 rounded-full shrink-0" />
              <div className="space-y-1.5 flex-1 min-w-0">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-4 w-[110px] shrink-0" />
            <Skeleton className="h-4 w-[150px] shrink-0 hidden sm:block" />
            <Skeleton className="h-5 w-[70px] rounded-full shrink-0 hidden md:block" />
            <Skeleton className="h-4 w-[100px] shrink-0 hidden lg:block" />
            <Skeleton className="h-4 w-[90px] shrink-0 hidden lg:block" />
            <Skeleton className="h-4 w-[80px] shrink-0 hidden md:block" />
            <Skeleton className="h-7 w-[60px] rounded-xl shrink-0 ms-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
