"use client";

import { useMemo } from "react";
import Link from "next/link";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useTranslations } from "next-intl";
import "leaflet/dist/leaflet.css";
import type { DashboardMapProject } from "./types";

// Status → pin color. Falls back to the primary blue.
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "#10b981",
  PLANNING: "#3b82f6",
  ON_HOLD: "#f97316",
  COMPLETED: "#64748b",
  CANCELLED: "#ef4444",
};

// Build an inline-SVG pin so no external marker image is needed (avoids the
// classic Leaflet+bundler broken-icon issue and any CSP/asset concerns).
function makePinIcon(color: string) {
  const html = `
    <svg width="26" height="38" viewBox="0 0 26 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M13 0C5.82 0 0 5.82 0 13c0 9.5 13 25 13 25s13-15.5 13-25C26 5.82 20.18 0 13 0z"
        fill="${color}" stroke="#ffffff" stroke-width="2"/>
      <circle cx="13" cy="13" r="5" fill="#ffffff"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "buildpro-map-pin",
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  });
}

// Default center: roughly the centre of Israel.
const ISRAEL_CENTER: [number, number] = [31.5, 34.9];

export default function MapWidgetInner({
  projects,
}: {
  projects: DashboardMapProject[];
}) {
  const tStatus = useTranslations("projects.status");
  const tMap = useTranslations("dashboard.map");

  const iconCache = useMemo(() => {
    const cache: Record<string, L.DivIcon> = {};
    for (const key of Object.keys(STATUS_COLOR)) {
      cache[key] = makePinIcon(STATUS_COLOR[key]);
    }
    cache.__default = makePinIcon("#3b82f6");
    return cache;
  }, []);

  return (
    <MapContainer
      center={ISRAEL_CENTER}
      zoom={7}
      scrollWheelZoom={false}
      className="h-full w-full min-h-[240px]"
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {projects.map((p) => (
        <Marker
          key={p.id}
          position={[p.latitude, p.longitude]}
          icon={iconCache[p.status] ?? iconCache.__default}
        >
          <Popup>
            <div className="space-y-1">
              <p className="font-semibold">{p.name}</p>
              <p className="text-xs text-muted-foreground">
                {tStatus(p.status as Parameters<typeof tStatus>[0])}
              </p>
              {p.address && <p className="text-xs">{p.address}</p>}
              <Link
                href={`/projects/${p.id}`}
                className="text-xs font-medium text-primary hover:underline"
              >
                {tMap("openProject")}
              </Link>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
