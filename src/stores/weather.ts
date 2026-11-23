import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchWeather, type WeatherBundle } from '@/services/openMeteo'
import { useSettingsStore } from './settings'

export type WeatherStatus = 'idle' | 'loading' | 'success' | 'error'

export const useWeatherStore = defineStore('weather', () => {
  const settings = useSettingsStore()
  const status = ref<WeatherStatus>('idle')
  const data = ref<WeatherBundle | null>(null)
  const errorMessage = ref('')
  const updatedAt = ref<number | null>(null)
  let requestId = 0

  async function load() {
    const id = ++requestId
    const city = settings.prefs.weatherCity
    status.value = 'loading'
    errorMessage.value = ''
    try {
      const result = await fetchWeather(city)
      if (id !== requestId) return
      data.value = result
      updatedAt.value = Date.now()
      status.value = 'success'
    } catch (e) {
      if (id !== requestId) return
      errorMessage.value = e instanceof Error ? e.message : '天气加载失败'
      status.value = 'error'
    }
  }

  function changeCity(city: string) {
    settings.set('weatherCity', city)
    load()
  }

  return { status, data, errorMessage, updatedAt, load, changeCity }
})
