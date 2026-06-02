// Client-safe geocoding helper backed by Nominatim (OpenStreetMap's official
// geocoder). Unlike Photon, Nominatim honours `accept-language` (so Hebrew
// queries return real Hebrew labels) and matches Israeli street addresses far
// more accurately. It's free and CORS-enabled; usage policy asks for a
// descriptive request and <=1 req/sec (the caller debounces typing).

export type GeoResult = {
  label: string;
  lat: number;
  lon: number;
  city?: string;
};

type NominatimAddress = {
  road?: string;
  house_number?: string;
  pedestrian?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  state?: string;
  country?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  name?: string;
  address?: NominatimAddress;
};

/**
 * Search addresses via Nominatim.
 * @param query free-text address query (Hebrew works natively)
 * @param lang  current app locale ("he" | "en" | ...) — drives result language
 */
export async function searchAddress(query: string, lang: string): Promise<GeoResult[]> {
  const q = query.trim();
  if (q.length < 3) return [];

  const params = new URLSearchParams({
    q,
    format: "jsonv2",
    addressdetails: "1",
    limit: "6",
    // Return labels in the user's language (Hebrew names for he, etc.).
    "accept-language": lang || "he",
  });
  const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return [];
    const data = (await res.json()) as NominatimResult[];
    if (!Array.isArray(data)) return [];

    return data
      .map((item): GeoResult | null => {
        const lat = parseFloat(item.lat ?? "");
        const lon = parseFloat(item.lon ?? "");
        if (Number.isNaN(lat) || Number.isNaN(lon)) return null;

        const a = item.address ?? {};
        const city =
          a.city || a.town || a.village || a.municipality || a.suburb || undefined;

        const streetName = a.road || a.pedestrian || item.name || undefined;
        const street =
          streetName && a.house_number
            ? `${streetName} ${a.house_number}`
            : streetName || undefined;

        // Prefer a concise "street, city, state, country" label; fall back to
        // Nominatim's full display_name when we can't compose one.
        const composed = [street, city, a.state, a.country]
          .filter(Boolean)
          .join(", ");
        const label = composed || item.display_name || "";

        if (!label) return null;
        return { label, lat, lon, city };
      })
      .filter((r): r is GeoResult => r !== null);
  } catch {
    return [];
  }
}
