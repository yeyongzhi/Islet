<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { emit as emitEvent } from '@tauri-apps/api/event'
import { computed, defineAsyncComponent, nextTick, onBeforeUnmount, onMounted, ref, watch, type Component } from 'vue'
import { ChevronLeft, ChevronRight, Pin, PinOff, Settings } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
const CalendarPanel = defineAsyncComponent(() => import('./panels/CalendarPanel.vue'))
const ClipboardPanel = defineAsyncComponent(() => import('./panels/ClipboardPanel.vue'))
const ClockPanel = defineAsyncComponent(() => import('./panels/ClockPanel.vue'))
const CountdownPanel = defineAsyncComponent(() => import('./panels/CountdownPanel.vue'))
const DisksPanel = defineAsyncComponent(() => import('./panels/DisksPanel.vue'))
const EyecarePanel = defineAsyncComponent(() => import('./panels/EyecarePanel.vue'))
const MonitorPanel = defineAsyncComponent(() => import('./panels/MonitorPanel.vue'))
const NetspeedPanel = defineAsyncComponent(() => import('./panels/NetspeedPanel.vue'))
const OffworkPanel = defineAsyncComponent(() => import('./panels/OffworkPanel.vue'))
const ProgressPanel = defineAsyncComponent(() => import('./panels/ProgressPanel.vue'))
const QuickstartPanel = defineAsyncComponent(() => import('./panels/QuickstartPanel.vue'))
const SedentaryPanel = defineAsyncComponent(() => import('./panels/SedentaryPanel.vue'))
const SysinfoPanel = defineAsyncComponent(() => import('./panels/SysinfoPanel.vue'))
const ToiletPanel = defineAsyncComponent(() => import('./panels/ToiletPanel.vue'))
const TransferPanel = defineAsyncComponent(() => import('./panels/TransferPanel.vue'))
const WaterPanel = defineAsyncComponent(() => import('./panels/WaterPanel.vue'))
const MusicPanel = defineAsyncComponent(() => import('./panels/MusicPanel.vue'))
const PomodoroPanel = defineAsyncComponent(() => import('./panels/PomodoroPanel.vue'))
const WeatherPanel = defineAsyncComponent(() => import('./panels/WeatherPanel.vue'))
const GalleryPanel = defineAsyncComponent(() => import('./panels/GalleryPanel.vue'))
const TimerPanel = defineAsyncComponent(() => import('./panels/TimerPanel.vue'))
const VolumePanel = defineAsyncComponent(() => import('./panels/VolumePanel.vue'))
const PowerPanel = defineAsyncComponent(() => import('./panels/PowerPanel.vue'))
const UnitsPanel = defineAsyncComponent(() => import('./panels/UnitsPanel.vue'))
import PanelIllustration from '@/components/island/PanelIllustration.vue'
import { PANELS, usePanelsStore, type PanelId } from '@/stores/panels'
import { useIslandStore } from '@/stores/island'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { useSettingsStore } from '@/stores/settings'
import { useNotifyStore, type NotifyItem } from '@/stores/notify'
import MusicRhythm from '@/components/island/MusicRhythm.vue'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

const panels = usePanelsStore()
const island = useIslandStore()
const settings = useSettingsStore()
const notify = useNotifyStore()

const PANEL_COMPONENTS: Record<PanelId, Component> = {
  gallery: GalleryPanel,
  timer: TimerPanel,
  volume: VolumePanel,
  power: PowerPanel,
  units: UnitsPanel,
  calendar: CalendarPanel,
  clock: ClockPanel,
  progress: ProgressPanel,
  countdown: CountdownPanel,
  weather: WeatherPanel,
  monitor: MonitorPanel,
  netspeed: NetspeedPanel,
  disks: DisksPanel,
  sysinfo: SysinfoPanel,
  music: MusicPanel,
  pomodoro: PomodoroPanel,
  clipboard: ClipboardPanel,
  transfer: TransferPanel,
  quickstart: QuickstartPanel,
  offwork: OffworkPanel,
  sedentary: SedentaryPanel,
  water: WaterPanel,
  toilet: ToiletPanel,
  eyecare: EyecarePanel,
}

