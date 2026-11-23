export interface CurrentWeather {
  temperature: number
  weatherCode: number
}

export interface DailyForecast {
  date: string
  weatherCode: number
  max: number
  min: number
}

export interface WeatherBundle {
  city: string
  current: CurrentWeather
  daily: DailyForecast[]
}

const WEATHER_TEXT: Record<number, string> = {
  0: '晴',
  1: '大致晴朗',
  2: '多云',
  3: '阴',
  45: '雾',
  48: '雾凇',
  51: '小毛雨',
  53: '毛雨',
  55: '大毛雨',
  56: '冻毛雨',
  57: '强冻毛雨',
  61: '小雨',
  63: '中雨',
  65: '大雨',
  66: '冻雨',
  67: '强冻雨',
  71: '小雪',
  73: '中雪',
  75: '大雪',
  77: '雪粒',
  80: '小阵雨',
  81: '中阵雨',
  82: '大阵雨',
  85: '小阵雪',
  86: '大阵雪',
  95: '雷阵雨',
  96: '雷阵雨伴冰雹',
  99: '强雷阵雨伴冰雹',
}

export function weatherText(code: number): string {
  return WEATHER_TEXT[code] ?? '未知'
}

/**
 * 通过 Open-Meteo 获取天气（免费、无需 API Key）：
 * 地理编码 + 当前天气 + 未来 6 天预报
 */
export async function fetchWeather(city: string): Promise<WeatherBundle> {
  const geoUrl =
    'https://geocoding-api.open-meteo.com/v1/search?name=' +
    encodeURIComponent(city) +
    '&count=1&language=zh&format=json'
  const geoRes = await fetch(geoUrl)
  if (!geoRes.ok) throw new Error('城市查询失败，请稍后重试')
  const geo = (await geoRes.json()) as {
    results?: { name: string; latitude: number; longitude: number }[]
  }
  const loc = geo.results?.[0]
  if (!loc) throw new Error(`未找到城市「${city}」`)

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}` +
    '&current=temperature_2m,weather_code' +
    '&daily=weather_code,temperature_2m_max,temperature_2m_min' +
    '&forecast_days=8&timezone=auto'
  const res = await fetch(url)
  if (!res.ok) throw new Error('天气请求失败，请稍后重试')
  const d = (await res.json()) as {
    current: { temperature_2m: number; weather_code: number }
    daily: {
      time: string[]
      weather_code: number[]
      temperature_2m_max: number[]
      temperature_2m_min: number[]
    }
  }

  const daily: DailyForecast[] = d.daily.time.map((t, i) => ({
    date: t,
    weatherCode: d.daily.weather_code[i]!,
    max: Math.round(d.daily.temperature_2m_max[i]!),
    min: Math.round(d.daily.temperature_2m_min[i]!),
  }))

  return {
    city: loc.name,
    current: {
      temperature: Math.round(d.current.temperature_2m),
      weatherCode: d.current.weather_code,
    },
    daily,
  }
}
