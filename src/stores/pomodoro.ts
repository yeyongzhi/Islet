import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSettingsStore } from './settings'

export type PomodoroPhase = 'idle' | 'work' | 'break'

export const usePomodoroStore = defineStore('pomodoro', () => {
  const settings = useSettingsStore()

  const phase = ref<PomodoroPhase>('idle')
  const running = ref(false)
  const remainingSecs = ref(0)

  let timer: number | undefined
  void timer

  function startPhase(next: PomodoroPhase) {
    phase.value = next
    remainingSecs.value =
      (next === 'work' ? settings.prefs.pomodoroWorkMin : settings.prefs.pomodoroBreakMin) * 60
    running.value = true
  }

  function start() {
    if (phase.value === 'idle') startPhase('work')
    else running.value = true
  }

  function pause() {
    running.value = false
  }

  function reset() {
    running.value = false
    phase.value = 'idle'
    remainingSecs.value = 0
  }

  timer = window.setInterval(() => {
    if (!running.value || phase.value === 'idle') return
    remainingSecs.value -= 1
    if (remainingSecs.value <= 0) {
      if (phase.value === 'work') startPhase('break')
      else reset()
    }
  }, 1000)

  /** 胶囊显示用：mm:ss，空闲时为 null */
  function format(total: number) {
    const m = Math.floor(total / 60)
      .toString()
      .padStart(2, '0')
    const s = (total % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    phase,
    running,
    remainingSecs,
    start,
    pause,
    reset,
    startPhase,
    format,
  }
})
