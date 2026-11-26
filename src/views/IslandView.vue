<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { compactWidth } from '@/lib/compactLayout'
import { getCurrentWebview } from '@tauri-apps/api/webview'
import { cursorPosition, getCurrentWindow } from '@tauri-apps/api/window'
import type { UnlistenFn } from '@tauri-apps/api/event'
import { listen } from '@tauri-apps/api/event'
import { PhysicalPosition } from '@tauri-apps/api/dpi'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  BatteryCharging,
  ClipboardCheck,
  Eye,
  Languages,
  Keyboard,
  Music2,
  Volume2,
  Timer,
  Wifi,
  CalendarDays,
  HardDrive,
  Droplets,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import IslandPill from '@/components/island/IslandPill.vue'
import IslandPanel from '@/components/island/IslandPanel.vue'
import RobotFace from '@/components/island/RobotFace.vue'
import { Button } from '@/components/ui/button'
import { useIslandStore } from '@/stores/island'
import { useNotifyStore } from '@/stores/notify'
import { usePanelsStore } from '@/stores/panels'
import { useSettingsStore, PANEL_SIZES, type IslandEdge } from '@/stores/settings'
import { useTransferStore } from '@/stores/transfer'
import { useRemindersStore } from '@/stores/reminders'
import { useClipboardStore } from '@/stores/clipboard'

const island = useIslandStore()
const settings = useSettingsStore()
const panels = usePanelsStore()
const transfer = useTransferStore()
const notify = useNotifyStore()

/** 通知类型 → 图标 */
const NOTIFY_ICONS: Record<string, Component> = {
  clipboard: ClipboardCheck,
  ime: Languages,
  capsLock: Keyboard,
  numLock: Keyboard,
  network: Wifi,
  battery: BatteryCharging,
  music: Music2,
  pomodoro: Timer,
  sedentary: Timer,
  volume: Volume2,
  eyecare: Eye,
  countdown: CalendarDays,
  disk: HardDrive,
  event: CalendarDays,
  water: Droplets,
}

/** 当前面板尺寸档位 */
const panelSize = computed(() => PANEL_SIZES[settings.prefs.panelSize] ?? PANEL_SIZES.medium)

/** 壳层视觉状态：驱动胶囊 ↔ 面板的形变动画 */
const open = ref(false)
const renderPanel = ref(false)
const MORPH_DURATION_MS = 460
let unmountPanelTimer: number | undefined
watch(open, (expanded) => {
  window.clearTimeout(unmountPanelTimer)
  if (!expanded) unmountPanelTimer = window.setTimeout(() => { renderPanel.value = false }, MORPH_DURATION_MS + 40)
})
const pinned = ref(false)
const shaking = ref(false)
let shakeTimer: number | undefined
watch(() => notify.current ?? notify.overlay, (item) => {
  if (!settings.prefs.reminderShake || !item || !['pomodoro', 'sedentary'].includes(item.kind)) return
  shaking.value = false
  window.clearTimeout(shakeTimer)
  requestAnimationFrame(() => { shaking.value = true; shakeTimer = window.setTimeout(() => { shaking.value = false }, 700) })
})
watch(
  [open, renderPanel, () => settings.prefs.fontSize],
  ([expanded, panelVisible, fontSize]) => {
    // 展开时按全局字号缩放 rem 字体；收起胶囊继续使用紧凑字号。
    document.documentElement.style.fontSize = expanded || panelVisible ? `${(16 * fontSize) / 14}px` : '13px'
  },
  { immediate: true },
)
/** 收起流程的定时器：先延迟确认离开，动画结束后再缩小窗口 */
let collapseTimer: number | undefined
let leaveTimer: number | undefined
let hoverTimer: number | undefined
let fullscreenTimer: number | undefined
let hiddenByFullscreen = false
let checkingFullscreen = false
let manualFullscreenOverride = false
let unlistenManualShow: UnlistenFn | undefined
let unlistenManualHide: UnlistenFn | undefined
let manuallyHidden = false
const automaticIndicator = ref(false)

