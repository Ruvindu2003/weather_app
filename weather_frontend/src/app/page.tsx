"use client";

import WeatherDashboard from "@/component/weatherDashboard";
import CitySearch from "@/component/citySearch";

export default function Home() {
  return (
    <div className="app-container">
      <div className="main-card-wrapper">
        <h1 className="main-title">🌍 Weather App</h1>
        <p style={{ textAlign: 'center', color: '#666', marginBottom: '2rem' }}>
          Real-time weather data with comfort scores
        </p>
        <CitySearch />
        <WeatherDashboard />
      </div>
    </div>
  );
}