const props = defineProps<{ pinned: boolean; open: boolean; notification: NotifyItem | null; notificationIcon?: Component; previewId?: PanelId; renderContent?: boolean }>()
const emit = defineEmits<{ drag: [event: PointerEvent]; togglePin: [] }>()

const indicatorArea = ref<InstanceType<typeof ScrollArea> | null>(null)
watch(() => [panels.activeId, panels.visiblePanels.map((panel) => panel.id).join(','), settings.prefs.panelIndicatorStyle, props.open] as const, async () => {
  await nextTick()
  const root = indicatorArea.value?.$el as HTMLElement | undefined
  const viewport = root?.querySelector<HTMLElement>('[data-slot="scroll-area-viewport"]')
  const active = root?.querySelector<HTMLElement>('[data-active="true"]')
  if (!viewport || !active) return
  const viewportRect = viewport.getBoundingClientRect()
  const activeRect = active.getBoundingClientRect()
  const offset = activeRect.left - viewportRect.left - (viewportRect.width - activeRect.width) / 2
  viewport.scrollTo({ left: viewport.scrollLeft + offset, behavior: 'smooth' })
}, { immediate: true })

const activePanel = computed(() => PANELS.find((panel) => panel.id === (props.previewId ?? panels.activeId)))

const notificationText = computed(() => {
  const item = props.notification
  if (!item) return ''
  if (item.volume) return item.volume.mute ? '已静音 🔇' : `音量：${item.volume.pct}% 🔊`
  return item.text
})

