// Client-safe geocoding helper backed by Photon (https://photon.komoot.io).
// Photon is free, CORS-enabled, requires no API key, and returns local/Hebrew
// names for Israeli queries regardless of the requested language.

export type GeoResult = {
  label: string;
  lat: number;
  lon: number;
  city?: string;
};

type PhotonProperties = {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  town?: string;
  village?: string;
  locality?: string;
  district?: string;
  state?: string;
  country?: string;
  postcode?: string;
};

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: PhotonProperties;
};

type PhotonResponse = { features?: PhotonFeature[] };

/**
 * Search addresses via Photon.
 * @param query free-text address query (Hebrew works natively)
 * @param lang  current app locale ("he" | "en" | ...)
 */
export async function searchAddress(query: string, lang: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  // Photon only supports a handful of UI languages (en/de/fr/it). For English we
  // request English labels; otherwise we omit the lang param so the local
  // (Hebrew/Arabic/etc.) names are returned.
  const langParam = lang === "en" ? "&lang=en" : "";
  const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=6${langParam}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as PhotonResponse;
    const features = data.features ?? [];

    return features
      .map((f): GeoResult | null => {
        const coords = f.geometry?.coordinates;
        if (!coords || coords.length < 2) return null;
        const [lon, lat] = coords;
        const p = f.properties ?? {};

        const city = p.city || p.town || p.village || p.locality || undefined;

        const street =
          p.street && p.housenumber
            ? `${p.street} ${p.housenumber}`
            : p.street || undefined;

        const label = [p.name || street, city, p.state, p.country]
          .filter(Boolean)
          .join(", ");

        if (!label) return null;
        return { label, lat, lon, city };
      })
      .filter((r): r is GeoResult => r !== null);
  } catch {
    return [];
  }
}
