import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
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
  let cachedKey = ''
  const requestedCity = ref('')
  const showingOldCity = computed(() => !!data.value && cachedKey !== JSON.stringify([settings.prefs.weatherCity, settings.prefs.weatherLocation?.latitude, settings.prefs.weatherLocation?.longitude]))
  let pendingCity = ''
  let pending: Promise<void> | null = null

  async function load(force = false) {
    const city = settings.prefs.weatherCity
    const key = JSON.stringify([city, settings.prefs.weatherLocation?.latitude, settings.prefs.weatherLocation?.longitude])
    const configured = Number(settings.getPanelOption('weather', 'cacheMinutes', '10'))
    const minutes = [5, 10, 15, 30, 60].includes(configured) ? configured : 10
    if (!force && status.value !== 'error' && data.value && cachedKey === key && updatedAt.value !== null && Date.now() - updatedAt.value < minutes * 60000 && Date.now() >= updatedAt.value) {
      if (pending && pendingCity !== key) { requestId++; pending = null; pendingCity = '' }
      status.value = 'success'; errorMessage.value = ''; requestedCity.value = city
      return
    }
    if (pending && pendingCity === key) return pending
    const id = ++requestId
    requestedCity.value = city
    pendingCity = key
    status.value = 'loading'
    errorMessage.value = ''
    const request = (async () => { try {
      const result = await fetchWeather(city, settings.prefs.weatherLocation)
      if (id !== requestId) return
      data.value = result
      cachedKey = key
      updatedAt.value = Date.now()
      status.value = 'success'
    } catch (e) {
      if (id !== requestId) return
      errorMessage.value = e instanceof Error ? e.message : '天气加载失败'
      status.value = 'error'
    } finally {
      if (id === requestId) { pending = null; pendingCity = '' }
    } })()
    pending = request
    return request
  }

  function changeCity(city: string) {
    settings.set('weatherCity', city)
    load()
  }

  return { status, data, errorMessage, updatedAt, load, changeCity, requestedCity, showingOldCity }
})
