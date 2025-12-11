import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { WeatherService } from './weather.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('weather')
export class WeatherController {
  constructor(private readonly weatherService: WeatherService) { }

  @Get()
  async getAll() {
    const res = await this.weatherService.getAllWeather();
    return { data: res.data, cacheHit: res.cacheHit };
  }

  @Get('cache')
  cacheStatus() {
    return this.weatherService.getCacheStatus();
  }

  @Get(':id')
  async getById(@Param('id') id: string) {
    const cityId = parseInt(id, 10);
    if (Number.isNaN(cityId)) throw new NotFoundException('Invalid city id');
    // find city in list
    const all = await this.weatherService.getAllWeather();
    const found = (all.data as any[]).find((c) => c.CityCode === cityId || c.id === cityId);
    if (found) return found;

    // fallback: try fetching single city
    try {
      const city = { CityCode: cityId };
      const res = await this.weatherService.getWeatherForCity(city);
      const processed = this.weatherService['computeComfortScore'](res.data);
      return {
        CityCode: cityId,
        name: res.data.name,
        weatherDescription: res.data.weather?.[0]?.description ?? null,
        temperatureK: res.data.main?.temp,
        temperatureC: Math.round((res.data.main?.temp - 273.15) * 10) / 10,
        comfortScore: processed.score,
        components: processed.components,
        cacheHit: res.cacheHit,
      };
    } catch (err) {
      throw new NotFoundException((err as any).message);
    }
  }
}
