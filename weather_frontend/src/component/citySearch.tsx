"use client";

import { useState } from "react";
import { getWeatherById } from "@/lib/api";

interface WeatherData {
    CityCode: number;
    name: string;
    weatherDescription: string;
    temperatureC: number;
    temperatureK: number;
    comfortScore: number;
    components: {
        tempC: number;
        tempScore: number;
        humidity: number;
        humidityScore: number;
        wind: number;
        windScore: number;
        clouds: number;
        cloudScore: number;
    };
    cacheHit: boolean;
}

// City codes mapping
const CITIES = [
    { code: 2643743, name: "London" },
    { code: 5128581, name: "New York" },
    { code: 1850147, name: "Tokyo" },
    { code: 2147714, name: "Sydney" },
    { code: 2988507, name: "Paris" },
    { code: 524901, name: "Moscow" },
    { code: 360630, name: "Cairo" },
    { code: 3448439, name: "Sao Paulo" },
    { code: 1275339, name: "Mumbai" },
    { code: 6167865, name: "Toronto" },
];

export default function CitySearch() {
    const [selectedCity, setSelectedCity] = useState<string>("");
    const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSearch() {
        if (!selectedCity) {
            setError("Please select a city");
            return;
        }

        try {
            setLoading(true);
            setError(null);

            const cityCode = parseInt(selectedCity);
            const data = await getWeatherById(cityCode);
            setWeatherData(data);
        } catch (err) {
            console.error('Error fetching city weather:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch city data');
            setWeatherData(null);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="city-search">
            <div className="search-header">
                <h3>🔍 Search City Weather</h3>
            </div>

            <div className="search-controls">
                <select
                    value={selectedCity}
                    onChange={(e) => setSelectedCity(e.target.value)}
                    className="city-select"
                >
                    <option value="">Select a city...</option>
                    {CITIES.map((city) => (
                        <option key={city.code} value={city.code}>
                            {city.name}
                        </option>
                    ))}
                </select>

                <button
                    onClick={handleSearch}
                    disabled={!selectedCity || loading}
                    className="search-button"
                >
                    {loading ? "Searching..." : "Search"}
                </button>
            </div>

            {error && (
                <div className="search-error">
                    <p>❌ {error}</p>
                </div>
            )}

            {weatherData && (
                <div className="search-result">
                    <div className="result-header">
                        <h4>{weatherData.name}</h4>
                        {weatherData.cacheHit && <span className="cache-badge">📦 Cached</span>}
                    </div>

                    <div className="result-score">
                        <div className="score-display">
                            <span className="score-big">{weatherData.comfortScore}</span>
                            <span className="score-max">/100</span>
                        </div>
                        <p className="score-label">Comfort Score</p>
                    </div>

                    <div className="result-main">
                        <div className="temp-display">
                            <span className="temp-value">{weatherData.temperatureC}°C</span>
                            <span className="temp-description">{weatherData.weatherDescription}</span>
                        </div>
                    </div>

                    <div className="result-details">
                        <div className="detail-box">
                            <span className="detail-icon">🌡️</span>
                            <div className="detail-info">
                                <span className="detail-label">Temperature</span>
                                <span className="detail-value">{weatherData.components.tempC}°C</span>
                                <span className="detail-score">Score: {weatherData.components.tempScore}</span>
                            </div>
                        </div>

                        <div className="detail-box">
                            <span className="detail-icon">💧</span>
                            <div className="detail-info">
                                <span className="detail-label">Humidity</span>
                                <span className="detail-value">{weatherData.components.humidity}%</span>
                                <span className="detail-score">Score: {weatherData.components.humidityScore}</span>
                            </div>
                        </div>

                        <div className="detail-box">
                            <span className="detail-icon">💨</span>
                            <div className="detail-info">
                                <span className="detail-label">Wind</span>
                                <span className="detail-value">{weatherData.components.wind} m/s</span>
                                <span className="detail-score">Score: {weatherData.components.windScore}</span>
                            </div>
                        </div>

                        <div className="detail-box">
                            <span className="detail-icon">☁️</span>
                            <div className="detail-info">
                                <span className="detail-label">Clouds</span>
                                <span className="detail-value">{weatherData.components.clouds}%</span>
                                <span className="detail-score">Score: {weatherData.components.cloudScore}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