/** 滚轮切换面板：仅在顶部栏 / 底部指示点 / 左右箭头条四个区域生效（节流） */
let wheelLockUntil = 0
function handlePanelKey(event: KeyboardEvent) {
  if (!props.open || !event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  const target = event.target as HTMLElement | null
  if (target?.closest('input, textarea, [contenteditable="true"], [role="slider"], [role="combobox"]')) return
  event.preventDefault()
  if (event.key === 'ArrowLeft') panels.prev(); else panels.next()
}
onMounted(() => window.addEventListener('keydown', handlePanelKey))
onBeforeUnmount(() => window.removeEventListener('keydown', handlePanelKey))
function handleWheel(event: WheelEvent) {
  const now = Date.now()
  if (now < wheelLockUntil) return
  if (Math.abs(event.deltaY) < 4) return
  wheelLockUntil = now + 280
  if (event.deltaY > 0) panels.next()
  else panels.prev()
}

function openSettings() {
  invoke('open_settings').catch(() => {
    // 浏览器开发环境无此命令
  })
}

function quitApp() {
  invoke('quit_app').catch(() => {
    // 浏览器开发环境无此命令
  })
}

async function hideIsland() {
  await emitEvent('island://manual-hide')
  await invoke('set_island_visible', { visible: false })
}
</script>

<template>
  <!-- 展开面板壳层：三行严格划分（顶部栏 / 内容区 / 指示点），内容区禁止溢出 -->
  <div
    class="relative isolate grid h-full w-full select-none grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-2 text-foreground"
    aria-label="Islet 灵岛展开面板"
  >
    <MusicRhythm v-if="!previewId && panels.activeId === 'music' && (open || renderContent) && settings.getPanelOption('music', 'rhythm', true)" class="z-0" />
    <!-- 顶部：日期时间或通知文字（可拖动；滚轮可切换面板），右侧设置菜单 -->
    <header
      class="relative z-10 flex h-8 shrink-0 cursor-default items-center justify-center"
      @pointerdown="emit('drag', $event)"
      @wheel="handleWheel"
    >
      <div class="absolute left-[6.25rem] flex min-w-0 items-center justify-center" :class="notification?.tone === 'warn' ? 'right-32' : 'right-16'">
        <div v-if="notification" class="flex min-w-0 max-w-full items-center justify-center gap-1.5 text-xs font-medium" :class="notification.tone === 'warn' ? 'text-red-400' : notification.tone === 'good' ? 'text-emerald-400' : 'text-foreground'" role="status" :title="notificationText">
          <component :is="notificationIcon" v-if="notificationIcon" class="size-4 shrink-0" aria-hidden="true" />
          <span class="truncate">{{ notificationText }}</span>
        </div>
        <div v-else class="truncate whitespace-nowrap text-xs font-bold text-foreground">
          {{ island.dateText }}
          <span class="ml-1 text-foreground tabular-nums">{{ island.timeText }}</span>
        </div>
      </div>
      <div v-if="notification?.tone === 'warn'" class="absolute right-[4.5rem] flex items-center gap-1">
        <Button variant="ghost" size="sm" class="h-7 px-1 text-xs" @pointerdown.stop @click.stop="notify.snooze()">稍后</Button>
        <Button variant="ghost" size="sm" class="h-7 px-1 text-xs" @pointerdown.stop @click.stop="notify.dismiss()">关闭</Button>
      </div>
      <DropdownMenu v-if="settings.prefs.quickPanelSwitch">
        <DropdownMenuTrigger as-child>
          <Button variant="ghost" class="absolute left-0 top-0 h-8 max-w-[6.25rem] justify-start gap-1 px-1 text-xs font-semibold" :aria-label="`选择面板，当前：${activePanel?.label ?? '面板'}`" @pointerdown.stop>
            <PanelIllustration v-if="activePanel" :id="activePanel.id" class="size-4 shrink-0 object-contain" />
            <span class="truncate">{{ activePanel?.label }}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" class="w-44 overflow-hidden">
          <ScrollArea class="h-[min(12rem,calc(var(--reka-dropdown-menu-content-available-height)-0.5rem))]">
            <DropdownMenuItem v-for="panel in panels.visiblePanels" :key="panel.id" @select="panels.select(panel.id)">
              <PanelIllustration :id="panel.id" class="size-4 object-contain" />
              {{ panel.label }}<span v-if="settings.prefs.favoritePanels.includes(panel.id)" aria-label="已收藏">★</span><span v-if="panels.activeId === panel.id" class="ml-auto">✓</span>
            </DropdownMenuItem>
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
      <div v-else class="absolute left-1 flex max-w-[6rem] items-center gap-1 text-xs font-semibold" :title="activePanel?.label">
        <PanelIllustration v-if="activePanel" :id="activePanel.id" class="size-4 shrink-0 object-contain" />
        <span class="truncate">{{ activePanel?.label }}</span>
      </div>
      <TooltipProvider :delay-duration="300">
        <Tooltip>
          <TooltipTrigger as-child>
            <Button
              variant="ghost"
              size="icon"
              class="absolute right-9 top-0 size-8 hover:bg-accent hover:text-accent-foreground"
              :class="pinned ? 'bg-accent text-primary' : 'text-muted-foreground'"
              :aria-label="pinned ? '取消固定面板' : '固定面板'"
              :aria-pressed="pinned"
              @pointerdown.stop
              @click="emit('togglePin')"
            >
              <PinOff v-if="pinned" class="size-4" aria-hidden="true" />
              <Pin v-else class="size-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{{ pinned ? '取消固定面板' : '固定面板' }}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="absolute right-0.5 top-0 size-8 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="设置"
            @pointerdown.stop
          >
            <Settings class="size-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" class="text-xs [&_[data-slot=dropdown-menu-item]]:py-1.5">
          <DropdownMenuItem @click="openSettings">打开设置</DropdownMenuItem>
          <DropdownMenuItem @click="hideIsland">隐藏灵动岛（托盘可恢复）</DropdownMenuItem>
          <DropdownMenuItem @click="quitApp">退出 Islet 灵岛</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>

    <!-- 内容区统一从顶部铺满；左右保留翻页操作区，面板内部不要再添加整体外边距。 -->
    <div class="relative z-10 min-h-0 overflow-hidden">
      <div class="absolute inset-y-0" :class="settings.prefs.hidePanelArrows ? 'inset-x-2' : 'inset-x-6'">
        <Transition name="panel" mode="out-in">
          <component :is="PANEL_COMPONENTS[previewId ?? panels.activeId]" v-if="(open || renderContent) && (previewId || panels.visiblePanels.length)" :key="previewId ?? panels.activeId" class="h-full w-full min-h-0 min-w-0" />
        </Transition>
      </div>

      <!-- 左侧翻页箭头条（滚轮可切换面板） -->
      <div
        v-if="!settings.prefs.hidePanelArrows"
        class="absolute left-0 top-0 bottom-0 z-10 flex w-4 items-center justify-center"
        @wheel="handleWheel"
      >
        <Tooltip><TooltipTrigger as-child><Button
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="上一个面板"
          @click="panels.prev()"
        >
          <ChevronLeft class="size-4" aria-hidden="true" />
        </Button></TooltipTrigger><TooltipContent>上一个面板</TooltipContent></Tooltip>
      </div>
      <!-- 右侧翻页箭头条（滚轮可切换面板） -->
      <div
        v-if="!settings.prefs.hidePanelArrows"
        class="absolute right-0 top-0 bottom-0 z-10 flex w-4 items-center justify-center"
        @wheel="handleWheel"
      >
        <Tooltip><TooltipTrigger as-child><Button
          variant="ghost"
          size="icon"
          class="size-6 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          aria-label="下一个面板"
          @click="panels.next()"
        >
          <ChevronRight class="size-4" aria-hidden="true" />
        </Button></TooltipTrigger><TooltipContent>下一个面板</TooltipContent></Tooltip>
      </div>
    </div>

    <!-- 底部指示点（滚轮可切换面板） -->
    <div
      class="relative z-10 flex shrink-0 items-center justify-center pt-1"
      @wheel="handleWheel"
    >
      <ScrollArea v-if="settings.prefs.panelIndicatorStyle === 'dots'" ref="indicatorArea" class="min-w-0 max-w-[calc(100%-4rem)]"><div class="flex w-max items-center justify-center">
        <Button v-for="p in panels.visiblePanels" :key="p.id"
          variant="ghost"
          size="icon"
          class="size-4 shrink-0 hover:bg-transparent"
          :aria-label="p.label"
          :data-active="panels.activeId === p.id"
          :aria-current="panels.activeId === p.id ? 'true' : undefined"
          @click="panels.select(p.id)"
        >
          <span
            class="block rounded-full transition-all"
            :class="panels.activeId === p.id ? 'h-1.5 w-4 bg-foreground' : 'size-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70'"
          />
        </Button>
      </div><ScrollBar orientation="horizontal" class="invisible pointer-events-none" /></ScrollArea>
      <DropdownMenu v-if="settings.prefs.panelIndicatorStyle === 'text'"><DropdownMenuTrigger as-child><Button variant="ghost" class="h-5 px-2 text-xs font-medium" aria-label="选择面板">{{ panels.visiblePanels.find((p) => p.id === panels.activeId)?.label }}<span class="ml-1 font-normal text-muted-foreground">{{ panels.index + 1 }} / {{ panels.visiblePanels.length }}</span></Button></DropdownMenuTrigger><DropdownMenuContent align="center" class="max-h-48 overflow-y-auto"><DropdownMenuItem v-for="panel in panels.visiblePanels" :key="panel.id" @select="panels.select(panel.id)"><PanelIllustration :id="panel.id" class="size-4 object-contain" />{{ panel.label }}<span v-if="panels.activeId === panel.id" class="ml-auto">✓</span></DropdownMenuItem></DropdownMenuContent></DropdownMenu>
    </div>
  </div>
</template>

<style scoped>
.panel-enter-active,
.panel-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}
@media (prefers-reduced-motion: reduce) {
  .panel-enter-active,
  .panel-leave-active { transition: none; }
}
.panel-enter-from,
.panel-leave-to {
  opacity: 0;
  transform: translateY(5px) scale(0.985);
}
</style>
