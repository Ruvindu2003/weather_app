// API client functions for weather data

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7000';

export async function getAllWeather() {
    const response = await fetch(`${API_BASE_URL}/weather`);

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function getWeatherById(cityId: number) {
    const response = await fetch(`${API_BASE_URL}/weather/${cityId}`);

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

export async function getCacheStatus() {
    const response = await fetch(`${API_BASE_URL}/weather/cache`);

    if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}
