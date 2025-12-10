import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as process from "node:process";
import * as https from 'node:https';

type RawCacheEntry = {
  data: any;
  fetchedAt: number; // epoch ms
};

type ProcessedCacheEntry = {
  data: any;
  cachedAt: number;
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private cities: Array<{ CityCode: number; name?: string }> = [];
  private rawCache = new Map<number, RawCacheEntry>();
  private processedCache: ProcessedCacheEntry | null = null;
  private RAW_TTL = 1000 * 60 * 5; // 5 minutes
  private PROCESSED_TTL = 1000 * 60; // 1 minute

  constructor() {
    this.loadCities();
  }

  private loadCities() {
    const filePath = path.join(__dirname, '../..', 'src/cities.json');
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const parsed = JSON.parse(content);
      this.cities = parsed.map((c: any) => ({ CityCode: c.CityCode, name: c.name }));
      this.logger.log(`Loaded ${this.cities.length} cities`);
    } catch (err) {
      this.logger.error('Failed to load cities.json', err as any);
      this.cities = [];
    }
  }

  private getOpenWeatherKey(): string {
    const key = process.env.OPENWEATHER_API_KEY || '';
    if (!key) throw new Error('OPENWEATHER_API_KEY not set in environment');
    return key;
  }

  private async fetchWeatherFromAPI(cityId: number) {
    const key = this.getOpenWeatherKey();
    const base = process.env.OPENWEATHER_URL || 'https://api.openweathermap.org/data/2.5/weather';
    const url = `${base}?id=${cityId}&appid=${key}`;
    this.logger.log(`Fetching weather for ${cityId} from OpenWeatherMap: ${url}`);

    // If global fetch is available (Node 18+), use it. Otherwise fall back to node:https
    if (typeof (globalThis as any).fetch === 'function') {
      const res = await (globalThis as any).fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`OpenWeather API error ${res.status}: ${text}`);
      }
      return await res.json();
    }

    // Fallback using node:https
    return await new Promise<any>((resolve, reject) => {
      try {
        const req = https.get(url, (res) => {
          const { statusCode } = res;
          const chunks: Uint8Array[] = [];
          res.on('data', (chunk) => chunks.push(chunk));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            if (!statusCode || statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`OpenWeather API error ${statusCode}: ${body}`));
            }
            try {
              const parsed = JSON.parse(body);
              resolve(parsed);
            } catch (err) {
              reject(new Error('Failed to parse OpenWeather response: ' + (err as any).message));
            }
          });
        });
        req.on('error', (err) => reject(err));
        // safety timeout
        req.setTimeout(10000, () => {
          req.destroy(new Error('OpenWeather request timed out'));
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  private isRawCacheValid(entry?: RawCacheEntry) {
    if (!entry) return false;
    return Date.now() - entry.fetchedAt < this.RAW_TTL;
  }

  private isProcessedCacheValid() {
    if (!this.processedCache) return false;
    return Date.now() - this.processedCache.cachedAt < this.PROCESSED_TTL;
  }

  private kelvinToCelsius(k: number) {
    return k - 273.15;
  }

  public computeComfortScore(weather: any) {
    // Inputs: temperature (K), humidity (%), wind.speed (m/s), clouds.all (%)
    const tempK = weather?.main?.temp ?? 0;
    const tempC = this.kelvinToCelsius(tempK);
    const humidity = weather?.main?.humidity ?? 0;
    const wind = weather?.wind?.speed ?? 0;
    const clouds = weather?.clouds?.all ?? 0;

    // Subscores (0-100)
    // Temperature: ideal 22°C, penalize linearly
    const tempDiff = Math.abs(tempC - 22);
    const tempScore = Math.max(0, 100 - tempDiff * 4); // each degree away costs 4 points

    // Humidity: ideal 50%
    const humidityScore = Math.max(0, 100 - Math.abs(humidity - 50) * 1.5);

    // Wind: ideal calm (0-3 m/s). above 3 penalized.
    const windPenalty = Math.max(0, wind - 3);
    const windScore = Math.max(0, 100 - windPenalty * 20);

    // Clouds: ideal clear ~20%
    const cloudDiff = Math.abs(clouds - 20);
    const cloudScore = Math.max(0, 100 - cloudDiff * 0.8);

    // Weighted aggregate
    const score =
      tempScore * 0.4 + humidityScore * 0.3 + windScore * 0.2 + cloudScore * 0.1;

    // Clamp 0-100 and round
    const finalScore = Math.max(0, Math.min(100, Math.round(score)));

    return {
      score: finalScore,
      components: {
        tempC: Math.round(tempC * 10) / 10,
        tempScore: Math.round(tempScore),
        humidity,
        humidityScore: Math.round(humidityScore),
        wind,
        windScore: Math.round(windScore),
        clouds,
        cloudScore: Math.round(cloudScore),
      },
    };
  }

  async getWeatherForCity(city: { CityCode: number; name?: string }) {
    const id = city.CityCode;

    const rawEntry = this.rawCache.get(id);
    if (this.isRawCacheValid(rawEntry)) {
      return { data: rawEntry!.data, cacheHit: true };
    }

    // fetch and cache
    const data = await this.fetchWeatherFromAPI(id);
    this.rawCache.set(id, { data, fetchedAt: Date.now() });
    return { data, cacheHit: false };
  }

  async getAllWeather() {
    // Return processed cache when valid
    if (this.isProcessedCacheValid()) {
      return { data: this.processedCache!.data, cacheHit: true };
    }

    // Ensure API key is present before attempting fetches
    const key = process.env.OPENWEATHER_API_KEY || '';
    if (!key) {
      this.logger.warn('OPENWEATHER_API_KEY is not set; cannot fetch weather data');
      return { data: [], cacheHit: false, error: 'OPENWEATHER_API_KEY not set in environment' };
    }

    // Ensure local cities list is loaded (from src/cities.json)
    if (!this.cities || this.cities.length === 0) {
      this.logger.log('Cities list empty, attempting to reload from local file');
      this.loadCities();
    }

    if (!this.cities || this.cities.length === 0) {
      this.logger.warn('No cities available after loading local file, returning empty list');
      this.processedCache = { data: [], cachedAt: Date.now() };
      return { data: [], cacheHit: false };
    }

    const results: any[] = [];

    // Loop sequentially through cities and collect processed entries
    for (const c of this.cities) {
      try {
        const res = await this.getWeatherForCity(c);
        if (!res || !res.data) throw new Error('no weather data returned');

        const processed = this.computeComfortScore(res.data);
        results.push({
          CityCode: c.CityCode,
          name: c.name ?? res.data.name,
          weatherDescription: res.data.weather?.[0]?.description ?? null,
          temperatureK: res.data.main?.temp,
          temperatureC: Math.round(this.kelvinToCelsius(res.data.main?.temp ?? 0) * 10) / 10,
          comfortScore: processed.score,
          components: processed.components,
          cacheHit: res.cacheHit,
        });
      } catch (err) {
        this.logger.warn(`Failed to fetch/process city ${c.CityCode}: ${(err as any).message}`);
        results.push({
          CityCode: c.CityCode,
          name: c.name,
          error: (err as any).message ?? 'unknown error',
        });
      }
    }

    // sort by comfortScore descending (most comfortable first)
    const ranked = results
      .filter((r: any) => typeof r.comfortScore === 'number')
      .sort((a: any, b: any) => b.comfortScore - a.comfortScore)
      .map((r: any, idx: number) => ({ ...r, rank: idx + 1 }));

    const errors = results.filter((r: any) => typeof r.comfortScore !== 'number');
    const combined = [...ranked, ...errors];

    this.processedCache = { data: combined, cachedAt: Date.now() };
    return { data: combined, cacheHit: false };
  }

  getCacheStatus() {
    const entries = Array.from(this.rawCache.entries()).map(([cityId, entry]) => ({
      cityId,
      fetchedAt: entry.fetchedAt,
      expiresAt: entry.fetchedAt + this.RAW_TTL,
      ttlMs: Math.max(0, entry.fetchedAt + this.RAW_TTL - Date.now()),
    }));

    return {
      rawCacheCount: this.rawCache.size,
      rawEntries: entries,
      processedCache: this.processedCache
        ? { cachedAt: this.processedCache.cachedAt, expiresAt: this.processedCache.cachedAt + this.PROCESSED_TTL, ttlMs: Math.max(0, this.processedCache.cachedAt + this.PROCESSED_TTL - Date.now()) }
        : null,
    };
  }
}