async function updateFullscreen() {
  if (checkingFullscreen) return
  if (manuallyHidden) return
  checkingFullscreen = true
  try {
    const [maximized, exclusive] = await invoke<[boolean, boolean]>('get_window_display_context')
    const fullscreen = settings.prefs.notifyQuietFullscreen && await invoke<boolean>('is_foreground_fullscreen')
    notify.fullscreen = fullscreen
    if (!maximized && !exclusive) manualFullscreenOverride = false
    const mode = manualFullscreenOverride ? 'normal' : exclusive ? settings.prefs.fullscreenDisplayMode : maximized ? settings.prefs.maximizedDisplayMode : 'normal'
    const shouldIndicate = mode === 'indicator'
    if (shouldIndicate && !automaticIndicator.value && open.value) {
      pinned.value = false
      open.value = false
      window.clearTimeout(collapseTimer)
      collapseTimer = window.setTimeout(() => island.setExpanded(false), MORPH_DURATION_MS + 40)
    }
    automaticIndicator.value = shouldIndicate
    if (mode === 'hide' && !hiddenByFullscreen) {
      window.clearTimeout(hoverTimer)
      pinned.value = false
      open.value = false
      island.setExpanded(false)
      await invoke('set_island_visible', { visible: false })
      hiddenByFullscreen = true
    } else if (mode !== 'hide' && hiddenByFullscreen) {
      await invoke('set_island_visible', { visible: true })
      hiddenByFullscreen = false
    }
  } finally { checkingFullscreen = false }
}
watch(() => [settings.prefs.maximizedDisplayMode, settings.prefs.fullscreenDisplayMode, settings.prefs.notifyQuietFullscreen], () => { void updateFullscreen().catch(() => {}) })

/** 鼠标移出后的宽限延迟：短暂离开（如移动到边缘、划过间隙）不收起 */

/** 收起态尺寸（宽高与 Rust 常量一致；圆角跟随全局圆角偏好） */
function compactDims(): { w: number; h: number; r: number } {
  const r = settings.prefs.borderRadius
  if (settings.prefs.islandEdge === 'left' || settings.prefs.islandEdge === 'right') {
    // 侧边停靠：竖向长条（胶囊圆角封顶为宽度一半）
    return { w: 112, h: 220, r: Math.min(20, Math.max(6, r + 4)) }
  }
  return { w: notify.current ? Math.max(220, compactWidth(settings.prefs.compactItems, settings.prefs)) : compactWidth(settings.prefs.compactItems, settings.prefs), h: 40, r: Math.min(20, Math.max(2, r + 4)) }
}

const shellStyle = computed(() => {
  const dims = compactDims()
  const edgeRadius = (radius: string) => {
    if (settings.prefs.compactStyle !== 'notch') return radius
    switch (settings.prefs.islandEdge) {
      case 'top': return `0 0 ${radius} ${radius}`
      case 'bottom': return `${radius} ${radius} 0 0`
      case 'left': return `0 ${radius} ${radius} 0`
      default: return `${radius} 0 0 ${radius}`
    }
  }
  if (!open.value) {
    // 侧边竖条上出现通知时，临时变为横向小气泡
    if (notify.current && (settings.prefs.islandEdge === 'left' || settings.prefs.islandEdge === 'right')) {
      return { width: '220px', height: '64px', borderRadius: '20px' }
    }
    return { width: `${dims.w}px`, height: `${dims.h}px`, borderRadius: edgeRadius(`${dims.r}px`) }
  }
  const size = panelSize.value
  return {
    width: `${size.w}px`,
    height: `${size.h}px`,
    // 展开面板圆角同样跟随全局圆角（档位内微调，保持胶囊到面板的形变观感）
    borderRadius: edgeRadius(`${Math.min(28, Math.max(2, settings.prefs.borderRadius + 4))}px`),
  }
})

/** 面板内容整体缩放（zoom 同时缩放布局与字号，适配窗口尺寸档位） */
const panelLayerStyle = computed(() => ({ zoom: panelSize.value.zoom }))

// 内容保持自身尺寸，仅由外壳裁剪，避免形变时文字和控件逐帧重排。
function layerPosition(w: number, h: number) {
  const edge = settings.prefs.islandEdge
  return {
    width: `${w}px`, height: `${h}px`,
    left: edge === 'left' ? '0' : edge === 'right' ? 'auto' : `calc(50% - ${w / 2}px)`,
    right: edge === 'right' ? '0' : 'auto',
    top: edge === 'bottom' ? 'auto' : edge === 'left' || edge === 'right' ? `calc(50% - ${h / 2}px)` : '0',
    bottom: edge === 'bottom' ? '0' : 'auto',
  }
}
const pillLayerPosition = computed(() => {
  const dims = compactDims()
  return layerPosition(dims.w, dims.h)
})
const panelLayerPosition = computed(() => layerPosition(panelSize.value.w, panelSize.value.h))

