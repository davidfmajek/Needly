// Edge Function: fetch nearby places using Google Places and rank them
// against user profile preferences.
//
// Required secrets:
//   GOOGLE_MAPS_API_KEY
//   GEMINI_API_KEY (optional, for rerank + explanations)
//   SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

// deno-lint-ignore-file no-explicit-any
declare const Deno: any;
import { corsHeaders } from "../_shared/cors.ts";
import { adminClient, json, requireUser } from "../_shared/auth.ts";

type Intent =
  | "coffee"
  | "food"
  | "study"
  | "gym"
  | "nightout"
  | "outdoors"
  | "chill"
  | "culture"
  | "supplies"
  | "default";

interface Body {
  intent?: Intent;
  query?: string;
  limit?: number;
}

interface PlaceResult {
  id: string;
  name: string;
  category: string;
  reason: string;
  distance: string;
  matchPct: number;
  openNow: boolean | null;
  todayHours: string | null;
  latitude?: number;
  longitude?: number;
}

const RADIUS_BY_TRANSPORT: Record<string, number> = {
  walking: 1200,
  bike: 3000,
  transit: 5000,
  "public transit": 5000,
  car: 10000,
  rideshare: 10000,
};

const INTENT_CONFIG: Record<Intent, { keyword?: string; types: string[]; categoryLabel: string }> = {
  coffee: { keyword: "coffee", types: ["cafe"], categoryLabel: "Coffee" },
  food: { keyword: "restaurant", types: ["restaurant"], categoryLabel: "Food" },
  study: { keyword: "library study cafe", types: ["library", "cafe"], categoryLabel: "Study Spot" },
  gym: { keyword: "gym fitness", types: ["gym"], categoryLabel: "Fitness" },
  nightout: { keyword: "bar nightlife", types: ["bar", "night_club"], categoryLabel: "Nightlife" },
  outdoors: { keyword: "park outdoors", types: ["park"], categoryLabel: "Outdoors" },
  chill: { keyword: "cafe park lounge", types: ["cafe", "park"], categoryLabel: "Chill Spot" },
  culture: { keyword: "museum gallery exhibit", types: ["museum", "art_gallery"], categoryLabel: "Museum" },
  supplies: {
    keyword: "hardware home improvement lumber tools",
    types: ["hardware_store", "home_goods_store", "store"],
    categoryLabel: "Supplies",
  },
  default: { keyword: "restaurant cafe", types: ["restaurant", "cafe"], categoryLabel: "Nearby" },
};

function inferIntentFromQuery(query: string): Intent | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  if (/(hardware|lumber|nails?|screws?|tools?|drill|wood|paint|tile|grout|hammer|build|fix|repair|assemble|install|sand|diy)/.test(q)) return "supplies";
  if (/(museum|mesuem|gallery|art exhibit|exhibit|history center)/.test(q)) return "culture";
  if (/(gym|workout|fitness|lift|exercise)/.test(q)) return "gym";
  if (/(class|study|library|campus|school)/.test(q)) return "study";
  if (/(coffee|cafe|espresso|latte)/.test(q)) return "coffee";
  if (/(night\s*out|bar|club|nightlife)/.test(q)) return "nightout";
  if (/(park|outdoor|walk|hike|trail)/.test(q)) return "outdoors";
  if (/(food|restaurant|eat|lunch|dinner|breakfast|brunch|bite)/.test(q)) return "food";
  return null;
}

function getRadiusForTransport(transportation: string | null): number {
  if (!transportation) return 5000;
  const normalized = transportation.trim().toLowerCase();
  return RADIUS_BY_TRANSPORT[normalized] ?? 5000;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371000 * c;
}

