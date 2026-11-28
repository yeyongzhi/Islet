import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useIslandStore } from '@/stores/island'
import { useNotifyStore } from '@/stores/notify'
import { useSettingsStore } from '@/stores/settings'
import { useHealthStore } from '@/stores/health'
import { isWithinHours } from '@/lib/schedule'

export type ReminderKind = 'sedentary' | 'eyecare' | 'water'

interface ReminderConfig {
  /** 选项中的间隔 key */
  optionKey: string
  /** 默认间隔（分钟） */
  defaultMinutes: number
  /** 面板 id（卡片关闭则不提醒） */
  panelId: 'sedentary' | 'eyecare' | 'water'
  notify: () => void
}

const CONFIGS: Record<ReminderKind, ReminderConfig> = {
  sedentary: {
    optionKey: 'intervalMin',
    defaultMinutes: 60,
    panelId: 'sedentary',
    notify: () =>
      useNotifyStore().enqueue({
        kind: 'sedentary',
        text: '已经久坐一段时间了，起来活动一下 🧘',
        tone: 'info',
      }),
  },
  eyecare: {
    optionKey: 'intervalMin',
    defaultMinutes: 20,
    panelId: 'eyecare',
    notify: () =>
      useNotifyStore().enqueue({
        kind: 'eyecare',
        text: '护眼时间到：看看 6 米外的景物 20 秒 👀',
        tone: 'info',
      }),
  },
  water: { optionKey: 'intervalMin', defaultMinutes: 60, panelId: 'water', notify: () => useNotifyStore().enqueue({ kind: 'water', text: '记得喝一杯水 💧', tone: 'info' }) },
}

interface PersistState {
  lastAt: number
  snoozeUntil?: number
}

export const useRemindersStore = defineStore('reminders', () => {
  const island = useIslandStore()
  const settings = useSettingsStore()
  const health = useHealthStore()

  /** 各提醒的上次计时起点（ms 时间戳） */
  const lastAt = ref<Record<ReminderKind, number>>({
    sedentary: Date.now(),
    eyecare: Date.now(),
    water: Date.now(),
  })
  let started = false
  const snoozeUntil = ref<Record<ReminderKind, number>>({ sedentary: 0, eyecare: 0, water: 0 })

  async function loadState() {
    for (const kind of ['sedentary', 'eyecare', 'water'] as ReminderKind[]) {
      try {
        const raw = await import('@tauri-apps/api/core').then((m) =>
          m.invoke<string | null>('load_panel_data', { key: kind }),
        )
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistState>
          if (typeof parsed.lastAt === 'number' && parsed.lastAt > 0) {
            lastAt.value[kind] = parsed.lastAt
          }
          if (typeof parsed.snoozeUntil === 'number' && Number.isFinite(parsed.snoozeUntil)) snoozeUntil.value[kind] = parsed.snoozeUntil
        }
      } catch {
        // 非 Tauri 环境忽略
      }
    }
  }

  function persist(kind: ReminderKind) {
    import('@tauri-apps/api/core').then((m) =>
      m
        .invoke('save_panel_data', {
          key: kind,
          json: JSON.stringify({ lastAt: lastAt.value[kind], snoozeUntil: snoozeUntil.value[kind] } satisfies PersistState),
        })
        .catch(() => {}),
    )
  }

  function reset(kind: ReminderKind) {
    lastAt.value[kind] = Date.now()
    snoozeUntil.value[kind] = 0
    persist(kind)
  }
  function snooze(kind: ReminderKind, minutes: number) {
    snoozeUntil.value[kind] = Date.now() + minutes * 60000
    persist(kind)
  }

  function minutesOf(kind: ReminderKind): number {
    const config = CONFIGS[kind]
    const raw = settings.getPanelOption(config.panelId, config.optionKey, String(config.defaultMinutes))
    const n = Number(raw)
    return n > 0 ? n : config.defaultMinutes
  }

  function cardEnabled(kind: ReminderKind): boolean {
    return (
      settings.prefs.notifyEnabled && !settings.prefs.disabledPanels.includes(CONFIGS[kind].panelId)
    )
  }

  async function start() {
    if (started) return
    started = true
    await Promise.all([loadState(), health.load()])
    // 启动和休眠后的逾期提醒最多发送一次，不补发错过的周期。
    let previousTick = Date.now()
    watch(() => health.counters.water, () => reset('water'))
    // 每秒随全局时钟走一次，到点即通过通知中心提醒（周期性重复直到重置）
    watch(
      () => island.now,
      (now) => {
        health.ensureToday()
        const timestamp = now.getTime()
        for (const kind of ['sedentary', 'eyecare', 'water'] as ReminderKind[]) {
          if (lastAt.value[kind] > timestamp + 2000) { lastAt.value[kind] = timestamp; snoozeUntil.value[kind] = 0; persist(kind) }
        }
        if (timestamp < previousTick - 2000) {
          for (const kind of ['sedentary', 'eyecare', 'water'] as ReminderKind[]) {
            if (lastAt.value[kind] > timestamp) { lastAt.value[kind] = timestamp; snoozeUntil.value[kind] = 0; persist(kind) }
          }
        }
        previousTick = timestamp
        const hour = now.getHours()
        const start = settings.prefs.reminderStartHour, end = settings.prefs.reminderEndHour
        const within = !settings.prefs.reminderWorkHours || isWithinHours(hour, start, end)
        if (!within) return
        for (const kind of ['sedentary', 'eyecare', 'water'] as ReminderKind[]) {
          if (!cardEnabled(kind)) continue
          if (kind === 'water' && (!settings.prefs.notifyWater || health.counters.water >= settings.prefs.waterGoal)) continue
          const intervalMs = minutesOf(kind) * 60000
          if (now.getTime() >= (snoozeUntil.value[kind] || lastAt.value[kind] + intervalMs)) {
            lastAt.value[kind] = now.getTime()
            snoozeUntil.value[kind] = 0
            persist(kind)
            CONFIGS[kind].notify()
          }
        }
      },
    )
  }

  /** 距下次提醒的剩余毫秒数 */
  function remainingMs(kind: ReminderKind): number {
    const intervalMs = minutesOf(kind) * 60000
    return Math.max(0, (snoozeUntil.value[kind] || lastAt.value[kind] + intervalMs) - island.now.getTime())
  }

  return { lastAt, snoozeUntil, remainingMs, minutesOf, reset, snooze, start, loadState }
})