/** 壳层锚点：展开时以胶囊所在位置为原点向屏幕内侧生长 */
const anchorClass = computed(() => {
  switch (settings.prefs.islandEdge) {
    case 'bottom':
      return 'items-end justify-center'
    case 'left':
      return 'items-center justify-start'
    case 'right':
      return 'items-center justify-end'
    default:
      return 'items-start justify-center'
  }
})

let opening = false
let openRequest = 0
let pointerInside = false
let leftWhileOpening = false
async function openIsland() {
  // 宽限期内重新移入：取消收起流程
  window.clearTimeout(collapseTimer)
  window.clearTimeout(leaveTimer)
  // 通知层让位于用户交互
  notify.interruptForPanel()
  if (open.value || opening) return
  opening = true
  leftWhileOpening = false
  const request = ++openRequest
  // 先完成原生窗口调整并提交一帧，再启动壳层形变，避免窗口大小与内容不同步。
  await island.setExpanded(true)
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))
  // 调整原生窗口时 WebView 可能产生临时的 mouseleave，按实际屏幕坐标确认。
  if (leftWhileOpening && settings.prefs.expandMode === 'hover') {
    try {
      const win = getCurrentWindow()
      const [cursor, position, size] = await Promise.all([cursorPosition(), win.outerPosition(), win.outerSize()])
      pointerInside = cursor.x >= position.x && cursor.x < position.x + size.width
        && cursor.y >= position.y && cursor.y < position.y + size.height
      if (!pointerInside) openRequest++
    } catch {
      if (!pointerInside) openRequest++
    }
  }
  opening = false
  if (request !== openRequest) {
    await island.setExpanded(false)
    if (pointerInside && settings.prefs.expandMode === 'hover') void openIsland()
    return
  }
  window.clearTimeout(unmountPanelTimer)
  renderPanel.value = true
  open.value = true
  getCurrentWindow().setFocus().catch(() => {})
}

function handleEnter() {
  pointerInside = true
  window.clearTimeout(collapseTimer)
  window.clearTimeout(leaveTimer)
  if (settings.prefs.expandMode !== 'hover' || open.value || notify.current?.tone === 'warn') return
  window.clearTimeout(hoverTimer)
  hoverTimer = window.setTimeout(openIsland, settings.prefs.hoverDelay)
}

function handleLeave() {
  pointerInside = false
  window.clearTimeout(hoverTimer)
  if (opening) leftWhileOpening = true
  if (!open.value || pinned.value) return
  collapseSoon()
}

/** 指针真正离开窗口时关闭弹出的选择器或菜单，进入传送浮层不触发。 */
function handleWindowExit(event: MouseEvent) {
  if (event.relatedTarget || !document.querySelector('[role="listbox"], [role="menu"]')) return
  document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
  if (open.value && !pinned.value) collapseSoon()
}

/** 收起流程：壳层先动画收拢回胶囊，动画结束后窗口再缩小 */
function collapseSoon() {
  window.clearTimeout(collapseTimer)
  window.clearTimeout(leaveTimer)
  if (pinned.value) return
  leaveTimer = window.setTimeout(() => {
    if (!open.value || pinned.value) return
    // 菜单或对话框可能在离开事件之后才挂载；保持窗口展开直到浮层关闭。
    if (document.querySelector('[role="menu"], [role="listbox"], [role="dialog"], [role="alertdialog"]')) {
      leaveTimer = window.setTimeout(collapseSoon, 100)
      return
    }
    open.value = false
    collapseTimer = window.setTimeout(
      () => island.setExpanded(false),
      MORPH_DURATION_MS + 40,
    )
  }, settings.prefs.leaveDelay)
}

function togglePin() {
  pinned.value = !pinned.value
  if (pinned.value) {
    window.clearTimeout(leaveTimer)
    window.clearTimeout(collapseTimer)
  }
}

