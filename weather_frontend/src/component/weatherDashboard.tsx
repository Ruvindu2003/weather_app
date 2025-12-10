"use client";

import { useEffect, useState } from "react";
import { getAllWeather } from "@/lib/api";

interface WeatherData {
    CityCode: number;
    name: string;
    weatherDescription: string;
    temperatureC: number;
    comfortScore: number;
    rank: number;
    components: {
        tempC: number;
        humidity: number;
        wind: number;
        clouds: number;
    };
    cacheHit: boolean;
}

export default function WeatherDashboard() {
    const [weather, setWeather] = useState<WeatherData[] | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchWeather();
    }, []);

    async function fetchWeather() {
        try {
            setLoading(true);
            setError(null);

            // Use the API client function
            const result = await getAllWeather();
            setWeather(result.data);
        } catch (err) {
            console.error('Error fetching weather:', err);
            setError(err instanceof Error ? err.message : 'Failed to fetch weather data');
        } finally {
            setLoading(false);
        }
    }

    if (loading) {
        return (
            <div className="weather-dashboard">
                <div className="loading">
                    <div className="spinner"></div>
                    <p>Loading weather data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="weather-dashboard">
                <div className="error">
                    <h3>⚠️ Error</h3>
                    <p>{error}</p>
                    <button onClick={fetchWeather} className="retry-button">
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    if (!weather || weather.length === 0) {
        return (
            <div className="weather-dashboard">
                <p>No weather data available</p>
            </div>
        );
    }

    return (
        <div className="weather-dashboard">
            <div className="dashboard-header">
                <h2>🌍 Weather Comfort Rankings</h2>
                <button onClick={fetchWeather} className="refresh-button">
                    🔄 Refresh
                </button>
            </div>

            <div className="cities-grid">
                {weather.map((city) => (
                    <div key={city.CityCode} className="city-card">
                        <div className="city-rank">#{city.rank}</div>
                        <h3 className="city-name">{city.name}</h3>

                        <div className="comfort-score">
                            <div className="score-circle" style={{
                                background: `conic-gradient(#4CAF50 ${city.comfortScore}%, #e0e0e0 ${city.comfortScore}%)`
                            }}>
                                <div className="score-inner">
                                    <span className="score-value">{city.comfortScore}</span>
                                    <span className="score-label">/100</span>
                                </div>
                            </div>
                            <p className="score-title">Comfort Score</p>
                        </div>

                        <div className="weather-info">
                            <div className="weather-main">
                                <span className="temperature">{city.temperatureC}°C</span>
                                <span className="description">{city.weatherDescription}</span>
                            </div>

                            <div className="weather-details">
                                <div className="detail-item">
                                    <span className="detail-icon">💧</span>
                                    <span className="detail-value">{city.components.humidity}%</span>
                                    <span className="detail-label">Humidity</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">💨</span>
                                    <span className="detail-value">{city.components.wind} m/s</span>
                                    <span className="detail-label">Wind</span>
                                </div>
                                <div className="detail-item">
                                    <span className="detail-icon">☁️</span>
                                    <span className="detail-value">{city.components.clouds}%</span>
                                    <span className="detail-label">Clouds</span>
                                </div>
                            </div>
                        </div>

                        {city.cacheHit && (
                            <div className="cache-badge">📦 Cached</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
