import Constants from 'expo-constants';

type WeatherSummary = {
  time: string;
  airTemperatureC: number | null;
  windSpeedMs: number | null;
  precipitationMmH: number | null;
};

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function getExtra() {
  const expoConfig = Constants.expoConfig ?? (Constants as any).manifest2?.extra ?? (Constants as any).manifest?.extra;
  const extra = (expoConfig?.extra ?? expoConfig) as Record<string, unknown> | undefined;
  return extra ?? {};
}

async function demoDelay(extra: Record<string, unknown>) {
  const raw = extra.DEMO_API_DELAY_MS;
  const ms = raw === '' || raw == null ? 20000 : Number(raw);
  if (!Number.isFinite(ms) || ms <= 0) return;
  await sleep(ms);
}

async function geocode(destination: string): Promise<{ lat: number; lng: number; name: string } | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: Array<{ latitude: number; longitude: number; name: string }> };
  const first = data.results?.[0];
  if (!first) return null;
  return { lat: first.latitude, lng: first.longitude, name: first.name };
}

function pickSourceValue(obj: any): number | null {
  if (!obj || typeof obj !== 'object') return null;
  for (const k of Object.keys(obj)) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

export async function getNextTripWeather(destination: string, startDateIso: string): Promise<WeatherSummary | null> {
  const extra = getExtra();
  const apiKey = String(extra.STORMGLASS_API_KEY ?? '');
  if (!apiKey) throw new Error('Missing STORMGLASS_API_KEY');

  await demoDelay(extra);
  const place = await geocode(destination);
  if (!place) return null;

  const start = `${startDateIso}T12:00:00Z`;
  const ts = Math.floor(new Date(start).getTime() / 1000);
  const params = ['airTemperature', 'windSpeed', 'precipitation'].join(',');
  const url = new URL('https://api.stormglass.io/v2/weather/point');
  url.searchParams.set('lat', String(place.lat));
  url.searchParams.set('lng', String(place.lng));
  url.searchParams.set('params', params);
  url.searchParams.set('start', String(ts));
  url.searchParams.set('end', String(ts));

  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  const hour = data?.hours?.[0];
  if (!hour) return null;

  return {
    time: String(hour.time ?? start),
    airTemperatureC: pickSourceValue(hour.airTemperature),
    windSpeedMs: pickSourceValue(hour.windSpeed),
    precipitationMmH: pickSourceValue(hour.precipitation),
  };
}

export async function getTripWeatherToday(destination: string): Promise<WeatherSummary | null> {
  const extra = getExtra();
  const apiKey = String(extra.STORMGLASS_API_KEY ?? '');
  if (!apiKey) throw new Error('Missing STORMGLASS_API_KEY');

  await demoDelay(extra);
  const place = await geocode(destination);
  if (!place) return null;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 0, 0, 0);

  const startTs = Math.floor(start.getTime() / 1000);
  const endTs = Math.floor(end.getTime() / 1000);

  const params = ['airTemperature', 'windSpeed', 'precipitation'].join(',');
  const url = new URL('https://api.stormglass.io/v2/weather/point');
  url.searchParams.set('lat', String(place.lat));
  url.searchParams.set('lng', String(place.lng));
  url.searchParams.set('params', params);
  url.searchParams.set('start', String(startTs));
  url.searchParams.set('end', String(endTs));

  const res = await fetch(url.toString(), { headers: { Authorization: apiKey } });
  if (!res.ok) return null;
  const data = (await res.json()) as any;
  const hours: any[] = Array.isArray(data?.hours) ? data.hours : [];
  if (hours.length === 0) return null;

  const nowTs = now.getTime();
  let best = hours[0];
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const h of hours) {
    const t = typeof h?.time === 'string' ? Date.parse(h.time) : NaN;
    if (!Number.isFinite(t)) continue;
    const diff = Math.abs(t - nowTs);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = h;
    }
  }

  return {
    time: String(best.time ?? now.toISOString()),
    airTemperatureC: pickSourceValue(best.airTemperature),
    windSpeedMs: pickSourceValue(best.windSpeed),
    precipitationMmH: pickSourceValue(best.precipitation),
  };
}