// ---------- 文件拖入（中转站） ----------
let unlistenDragDrop: UnlistenFn | undefined

/** 拖入时展开到中转站：收起态也能接收文件拖放，进入即展开便于看见高亮落区 */
function expandForDrag() {
  void openIsland()
}

function handleDragDropEvent(event: { payload: { type: string; paths?: string[] } }) {
  const { type, paths } = event.payload
  if (type === 'enter' || type === 'over') {
    expandForDrag()
  } else if (type === 'drop') {
    expandForDrag()
    if (paths?.length) {
      transfer.addPaths(paths)
      panels.select('transfer')
    }
  } else if (type === 'leave') {
    // 原生拖放不触发 mouseleave，需自行走收起流程
    if (open.value) collapseSoon()
  }
}

/** 组装 set_island_state 参数（展开时附带当前面板尺寸） */
function layoutParams(edge: string, expanded: boolean, offset: number) {
  return {
    edge,
    expanded,
    offset,
    compactWidth: notify.current ? Math.max(220, compactWidth(settings.prefs.compactItems, settings.prefs)) : compactWidth(settings.prefs.compactItems, settings.prefs),
    panelWidth: panelSize.value.w,
    panelHeight: panelSize.value.h,
    edgeGap: settings.prefs.compactStyle === 'notch' || settings.prefs.edgeAttached ? 0 : 8,
  }
}

/**
 * 按住拖动：手动跟随（透明置顶窗口上原生 HTCAPTION 拖动循环不生效），
 * pointermove 直接 setPosition 跟随光标，松手后仍走 finish_drag 的四边吸附。
 */
const CURSOR = getCurrentWindow()
let dragActive = false
let dragEl: HTMLElement | null = null
let dragPointerId = -1
let dragStartX = 0
let dragStartY = 0
let dragWinStart: { x: number; y: number } | null = null
let dragScale = 1
let dragMoved = false

