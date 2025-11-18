import React, { useEffect, useState } from 'react';
import { DynamicIcon } from './Icons';

interface WeatherData {
  temperature: number;
  weatherCode: number;
}

const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setError(true);
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Fetch from Open-Meteo (Free, no API key required)
          const response = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
          );
          
          if (!response.ok) throw new Error('Weather fetch failed');
          
          const data = await response.json();
          setWeather({
            temperature: Math.round(data.current.temperature_2m),
            weatherCode: data.current.weather_code
          });
        } catch (err) {
          console.error(err);
          setError(true);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.warn("Geolocation access denied or failed", err);
        setError(true);
        setLoading(false);
      }
    );
  }, []);

  // WMO Weather interpretation code
  const getWeatherIcon = (code: number): string => {
    if (code === 0) return 'Sun';
    if (code >= 1 && code <= 3) return 'CloudSun';
    if (code >= 45 && code <= 48) return 'Cloud';
    if (code >= 51 && code <= 67) return 'CloudRain'; // Drizzle & Rain
    if (code >= 71 && code <= 77) return 'CloudSnow'; // Snow
    if (code >= 80 && code <= 82) return 'CloudRain'; // Showers
    if (code >= 85 && code <= 86) return 'CloudSnow'; // Snow Showers
    if (code >= 95) return 'CloudLightning'; // Thunderstorm
    return 'Sun';
  };

  if (loading) return <div className="h-8 w-24 bg-white/5 animate-pulse rounded-full"></div>;
  if (error) return null; // Hide on error to keep it minimal
  if (!weather) return null;

  const iconName = getWeatherIcon(weather.weatherCode);

  return (
    <div className="flex items-center gap-2 text-slate-300 bg-slate-800/50 px-3 py-1.5 rounded-full border border-white/5 hover:bg-slate-800 hover:border-white/10 transition-colors cursor-default backdrop-blur-sm">
      <DynamicIcon name={iconName} className="w-4 h-4 text-amber-400" />
      <span className="text-sm font-medium">{weather.temperature}°F</span>
    </div>
  );
};

export default WeatherWidget;