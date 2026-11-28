import { emit, listen } from '@tauri-apps/api/event'
import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { useIslandStore } from '@/stores/island'
import { useMusicStore } from '@/stores/music'
import { usePomodoroStore } from '@/stores/pomodoro'
import { useSettingsStore } from '@/stores/settings'
import { useCountdownStore, useEventsStore } from '@/stores/panelData'
import { invoke } from '@tauri-apps/api/core'
import { isWithinHours } from '@/lib/schedule'

export type NotifyKind =
  | 'clipboard'
  | 'capsLock'
  | 'numLock'
  | 'ime'
  | 'network'
  | 'battery'
  | 'music'
  | 'pomodoro'
  | 'sedentary'
  | 'volume'
  | 'eyecare'
  | 'countdown'
  | 'disk'
  | 'event'
  | 'water'
  | 'timer'

export interface NotifyItem {
  kind: NotifyKind
  text: string
  /** warn=警示（红），good=正向（绿），默认主题色 */
  tone?: 'info' | 'warn' | 'good'
  volume?: { pct: number; mute: boolean }
}

/** 通知类型 → 偏好开关 key */
const PREF_KEYS: Record<NotifyKind, string> = {
  clipboard: 'notifyClipboard',
  capsLock: 'notifyCapsLock',
  numLock: 'notifyNumLock',
  ime: 'notifyIme',
  network: 'notifyNetwork',
  battery: 'notifyBattery',
  music: 'notifyMusic',
  pomodoro: 'notifyPomodoro',
  sedentary: 'notifySedentary',
  eyecare: 'notifyEyecare',
  volume: 'notifyVolume',
  countdown: 'notifyCountdown',
  disk: 'notifyDisk',
  event: 'notifyEvent',
  water: 'notifyWater',
  timer: 'notifyTimer',
}

