"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { Loader2, MapPin } from "lucide-react";
import type { DashboardData } from "./types";

// react-leaflet must never render on the server — load the inner map only on
// the client via next/dynamic with ssr:false.
const MapWidgetInner = dynamic(() => import("./MapWidgetInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full min-h-[240px] items-center justify-center text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  ),
});

export function MapWidget({ data }: { data: DashboardData }) {
  const t = useTranslations("dashboard.map");
  const { mapProjects } = data;

  if (!mapProjects || mapProjects.length === 0) {
    return (
      <div className="flex h-full w-full min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <MapPin className="h-5 w-5 text-muted-foreground" />
        </div>
        <p className="max-w-xs text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full min-h-[240px] overflow-hidden">
      <MapWidgetInner projects={mapProjects} />
    </div>
  );
}
