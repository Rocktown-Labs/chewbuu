export interface LocationWeatherResult {
  city: string;
  lat: number;
  lon: number;
  weatherText: string;
}

export async function getLocationWeatherFromCoords(
  lat: number,
  lon: number
): Promise<LocationWeatherResult> {
  try {
    // Reverse geocode lat/lon to city name via Nominatim
    const geoRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
      {
        headers: {
          "User-Agent": "ChewbuuDatingApp/1.0",
        },
      }
    );

    let city = "Searcy, AR";
    if (geoRes.ok) {
      const geoData = (await geoRes.json()) as {
        address?: {
          city?: string;
          town?: string;
          village?: string;
          county?: string;
          state?: string;
        };
      };
      const name =
        geoData.address?.city ||
        geoData.address?.town ||
        geoData.address?.village ||
        geoData.address?.county ||
        "Searcy";
      const state = geoData.address?.state || "AR";
      city = `${name}, ${state}`;
    }

    // Fetch live weather from Open-Meteo
    const weatherRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`
    );

    let weatherText = `☀️ 76°F · Clear & Sunny in ${city}`;
    if (weatherRes.ok) {
      const weatherData = (await weatherRes.json()) as {
        current?: { temperature_2m?: number; weather_code?: number };
      };
      const tempC = weatherData.current?.temperature_2m ?? 24;
      const tempF = Math.round((tempC * 9) / 5 + 32);
      const code = weatherData.current?.weather_code ?? 0;

      let condition = "Clear & Sunny";
      let icon = "☀️";
      if (code >= 1 && code <= 3) {
        condition = "Partly Cloudy";
        icon = "⛅";
      } else if (code >= 45 && code <= 48) {
        condition = "Foggy";
        icon = "🌫️";
      } else if (code >= 51 && code <= 67) {
        condition = "Light Rain";
        icon = "🌧️";
      } else if (code >= 80 && code <= 99) {
        condition = "Showers & Storms";
        icon = "🌩️";
      }

      weatherText = `${icon} ${tempF}°F · ${condition} in ${city}`;
    }

    return { city, lat, lon, weatherText };
  } catch {
    return {
      city: "Searcy, AR",
      lat: 35.2506,
      lon: -91.7362,
      weatherText: "☀️ 76°F · Clear & Sunny in Searcy, AR",
    };
  }
}

export async function getLocationWeatherFromCityName(
  query: string
): Promise<LocationWeatherResult> {
  try {
    const searchRes = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "ChewbuuDatingApp/1.0",
        },
      }
    );

    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        display_name?: string;
        lat?: string;
        lon?: string;
      }[];
      if (searchData.length > 0 && searchData[0].lat && searchData[0].lon) {
        const lat = Number(searchData[0].lat);
        const lon = Number(searchData[0].lon);
        // Format city string
        const parts = query.split(",");
        const formattedCity =
          parts.length >= 2
            ? `${parts[0].trim()}, ${parts[1].trim().toUpperCase()}`
            : query.trim();

        const result = await getLocationWeatherFromCoords(lat, lon);
        return {
          ...result,
          city: formattedCity,
        };
      }
    }
  } catch {
    // Fallback
  }

  return {
    city: query,
    lat: 35.2506,
    lon: -91.7362,
    weatherText: `☀️ 76°F · Clear & Sunny in ${query}`,
  };
}