function formatDistance(meters: number): string {
  const miles = meters / 1609.344;
  if (miles < 0.1) {
    const feet = Math.max(100, Math.round(meters * 3.28084));
    return `${feet.toLocaleString("en-US")} ft`;
  }
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

function mapTransportToGoogleMode(transportation: string | null): "driving" | "walking" | "bicycling" | "transit" {
  const normalized = (transportation ?? "").trim().toLowerCase();
  if (normalized === "walking") return "walking";
  if (normalized === "bike" || normalized === "biking" || normalized === "bicycle" || normalized === "bicycling") return "bicycling";
  if (normalized === "transit" || normalized === "public transit") return "transit";
  return "driving";
}

function modeLabelFromGoogleMode(mode: "driving" | "walking" | "bicycling" | "transit"): string {
  if (mode === "walking") return "walk";
  if (mode === "bicycling") return "bike";
  if (mode === "transit") return "transit";
  return "drive";
}

async function fetchTravelEstimate(
  apiKey: string,
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  transportation: string | null,
): Promise<string | null> {
  const mode = mapTransportToGoogleMode(transportation);
  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", `${originLat},${originLng}`);
  url.searchParams.set("destinations", `${destLat},${destLng}`);
  url.searchParams.set("mode", mode);
  url.searchParams.set("units", "imperial");
  if (mode === "driving") {
    url.searchParams.set("departure_time", "now");
    url.searchParams.set("traffic_model", "best_guess");
  }
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) return null;

  const payload = await response.json();
  const element = payload?.rows?.[0]?.elements?.[0];
  if (!element || element.status !== "OK") return null;

  const durationText: string | undefined = mode === "driving"
    ? element.duration_in_traffic?.text ?? element.duration?.text
    : element.duration?.text;
  const distanceText: string | undefined = element.distance?.text;
  if (!durationText || !distanceText) return null;

  return `${durationText} ${modeLabelFromGoogleMode(mode)} (${distanceText})`;
}

function normalizeBudget(value: string | null): number | null {
  if (!value) return null;
  const dollars = value.match(/\$/g)?.length ?? 0;
  return dollars > 0 ? dollars : null;
}