export const useNotifyStore = defineStore('notify', () => {
  const settings = useSettingsStore()
  const island = useIslandStore()
  const music = useMusicStore()
  const pomodoro = usePomodoroStore()
  const countdown = useCountdownStore()
  const events = useEventsStore()

  /** 岛窗口通知层当前项（收起态直接替换胶囊内容） */
  const current = ref<NotifyItem | null>(null)
  /** 面板已展开时的浮层通知 */
  const overlay = ref<NotifyItem | null>(null)
  const fullscreen = ref(false)
  const history = ref<Array<{ kind: NotifyKind; time: number }>>([])

  /** 侧边停靠时通知临时气泡的尺寸 */
  const SIDE_BUBBLE = { w: 220, h: 64 }

  /** 当前展示的通知是否由本 store 负责恢复窗口 */
  let expandedByNotify = false

  let hideTimer: number | undefined
  let pending: Array<{ item: NotifyItem; time: number }> = []
  let unlisteners: Array<() => void> = []
  let started = false
  let diskTimer: number | undefined
  const snoozeTimers = new Set<number>()

  function publishHistory() { emit('notification://history', history.value).catch(() => {}) }

  function allowed(kind: NotifyKind) {
    return settings.prefs.notifyEnabled && (settings.prefs as unknown as Record<string, boolean>)[PREF_KEYS[kind]]
  }

  function permitted(item: NotifyItem) {
    const hour = island.now.getHours()
    const { notifyQuietStart: start, notifyQuietEnd: end } = settings.prefs
    const scheduled = settings.prefs.notifyQuietSchedule && isWithinHours(hour, start, end)
    const quiet = settings.prefs.notifyDoNotDisturb || scheduled || (settings.prefs.notifyQuietFullscreen && fullscreen.value)
    const bypass = item.tone === 'warn' && ((item.kind === 'battery' && settings.prefs.notifyQuietBattery) || (item.kind === 'network' && settings.prefs.notifyQuietNetwork) || (item.kind === 'disk' && settings.prefs.notifyQuietDisk))
    return allowed(item.kind) && (!quiet || bypass)
  }

  /** 同类型状态合并；警告优先，普通通知等待警告结束。 */
  function enqueue(item: NotifyItem) {
    if (!permitted(item)) return
    if (settings.prefs.notifyHistoryEnabled && item.kind !== 'clipboard') {
      const now = Date.now()
      history.value = [{ kind: item.kind, time: now }, ...history.value.filter((entry) => entry.kind !== item.kind || now - entry.time > 60000)].slice(0, 50)
      publishHistory()
    }
    const active = current.value ?? overlay.value
    if (active?.kind === item.kind) {
      pending = pending.filter((entry) => entry.item.kind !== item.kind)
      if (active.text === item.text && item.kind !== 'volume') return
      display(item)
      return
    }
    if (active?.tone === 'warn' && item.tone !== 'warn') {
      pending = pending.filter((entry) => entry.item.kind !== item.kind)
      pending.push({ item, time: Date.now() })
      pending = pending.slice(-9)
      return
    }
    display(item)
  }

  function dismiss() {
    if (current.value) finishCurrent()
    else if (overlay.value) { window.clearTimeout(hideTimer); overlay.value = null; showNext() }
  }

  function snooze() {
    const item = current.value ?? overlay.value
    if (!item) return
    dismiss()
    const id = window.setTimeout(() => { snoozeTimers.delete(id); enqueue(item) }, 5 * 60000)
    snoozeTimers.add(id)
  }

  function display(item: NotifyItem) {
    if (island.expanded && !expandedByNotify) showOverlay(item)
    else showCurrent(item)
  }

  function showNext() {
    while (pending.length) {
      const next = pending.shift()!
      if (Date.now() - next.time <= 10000 && permitted(next.item)) {
        display(next.item)
        return true
      }
    }
    return false
  }

  function showCurrent(item: NotifyItem) {
    window.clearTimeout(hideTimer)
    overlay.value = null
    current.value = item
    // 侧边竖条放不下文字：首次展示时临时变横向小气泡
    const edge = settings.prefs.islandEdge
    if ((edge === 'left' || edge === 'right') && !expandedByNotify) {
      expandedByNotify = true
      island.setExpanded(true, SIDE_BUBBLE)
    }
    hideTimer = window.setTimeout(finishCurrent, settings.prefs.notifyDuration * 1000)
  }

  function finishCurrent() {
    window.clearTimeout(hideTimer)
    current.value = null
    if (showNext()) return
    if (expandedByNotify) {
      expandedByNotify = false
      island.setExpanded(false)
    }
  }

  /** 面板展开（用户交互）时打断通知层 */
  function interruptForPanel() {
    if (!current.value) return
    window.clearTimeout(hideTimer)
    current.value = null
    expandedByNotify = false
    pending = []
  }

  /** 面板展开时的浮层通知（不改变窗口状态） */
  function showOverlay(item: NotifyItem) {
    window.clearTimeout(hideTimer)
    current.value = null
    overlay.value = item
    hideTimer = window.setTimeout(() => {
      overlay.value = null
      showNext()
    }, settings.prefs.notifyDuration * 1000)
  }

  watch(() => [island.now.getHours(), fullscreen.value, settings.prefs.notifyEnabled, settings.prefs.notifyDoNotDisturb, settings.prefs.notifyQuietSchedule, settings.prefs.notifyQuietStart, settings.prefs.notifyQuietEnd, settings.prefs.notifyQuietFullscreen, settings.prefs.notifyQuietBattery, settings.prefs.notifyQuietNetwork, settings.prefs.notifyQuietDisk, ...Object.values(PREF_KEYS).map((key) => (settings.prefs as unknown as Record<string, boolean>)[key])], () => {
    pending = pending.filter(({ item }) => permitted(item))
    if (current.value && !permitted(current.value)) finishCurrent()
    if (overlay.value && !permitted(overlay.value)) {
      window.clearTimeout(hideTimer)
      overlay.value = null
      showNext()
    }
  })

  /** 文本预览截断 */
  function preview(text: string, max = 26) {
    const single = text.replace(/\s+/g, ' ').trim()
    return single.length > max ? `${single.slice(0, max)}…` : single
  }

  async function start() {
    if (started) return
    started = true
    unlisteners.push(await listen('notification://request-history', publishHistory))
    unlisteners.push(await listen('notification://clear-history', () => { history.value = []; publishHistory() }))
    watch(() => settings.prefs.notifyHistoryEnabled, (enabled) => { if (!enabled) { history.value = []; publishHistory() } })

    let lowDisks = new Set<string>()
    const checkDisks = async () => {
      if (!settings.prefs.notifyEnabled || !settings.prefs.notifyDisk) { lowDisks = new Set(); return }
      try {
        const disks = await invoke<Array<{ mount: string; total_gb: number; available_gb: number }>>('get_disks')
        const low = disks.filter((d) => d.total_gb > 0 && d.available_gb / d.total_gb * 100 < settings.prefs.diskWarningPercent)
        for (const disk of low) if (!lowDisks.has(disk.mount)) enqueue({ kind: 'disk', tone: 'warn', text: `${disk.mount} 可用空间不足 ${settings.prefs.diskWarningPercent}%` })
        lowDisks = new Set(low.map((d) => d.mount))
      } catch { /* 下次重试 */ }
    }
    void checkDisks()
    diskTimer = window.setInterval(checkDisks, 60000)

    await Promise.all([countdown.load(), events.load()])
    let notified: Record<string, string> = {}
    let canSave = true
    try { notified = JSON.parse((await invoke<string | null>('load_panel_data', { key: 'countdown-notified' })) || '{}') } catch { canSave = false }
    watch(() => [island.now, countdown.data] as const, () => {
      const day = new Date().toLocaleDateString('sv-SE')
      if (!permitted({ kind: 'countdown', text: '' })) return
      for (const item of countdown.data ?? []) {
        const days = countdown.daysLeft(item.date, item.repeat)
        if (days !== item.remindDays || notified[item.id] === day) continue
        enqueue({ kind: 'countdown', text: days ? `${item.name}还有 ${days} 天` : `今天是${item.name}` })
        notified[item.id] = day
        if (canSave) invoke('save_panel_data', { key: 'countdown-notified', json: JSON.stringify(notified) }).catch(() => {})
      }
    }, { immediate: true })
    watch(() => [island.now, events.data] as const, () => {
      if (!permitted({ kind: 'event', text: '' })) return
      const now = Date.now()
      for (const item of events.data ?? []) {
        const due = Date.parse(item.at) - item.remindMinutes * 60000
        const key = `event:${item.id}`
        if (now < due || now > Date.parse(item.at) + 300000 || notified[key]) continue
        enqueue({ kind: 'event', text: item.remindMinutes ? `日程：${item.title}（提前 ${item.remindMinutes} 分钟）` : `日程：${item.title}` })
        notified[key] = item.at
        if (canSave) invoke('save_panel_data', { key: 'countdown-notified', json: JSON.stringify(notified) }).catch(() => {})
      }
    }, { immediate: true })

    // 剪贴板复制（复用现有监听线程的事件）
    unlisteners.push(
      await listen<string>('clipboard://new', (event) => {
        if (!settings.prefs.clipboardEnabled || (settings.prefs.clipboardSensitiveFilter && /(?:password|passwd|token|api[_ -]?key|密码|验证码)\s*[:：=]\s*\S+/i.test(event.payload))) return
        enqueue({ kind: 'clipboard', text: `已复制：${preview(event.payload)}` })
      }),
    )
    unlisteners.push(await listen<boolean>('system://caps-lock', event => enqueue({ kind: 'capsLock', text: event.payload ? '大写锁定已开启' : '大写锁定已关闭' })))
    unlisteners.push(await listen<boolean>('system://num-lock', event => enqueue({ kind: 'numLock', text: event.payload ? '数字键盘已开启' : '数字键盘已关闭' })))
    // 输入法中英文切换
    unlisteners.push(
      await listen<boolean>('system://ime', (event) => {
        enqueue({
          kind: 'ime',
          text: event.payload ? '输入法：中文' : '输入法：英文',
          tone: 'info',
        })
      }),
    )
    // 网络连接状态
    unlisteners.push(
      await listen<boolean>('system://network', (event) => {
        enqueue({
          kind: 'network',
          text: event.payload ? '网络已连接' : '网络已断开',
          tone: event.payload ? 'good' : 'warn',
        })
      }),
    )
    // 电池状态
    unlisteners.push(
      await listen<{ kind: string; pct: number }>('system://battery', (event) => {
        const { kind, pct } = event.payload
        if (kind === 'ac') {
          enqueue({ kind: 'battery', text: '已接通电源', tone: 'good' })
        } else if (kind === 'battery') {
          enqueue({
            kind: 'battery',
            text: pct >= 0 ? `已切换为电池（${pct}%）` : '已切换为电池供电',
            tone: 'info',
          })
        } else if (kind === 'low') {
          enqueue({ kind: 'battery', text: `电量不足（${pct}%），请充电`, tone: 'warn' })
        } else if (kind === 'full') {
          enqueue({ kind: 'battery', text: '电池已充满', tone: 'good' })
        }
      }),
    )

    // 系统音量变化（含静音切换）
    unlisteners.push(
      await listen<{ pct: number; mute: boolean }>('system://volume', (event) => {
        const { pct, mute } = event.payload
        enqueue({
          kind: 'volume',
          text: mute ? '已静音 🔇' : `音量：${pct}% 🔊`,
          tone: 'info',
          volume: { pct, mute },
        })
      }),
    )

    // 跳过首次读取，仅报告实际曲目和播放状态变化。
    watch(() => music.state && { title: music.state.title, playing: music.state.playing }, (state, previous) => {
      if (!state || !previous) return
      if (state.title && state.title !== previous.title) enqueue({ kind: 'music', text: `切换音乐：${preview(state.title, 20)}` })
      else if (state.playing !== previous.playing) enqueue({ kind: 'music', text: state.playing ? `继续播放：${preview(state.title, 20)}` : `已暂停：${preview(state.title, 20)}` })
    })

    // 番茄钟阶段切换
    watch(
      () => pomodoro.phase,
      (phase, old) => {
        if (old === 'work' && phase === 'break') {
          enqueue({ kind: 'pomodoro', text: '专注完成，休息一下', tone: 'good' })
        } else if (old === 'break' && (phase === 'idle' || phase === 'work')) {
          enqueue({ kind: 'pomodoro', text: phase === 'work' ? '休息结束，开始新一轮专注' : '专注计划已完成', tone: 'good' })
        }
      },
    )
  }

  function stop() {
    unlisteners.forEach((fn) => fn())
    unlisteners = []
    started = false
    current.value = null
    overlay.value = null
    expandedByNotify = false
    pending = []
    window.clearTimeout(hideTimer)
    window.clearInterval(diskTimer)
    snoozeTimers.forEach((timer) => window.clearTimeout(timer))
    snoozeTimers.clear()
  }

  return { current, overlay, fullscreen, history, start, stop, enqueue, dismiss, snooze, interruptForPanel, showOverlay }
})
