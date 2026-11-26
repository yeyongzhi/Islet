import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useNotifyStore } from './notify'
import { formatTimer, timerRemaining } from '@/lib/timer'

/** 计时状态独立于面板组件，切换面板后继续运行。 */
export const useTimerStore = defineStore('timer', () => {
  const minutes = ref(5)
  const remaining = ref(300)
  const running = ref(false)
  const completed = ref(false)
  let deadline = 0

  function setMinutes(value: number) {
    if (running.value || !Number.isInteger(value) || value < 1 || value > 1440) return false
    minutes.value = value
    remaining.value = value * 60
    completed.value = false
    return true
  }
  function start() {
    if (running.value) return
    if (remaining.value <= 0) remaining.value = minutes.value * 60
    deadline = Date.now() + remaining.value * 1000
    completed.value = false
    running.value = true
  }
  function pause() {
    if (!running.value) return
    remaining.value = timerRemaining(deadline, Date.now())
    running.value = false
  }
  function reset() { running.value = false; remaining.value = minutes.value * 60; completed.value = false }
  window.setInterval(() => {
    if (!running.value) return
    remaining.value = timerRemaining(deadline, Date.now())
    if (remaining.value === 0) {
      running.value = false
      completed.value = true
      useNotifyStore().enqueue({ kind: 'timer', text: '倒计时结束', tone: 'good' })
    }
  }, 250)
  return { minutes, remaining, running, completed, setMinutes, start, pause, reset, format: formatTimer }
})
