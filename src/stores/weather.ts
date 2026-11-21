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

  async function load() {
    status.value = 'loading'
    errorMessage.value = ''
    try {
      data.value = await fetchWeather(settings.prefs.weatherCity)
      status.value = 'success'
    } catch (e) {
      errorMessage.value = e instanceof Error ? e.message : '天气加载失败'
      status.value = 'error'
    }
  }

  function changeCity(city: string) {
    settings.set('weatherCity', city)
    load()
  }

  return { status, data, errorMessage, load, changeCity }
})