async function beginDrag(event: PointerEvent) {
  if (event.button !== 0 || dragActive) return
  dragActive = true
  dragMoved = false
  dragPointerId = event.pointerId
  dragEl = event.currentTarget as HTMLElement
  dragStartX = event.screenX
  dragStartY = event.screenY
  try {
    const [pos, scale] = await Promise.all([
      CURSOR.outerPosition(),
      CURSOR.scaleFactor(),
    ])
    dragWinStart = { x: pos.x, y: pos.y }
    dragScale = scale
    dragEl.setPointerCapture(event.pointerId)
    window.addEventListener('pointermove', onDragMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  } catch {
    resetDrag()
  }
}

function onDragMove(event: PointerEvent) {
  if (!dragActive || !dragWinStart) return
  const dx = (event.screenX - dragStartX) * dragScale
  const dy = (event.screenY - dragStartY) * dragScale
  if (Math.abs(dx) + Math.abs(dy) < 5 && !dragMoved) return
  dragMoved = true
  CURSOR.setPosition(
    new PhysicalPosition(
      Math.round(dragWinStart.x + dx),
      Math.round(dragWinStart.y + dy),
    ),
  ).catch(() => {})
}

async function endDrag() {
  window.removeEventListener('pointermove', onDragMove)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
  try {
    dragEl?.releasePointerCapture(dragPointerId)
  } catch {
    // 指针可能已释放
  }
  const wasExpanded = island.expanded
  const moved = dragMoved
  resetDrag()
  if (!moved) return
  try {
    const res = await invoke<{ edge: string; offset: number; monitor: string | null }>('finish_drag', {
      currentEdge: settings.prefs.islandEdge,
      edgeGap: settings.prefs.compactStyle === 'notch' || settings.prefs.edgeAttached ? 0 : 8,
    })
    settings.updateIslandLayout(res.edge as IslandEdge, res.offset)
    if (res.monitor && res.monitor !== settings.prefs.monitorName) settings.set('monitorName', res.monitor)
    // finish_drag 会收起窗口；若拖动前处于展开态则重新展开
    await invoke('set_island_state', layoutParams(res.edge, wasExpanded, res.offset))
    if (wasExpanded) island.setExpanded(true)
  } catch {
    // 非 Tauri 环境忽略
  }
}

function resetDrag() {
  dragActive = false
  dragEl = null
  dragPointerId = -1
  dragWinStart = null
}

// 停靠边或偏移变化（设置里切换位置、拖动吸附）时按当前状态重新应用布局
watch(
  () => [settings.prefs.islandEdge, settings.prefs.islandOffset, settings.prefs.edgeAttached, settings.prefs.compactStyle, compactWidth(settings.prefs.compactItems, settings.prefs), !!notify.current] as const,
  () => {
    invoke('set_island_state', layoutParams(
      settings.prefs.islandEdge,
      island.expanded,
      settings.prefs.islandOffset,
    )).catch(() => {})
  },
)

// 尺寸档位变更时若处于展开态，立即按新尺寸应用布局
watch(
  () => settings.prefs.panelSize,
  () => {
    if (island.expanded) {
      invoke('set_island_state', layoutParams(
        settings.prefs.islandEdge,
        true,
        settings.prefs.islandOffset,
      )).catch(() => {})
    }
  },
)

onMounted(async () => {
  if (import.meta.env.PROD) void invoke('check_and_install_update').catch(() => {})
  document.addEventListener('mouseout', handleWindowExit)
  // 岛悬浮窗：页面背景透明（窗口本身透明）
  document.body.style.background = 'transparent'
  // 按持久化偏好应用初始停靠布局
  if (settings.prefs.monitorName) {
    await invoke('select_island_monitor', { name: settings.prefs.monitorName }).catch(() => {})
  }
  invoke('set_island_state', layoutParams(
    settings.prefs.islandEdge,
    false,
    settings.prefs.islandOffset,
  )).catch(() => {})
  await transfer.load()
  // 监听系统文件拖入（收起态同样可拖放，进入即展开到中转站）
  try {
    unlistenDragDrop = await getCurrentWebview().onDragDropEvent(handleDragDropEvent)
  } catch {
    // 非 Tauri 环境忽略
  }
  // 启动通知中心（系统事件监听 + 队列）
  notify.start()
  void useClipboardStore().init().catch(() => {})
  void useRemindersStore().start()
  unlistenManualShow = await listen('island://manual-show', () => { manuallyHidden = false; manualFullscreenOverride = true; hiddenByFullscreen = false }).catch(() => undefined)
  unlistenManualHide = await listen('island://manual-hide', () => { manuallyHidden = true; hiddenByFullscreen = false; pinned.value = false; open.value = false; island.setExpanded(false) }).catch(() => undefined)
  fullscreenTimer = window.setInterval(() => { updateFullscreen().catch(() => {}) }, 1500)
})

onBeforeUnmount(() => {
  document.removeEventListener('mouseout', handleWindowExit)
  window.clearTimeout(collapseTimer)
  window.clearTimeout(leaveTimer)
  window.clearTimeout(hoverTimer)
  window.clearInterval(fullscreenTimer)
  window.clearTimeout(shakeTimer)
  window.clearTimeout(unmountPanelTimer)
  unlistenDragDrop?.()
  unlistenManualShow?.()
  unlistenManualHide?.()
})
</script>

<template>
  <!-- 悬停展开：鼠标进入窗口动画展开为面板，移出后动画收回胶囊；支持四边停靠 -->
  <main
    class="fixed inset-0 flex"
    :class="anchorClass"
  >
    <div
      class="island-shell"
      :class="{ 'island-shell--open': open, 'island-shell--shake': shaking, 'island-shell--indicator': !open && !notify.current && (automaticIndicator || settings.prefs.compactStyle === 'indicator') }"
      :style="{ ...shellStyle, '--morph-easing': settings.prefs.animationCurve === 'smooth' ? 'cubic-bezier(0.22, 1, 0.36, 1)' : settings.prefs.animationCurve }"
      @mouseenter="handleEnter"
      @mouseleave="handleLeave"
    >
      <!-- 收起层：胶囊内容（通知展示时暂时隐藏） -->
      <div v-show="!(notify.current && !open)" class="island-pill-layer" :style="pillLayerPosition">
        <Button variant="ghost" class="h-full w-full rounded-[inherit] p-0 hover:bg-transparent" aria-label="展开灵动岛" @pointerdown="beginDrag" @click="!dragMoved && openIsland()">
          <span v-if="(automaticIndicator || settings.prefs.compactStyle === 'indicator') && !open && !notify.current" class="block rounded-full bg-foreground/60" :class="settings.prefs.islandEdge === 'left' || settings.prefs.islandEdge === 'right' ? 'h-16 w-1' : 'h-1 w-16'" aria-hidden="true" />
          <IslandPill v-else />
        </Button>
      </div>
      <!-- 通知层：保留左侧机器人表情，显示通知图标和文案 -->
        <div
          v-if="notify.current && !open"
          :key="notify.current.kind"
          class="island-notify-layer"
          @pointerdown="beginDrag"
        >
          <RobotFace class="size-8 shrink-0" />
          <div class="flex min-w-0 items-center justify-end gap-2">
            <component
              :is="NOTIFY_ICONS[notify.current.kind]"
              class="size-4 shrink-0"
              :class="notify.current.tone === 'warn' ? 'text-red-400' : 'text-primary'"
              aria-hidden="true"
            />
            <span
              class="min-w-0 truncate text-xs font-medium"
              :title="notify.current.text"
              :class="notify.current.tone === 'warn' ? 'text-red-400' : 'text-foreground'"
            >
              <template v-if="notify.current.volume && !notify.current.volume.mute">
                音量：<span :key="notify.current.volume.pct" class="volume-number">{{ notify.current.volume.pct }}</span>% 🔊
              </template>
              <template v-else>{{ notify.current.text }}</template>
            </span>
            <template v-if="notify.current.tone === 'warn'">
              <Button variant="ghost" size="sm" class="h-7 shrink-0 px-1 text-xs" @pointerdown.stop @click.stop="notify.snooze()">稍后</Button>
              <Button variant="ghost" size="sm" class="h-7 shrink-0 px-1 text-xs" @pointerdown.stop @click.stop="notify.dismiss()">关闭</Button>
            </template>
          </div>
        </div>
      <!-- 展开层：面板内容 -->
      <div class="island-panel-layer" :style="panelLayerPosition">
        <IslandPanel :style="panelLayerStyle" :pinned="pinned" :open="open" :render-content="renderPanel" :notification="notify.overlay" :notification-icon="notify.overlay ? NOTIFY_ICONS[notify.overlay.kind] : undefined" @drag="beginDrag" @toggle-pin="togglePin" />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* 灵动岛壳层：从胶囊形变为面板；配色跟随主题令牌（亮/暗模式即时生效） */
.island-shell {
  position: relative;
  background: color-mix(in srgb, var(--background) var(--island-opacity, 95%), transparent);
  /* 亮暗模式各自的内描边+内阴影（外投影会被透明窗口裁剪） */
  box-shadow: var(--island-shadow);
  overflow: hidden;
  user-select: none;
  transition:
    width 460ms var(--morph-easing),
    height 460ms var(--morph-easing),
    border-radius 460ms var(--morph-easing);
}

.island-shell--shake { animation: reminder-shake 700ms ease-in-out; }
.island-shell--indicator { background: transparent; box-shadow: none; }
@keyframes reminder-shake {
  0%, 100% { transform: translateX(0); }
  20%, 60% { transform: translateX(-5px); }
  40%, 80% { transform: translateX(5px); }
}
@media (prefers-reduced-motion: reduce) { .island-shell--shake { animation: none; } }

.island-pill-layer {
  position: absolute;
  color: var(--foreground);
  opacity: 1;
  transform: scale(1);
  transition: opacity 260ms ease, transform 260ms ease;
}

.island-shell--open .island-pill-layer {
  opacity: 0;
  transform: scale(0.92);
  transition-delay: 100ms;
  pointer-events: none;
}

.island-panel-layer {
  position: absolute;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.96);
  transform-origin: top center;
  transition: opacity 300ms ease, transform 300ms ease;
}

.island-shell--open .island-panel-layer {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}

/* 通知层：与胶囊同层级平铺表情、图标和文案 */
.island-notify-layer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 16px;
  color: var(--foreground);
  pointer-events: auto;
}

.volume-number {
  display: inline-block;
  font-variant-numeric: tabular-nums;
  animation: volume-pop 180ms ease-out;
}

@keyframes volume-pop {
  from { transform: translateY(2px) scale(0.88); opacity: 0.65; }
  to { transform: translateY(0) scale(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .volume-number { animation: none; }
}
</style>