function normalizeLabel(value: string | null | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function zoneMatches(zoneLabel: string | null | undefined, place: any): boolean {
  if (!zoneLabel) return false;
  const zone = normalizeLabel(zoneLabel);
  if (!zone) return false;
  const haystack = [
    place?.name,
    place?.vicinity,
    ...(Array.isArray(place?.types) ? place.types : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(zone);
}

function scorePlace(
  place: any,
  distanceMeters: number,
  radiusMeters: number,
  intent: Intent,
  openNow: boolean | null,
  profile: {
    dietary_restrictions: string[] | null;
    budget: string | null;
    interests: string[] | null;
  },
): { score: number; reason: string } {
  const placeTypes: string[] = place.types ?? [];
  const placeName = (place.name ?? "").toLowerCase();
  const placeVicinity = (place.vicinity ?? "").toLowerCase();

  const distanceScore = Math.max(0, 1 - distanceMeters / radiusMeters);

  const intentCfg = INTENT_CONFIG[intent] ?? INTENT_CONFIG.default;
  const categoryMatch =
    placeTypes.some((t) => intentCfg.types.includes(t)) ||
    intentCfg.types.some((t) => placeName.includes(t.replace("_", " ")))
      ? 1
      : 0.45;

  const userBudget = normalizeBudget(profile.budget);
  const placeBudget = typeof place.price_level === "number" ? place.price_level : null;
  let budgetScore = 0.7;
  if (userBudget != null && placeBudget != null) {
    budgetScore = 1 - Math.min(1, Math.abs(userBudget - placeBudget) / 4);
  }

  const dietary = (profile.dietary_restrictions ?? []).map((d) => d.toLowerCase());
  const hasDietarySignals =
    dietary.length === 0 ||
    dietary.includes("none") ||
    dietary.some((d) => placeName.includes(d) || placeVicinity.includes(d) || placeTypes.join(" ").includes(d));
  const dietaryScore = hasDietarySignals ? 0.95 : 0.6;

  const interests = (profile.interests ?? []).map((i) => i.toLowerCase());
  const interestsScore =
    interests.length === 0
      ? 0.75
      : interests.some((i) => placeName.includes(i) || placeTypes.join(" ").includes(i))
        ? 0.95
        : 0.7;

  const openScore = openNow === true ? 1 : openNow === false ? 0.5 : 0.75;

  const weighted =
    distanceScore * 0.4 +
    openScore * 0.15 +
    categoryMatch * 0.25 +
    dietaryScore * 0.15 +
    budgetScore * 0.1 +
    interestsScore * 0.1;

  const reasonParts: string[] = [];
  if (distanceScore > 0.8) reasonParts.push("Very close to you");
  else if (distanceScore > 0.6) reasonParts.push("Easy to reach");
  if (categoryMatch > 0.8) reasonParts.push("Great match for what you picked");
  if (openNow === false) reasonParts.push("Currently closed; better when it opens");
  if (budgetScore > 0.8) reasonParts.push("Fits your budget");
  if (dietaryScore > 0.8 && dietary.length) reasonParts.push("Aligns with dietary preferences");
  if (interestsScore > 0.85 && interests.length) reasonParts.push("Matches your interests");

  return {
    score: weighted,
    reason: reasonParts[0] ?? "Solid nearby option based on your profile",
  };
}

async function rerankWithGemini(
  apiKey: string,
  intent: Intent,
  query: string,
  profile: {
    interests: string[] | null;
    dietary_restrictions: string[] | null;
    budget: string | null;
    transportation: string | null;
    weekly_schedule_context?: string | null;
  },
  candidates: PlaceResult[],
): Promise<{ orderedIds: string[]; reasonsById: Record<string, string> } | null> {
  if (!apiKey || candidates.length === 0) return null;

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = [
    "You are a local recommendation reranker.",
    "Only rank from provided places. Never invent new places.",
    "Return strict JSON only with keys: ordered_ids, reasons_by_id.",
    "ordered_ids must include only place ids from input.",
    "reasons_by_id values must be short (max 16 words).",
    "If a place is currently closed, the reason should clearly suggest going when it opens.",
    "",
    `Intent: ${intent}`,
    `Query: ${query || "(none)"}`,
    `Transportation: ${profile.transportation ?? "(unknown)"}`,
    `Budget: ${profile.budget ?? "(unknown)"}`,
    `Interests: ${(profile.interests ?? []).join(", ") || "(none)"}`,
    `Dietary: ${(profile.dietary_restrictions ?? []).join(", ") || "(none)"}`,
    `Weekly context: ${profile.weekly_schedule_context ?? "(none)"}`,
    "",
    `Places JSON: ${JSON.stringify(candidates.map((c) => ({
      id: c.id,
      name: c.name,
      category: c.category,
      openNow: c.openNow,
      distance: c.distance,
      matchPct: c.matchPct,
      todayHours: c.todayHours,
    })))}`,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) return null;
  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;
  const parsed = JSON.parse(text);
  const orderedIds = Array.isArray(parsed?.ordered_ids) ? parsed.ordered_ids : [];
  const reasonsById = typeof parsed?.reasons_by_id === "object" && parsed.reasons_by_id
    ? parsed.reasons_by_id
    : {};
  return { orderedIds, reasonsById };
}

async function fetchPlaces(
  apiKey: string,
  lat: number,
  lng: number,
  radius: number,
  intent: Intent,
  query?: string,
): Promise<any[]> {
  const cfg = INTENT_CONFIG[intent] ?? INTENT_CONFIG.default;
  const keyword = query?.trim() || cfg.keyword || "";
  const typeList = cfg.types.length ? cfg.types : ["restaurant"];

  const all: any[] = [];
  for (const placeType of typeList) {
    const url = new URL("https://maps.googleapis.com/maps/api/place/nearbysearch/json");
    url.searchParams.set("location", `${lat},${lng}`);
    url.searchParams.set("radius", String(radius));
    url.searchParams.set("type", placeType);
    if (keyword) url.searchParams.set("keyword", keyword);
    url.searchParams.set("key", apiKey);

    const response = await fetch(url);
    if (!response.ok) continue;
    const payload = await response.json();
    const results = payload?.results ?? [];
    all.push(...results);
  }

  const deduped = new Map<string, any>();
  for (const item of all) {
    if (item?.place_id && !deduped.has(item.place_id)) deduped.set(item.place_id, item);
  }
  return [...deduped.values()];
}

function extractTodayHours(weekdayText: string[] | undefined): string | null {
  if (!weekdayText?.length) return null;
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
  const line = weekdayText.find((entry) => entry.startsWith(`${today}:`));
  if (!line) return null;
  return line.split(": ").slice(1).join(": ").trim() || null;
}

async function fetchPlaceHours(apiKey: string, placeId: string): Promise<{ openNow: boolean | null; todayHours: string | null }> {
  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "current_opening_hours/open_now,current_opening_hours/weekday_text,opening_hours/open_now,opening_hours/weekday_text");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url);
  if (!response.ok) return { openNow: null, todayHours: null };

  const payload = await response.json();
  const details = payload?.result ?? {};
  const currentHours = details.current_opening_hours ?? {};
  const openingHours = details.opening_hours ?? {};

  const openNow =
    typeof currentHours.open_now === "boolean"
      ? currentHours.open_now
      : typeof openingHours.open_now === "boolean"
        ? openingHours.open_now
        : null;

  const todayHours =
    extractTodayHours(currentHours.weekday_text) ??
    extractTodayHours(openingHours.weekday_text);

  return { openNow, todayHours };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, { status: 405 }, corsHeaders);

  const user = await requireUser(req);
  if (!user) return json({ error: "Unauthorized" }, { status: 401 }, corsHeaders);

  const { intent = "default", query = "", limit = 12 }: Body = await req.json().catch(() => ({}));
  const inferredIntent = inferIntentFromQuery(query);
  const effectiveIntent: Intent = inferredIntent ?? intent;

  const apiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!apiKey) return json({ error: "Missing GOOGLE_MAPS_API_KEY secret" }, { status: 500 }, corsHeaders);
  const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

  const admin = adminClient();
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("latitude, longitude, dietary_restrictions, budget, interests, transportation, weekly_schedule_context")
    .eq("user_id", user.id)
    .maybeSingle();

  if (profileError) return json({ error: profileError.message }, { status: 500 }, corsHeaders);
  if (!profile?.latitude || !profile?.longitude) {
    return json({ error: "User location is required before searching nearby places." }, { status: 400 }, corsHeaders);
  }

  const radius = getRadiusForTransport(profile.transportation ?? null);
  const rawPlaces = await fetchPlaces(apiKey, profile.latitude, profile.longitude, radius, effectiveIntent, query);

  const placeIds = rawPlaces.map((p) => p?.place_id).filter(Boolean) as string[];
  const placeNames = rawPlaces.map((p) => p?.name).filter(Boolean) as string[];
  const affinityFilters = [
    placeIds.length ? `place_id.in.(${placeIds.join(",")})` : "",
    placeNames.length ? `place_name.in.(${placeNames.map((n) => `"${String(n).replaceAll('"', '""')}"`).join(",")})` : "",
  ].filter(Boolean);
  const { data: affinities } = affinityFilters.length
    ? await admin
      .from("user_place_affinities")
      .select("place_id, place_name, affinity_score")
      .eq("user_id", user.id)
      .or(affinityFilters.join(","))
    : { data: [] };

  const { data: zoneAffinities } = await admin
    .from("user_zone_affinities")
    .select("zone_label, zone_score")
    .eq("user_id", user.id)
    .order("zone_score", { ascending: false })
    .limit(1);
  const topZoneLabel = zoneAffinities?.[0]?.zone_label ?? null;

  const affinityByPlace = new Map<string, number>();
  let maxAffinity = 0;
  for (const row of affinities ?? []) {
    const key = row.place_id ?? row.place_name ?? "";
    if (!key) continue;
    const score = Number(row.affinity_score ?? 0);
    affinityByPlace.set(String(key), score);
    if (score > maxAffinity) maxAffinity = score;
  }

  const preRanked = rawPlaces
    .map((place) => {
      const isOpenNow = typeof place?.opening_hours?.open_now === "boolean"
        ? place.opening_hours.open_now
        : null;

      const lat = place?.geometry?.location?.lat;
      const lng = place?.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return null;
      const dist = haversineMeters(profile.latitude, profile.longitude, lat, lng);
      if (dist > radius) return null;
      const { score, reason } = scorePlace(place, dist, radius, effectiveIntent, isOpenNow, {
        dietary_restrictions: profile.dietary_restrictions,
        budget: profile.budget,
        interests: profile.interests,
      });
      const affinityRaw =
        affinityByPlace.get(place.place_id) ??
        affinityByPlace.get(place.name) ??
        0;
      const affinityBoost = maxAffinity > 0 ? Math.min(0.25, (affinityRaw / maxAffinity) * 0.25) : 0;
      const zoneBoost = zoneMatches(topZoneLabel, place) ? 0.08 : 0;
      const finalScore = score + affinityBoost + zoneBoost;
      const categoryLabel =
        place.types?.[0]?.replaceAll("_", " ").replace(/\b\w/g, (c: string) => c.toUpperCase()) ??
        INTENT_CONFIG[effectiveIntent]?.categoryLabel ??
        "Nearby";

      const item: PlaceResult = {
        id: place.place_id,
        name: place.name ?? "Unknown place",
        category: categoryLabel,
        reason: isOpenNow === false
          ? "Currently closed — plan this for opening hours."
          : affinityBoost > 0.1
          ? "Based on places you interact with often"
          : zoneBoost > 0
            ? `Strong match for your ${topZoneLabel} routine`
            : reason,
        distance: formatDistance(dist),
        matchPct: Math.max(55, Math.min(99, Math.round(finalScore * 100))),
        openNow: isOpenNow,
        todayHours: null,
        latitude: lat,
        longitude: lng,
      };
      return { item, score: finalScore };
    })
    .filter((v): v is { item: PlaceResult; score: number } => Boolean(v))
    .sort((a, b) => b.score - a.score);

  // Fetch hours for best candidates.
  const detailCandidates = preRanked.slice(0, Math.max(10, Math.min(limit * 2, 30)));
  const withHours = await Promise.all(
    detailCandidates.map(async (entry) => {
      const hours = await fetchPlaceHours(apiKey, entry.item.id);
      const openNow = hours.openNow ?? entry.item.openNow;
      const original = rawPlaces.find((p) => p?.place_id === entry.item.id);
      const destLat = original?.geometry?.location?.lat;
      const destLng = original?.geometry?.location?.lng;
      const travelEstimate =
        typeof destLat === "number" && typeof destLng === "number"
          ? await fetchTravelEstimate(
            apiKey,
            profile.latitude,
            profile.longitude,
            destLat,
            destLng,
            profile.transportation ?? null,
          )
          : null;
      return {
        ...entry,
        item: {
          ...entry.item,
          distance: travelEstimate ?? entry.item.distance,
          openNow,
          todayHours: hours.todayHours,
          reason: openNow === false
            ? hours.todayHours
              ? `Currently closed. Consider going during: ${hours.todayHours}`
              : "Currently closed. Consider checking hours and going when it opens."
            : entry.item.reason,
        },
      };
    }),
  );

  const ranked = withHours
    .filter((v): v is { item: PlaceResult; score: number } => Boolean(v))
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map((v) => v.item);

  const rerankCandidates = ranked.slice(0, Math.min(10, ranked.length));
  const llmResult = await rerankWithGemini(
    geminiApiKey,
    intent,
    query,
    {
      interests: profile.interests,
      dietary_restrictions: profile.dietary_restrictions,
      budget: profile.budget,
      transportation: profile.transportation,
      weekly_schedule_context: profile.weekly_schedule_context,
    },
    rerankCandidates,
  );

  let finalResults = ranked;
  if (llmResult && llmResult.orderedIds.length) {
    const byId = new Map(ranked.map((r) => [r.id, r]));
    const ordered = llmResult.orderedIds
      .map((id) => byId.get(id))
      .filter((r): r is PlaceResult => Boolean(r))
      .map((r) => ({
        ...r,
        reason: llmResult.reasonsById[r.id] ?? r.reason,
      }));
    const missing = ranked.filter((r) => !ordered.some((o) => o.id === r.id));
    finalResults = [...ordered, ...missing];
  }

  return json({ results: finalResults, radius_meters: radius, intent: effectiveIntent }, { status: 200 }, corsHeaders);
});
