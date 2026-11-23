import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useSettingsStore } from './settings'
import { nextPomodoroPhase, type PomodoroPhase } from '@/lib/pomodoro'

export type { PomodoroPhase } from '@/lib/pomodoro'

export const usePomodoroStore = defineStore('pomodoro', () => {
  const settings = useSettingsStore()

  const phase = ref<PomodoroPhase>('idle')
  const running = ref(false)
  const remainingSecs = ref(0)
  const completedRounds = ref(0)
  const completed = ref(false)
  let deadline = 0

  let timer: number | undefined
  void timer

  function startPhase(next: PomodoroPhase) {
    phase.value = next
    remainingSecs.value =
      (next === 'work' ? settings.prefs.pomodoroWorkMin : settings.prefs.pomodoroBreakMin) * 60
    running.value = true
    deadline = Date.now() + remainingSecs.value * 1000
  }

  function start() {
    if (phase.value === 'idle') startPhase('work')
    else { deadline = Date.now() + remainingSecs.value * 1000; running.value = true }
  }

  function pause() {
    if (running.value) remainingSecs.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    running.value = false
  }

  function reset() {
    running.value = false
    phase.value = 'idle'
    remainingSecs.value = 0
    completedRounds.value = 0
    completed.value = false
  }

  timer = window.setInterval(() => {
    if (!running.value || phase.value === 'idle') return
    remainingSecs.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
    if (remainingSecs.value <= 0) {
      const next = nextPomodoroPhase(phase.value, completedRounds.value, settings.prefs.pomodoroRounds)
      completedRounds.value = next.completedRounds
      if (next.phase === 'idle') { running.value = false; phase.value = 'idle'; completed.value = next.completed }
      else startPhase(next.phase)
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
    completedRounds,
    completed,
    start,
    pause,
    reset,
    startPhase,
    format,
  }
})
