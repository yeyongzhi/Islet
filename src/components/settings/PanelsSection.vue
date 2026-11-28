<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { computed, ref, watch } from 'vue'
import { ArrowLeft, ArrowUpDown, ChevronRight, GripVertical, Search } from 'lucide-vue-next'
import { CalendarDate } from '@internationalized/date'
import type { DateValue } from 'reka-ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import PanelIllustration from '@/components/island/PanelIllustration.vue'
import { PANEL_SIZES, useSettingsStore } from '@/stores/settings'
import PanelPreview from '@/components/settings/PanelPreview.vue'
import CountdownEditor from '@/components/settings/CountdownEditor.vue'
import EventsEditor from '@/components/settings/EventsEditor.vue'
import PomodoroSettings from '@/components/settings/PomodoroSettings.vue'
import QuickstartEditor from '@/components/settings/QuickstartEditor.vue'
import GalleryEditor from '@/components/settings/GalleryEditor.vue'
import {
  PANELS,
  PANEL_CATEGORY_ORDER,
  PANEL_OPTIONS,
  type PanelId,
} from '@/stores/panels'

const settings = useSettingsStore()

interface Row {
  id: PanelId
  label: string
  icon: (typeof PANELS)[number]['icon']
  desc: string
  enabled: boolean
}

/** 全局顺序（排序页拖动即时交换，松手落盘） */
const order = ref<PanelId[]>([])
const enabledMap = ref<Record<string, boolean>>({})
const query = ref('')

/** 页面状态：列表（网格）/ 排序 / 卡片详情 */
const view = ref<'list' | 'sort' | 'detail'>('list')
const detailId = ref<PanelId | null>(null)

function syncFromPrefs() {
  const prefOrder = settings.prefs.panelOrder
  const disabled = new Set(settings.prefs.disabledPanels)
  order.value = PANELS.map((p) => p.id).sort(
    (a, b) => prefOrder.indexOf(a) - prefOrder.indexOf(b),
  )
  const map: Record<string, boolean> = {}
  for (const p of PANELS) map[p.id] = !disabled.has(p.id)
  enabledMap.value = map
}

syncFromPrefs()
watch(
  () => [settings.prefs.panelOrder, settings.prefs.disabledPanels] as const,
  () => {
    if (!dragging.value) syncFromPrefs()
  },
)

function setEnabled(id: PanelId, enabled: boolean) {
  const disabled = new Set(settings.prefs.disabledPanels)
  if (enabled) {
    disabled.delete(id)
    settings.set('favoritePanels', settings.prefs.favoritePanels.filter((item) => item !== id))
    settings.set('panelOrder', [...settings.prefs.panelOrder.filter((item) => item !== id), id])
  } else disabled.add(id)
  settings.set('disabledPanels', [...disabled])
}

function setGroupEnabled(rows: Row[], enabled: boolean) {
  const disabled = new Set(settings.prefs.disabledPanels)
  for (const row of rows) {
    if (enabled) disabled.delete(row.id)
    else disabled.add(row.id)
  }
  settings.set('disabledPanels', [...disabled])
}

function matchQuery(row: Row) {
  const q = query.value.trim().toLowerCase()
  if (!q) return true
  const meta = PANELS.find((p) => p.id === row.id)!
  return (
    row.label.toLowerCase().includes(q) ||
    row.desc.toLowerCase().includes(q) ||
    meta.category.includes(q)
  )
}

/** 分类分组网格视图 */
const groups = computed(() =>
  PANEL_CATEGORY_ORDER.map((category) => ({
    category,
    rows: PANELS
      .filter((p) => p.category === category)
      .map((p) => ({ ...p, enabled: enabledMap.value[p.id] ?? false }))
      .filter(matchQuery),
  })).filter((g) => g.rows.length > 0),
)

const noResult = computed(() => groups.value.length === 0)

/** 排序页的全局行（含启用状态） */
const sortRows = computed(() =>
  order.value.filter((id) => enabledMap.value[id]).map((id) => {
    const meta = PANELS.find((p) => p.id === id)!
    return { ...meta, enabled: enabledMap.value[id] ?? false }
  }),
)

function commitOrder() {
  settings.set('panelOrder', [...order.value])
}

// —— 排序页：指针拖动全局排序 ——
const dragging = ref<PanelId | null>(null)
let startY = 0
let step = 48

function onSortGrabDown(row: Row, event: PointerEvent) {
  if (event.button !== 0 || dragging.value) return
  event.preventDefault()
  dragging.value = row.id
  startY = event.clientY
  const el = (event.currentTarget as HTMLElement).closest('[data-row]') as HTMLElement
  step = el.offsetHeight + 6
  el.setPointerCapture?.(event.pointerId)
  window.addEventListener('pointermove', onSortMove)
  window.addEventListener('pointerup', onSortEnd)
  window.addEventListener('pointercancel', onSortEnd)
}

function onSortMove(event: PointerEvent) {
  if (!dragging.value) return
  const visible = order.value.filter((id) => enabledMap.value[id])
  const from = visible.indexOf(dragging.value)
  const to = Math.max(0, Math.min(visible.length - 1, from + Math.round((event.clientY - startY) / step)))
  if (to === from) return
  const target = visible[to]!
  const [moved] = order.value.splice(order.value.indexOf(dragging.value), 1)
  const targetIndex = order.value.indexOf(target)
  order.value.splice(targetIndex + (to > from ? 1 : 0), 0, moved!)
  startY = event.clientY
}

function onSortEnd() {
  window.removeEventListener('pointermove', onSortMove)
  window.removeEventListener('pointerup', onSortEnd)
  window.removeEventListener('pointercancel', onSortEnd)
  const wasDragging = dragging.value
  dragging.value = null
  if (wasDragging) commitOrder()
}

// —— 卡片详情页 ——
/** 入职日期选择（Popover + Calendar，符合官方 Date Picker 方案） */
const dateOpen = ref(false)
const joinDateValue = ref<DateValue | null>(null)

/** 进入详情：编辑设置 + 预览 */
function openDetail(id: PanelId) {
  view.value = 'detail'
  detailId.value = id
  // 进入下班卡时把已存日期回填到日历
  if (id === 'offwork') {
    const saved = settings.getPanelOption('offwork', 'joinDate', '') as string
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(saved)
    joinDateValue.value = m
      ? new CalendarDate(Number(m[1]), Number(m[2]), Number(m[3]))
      : null
  }
}

watch(joinDateValue, (v) => {
  if (v && detailId.value === 'offwork') {
    setOption(
      'offwork',
      'joinDate',
      `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`,
    )
    dateOpen.value = false
  }
})

/** Calendar 双向绑定中转（规避 reka-ui 与 @internationalized/date 的类型重复声明问题） */
const joinDateModel = computed({
  get: () => joinDateValue.value as never,
  set: (v: never) => {
    joinDateValue.value = v as DateValue | null
  },
})

function optionValue(id: PanelId, key: string, fallback: boolean | string) {
  return settings.getPanelOption(id, key, fallback)
}

function setOption(id: PanelId, key: string, value: boolean | string) {
  settings.setPanelOption(id, key, value)
}

function optionsOf(id: PanelId) {
  return PANEL_OPTIONS[id]
}

/** 入职日期显示文本 */
function joinDateLabel() {
  const v = optionValue('offwork', 'joinDate', '') as string
  return v || '未设置'
}

/** 当前详情卡的选项与元信息 */
const detailOptions = computed(() => (detailId.value ? optionsOf(detailId.value) : []))
const detailMeta = computed(() => (detailId.value ? PANELS.find((p) => p.id === detailId.value) : null))
</script>

<template>
  <div class="flex w-full min-w-0 flex-col gap-4" :class="view !== 'list' ? 'max-w-xl' : ''">
    <!-- 卡片详情页：独立编辑设置 + 实时预览 -->
    <template v-if="view === 'detail' && detailId">
      <div class="flex items-center gap-2">
        <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-8" aria-label="返回列表" @click="view = 'list'">
          <ArrowLeft class="size-4" aria-hidden="true" />
        </Button></TooltipTrigger><TooltipContent>返回列表</TooltipContent></Tooltip>
        <PanelIllustration :id="detailId" class="size-4 object-contain" />
        <p class="text-sm font-semibold">{{ detailMeta!.label }}</p>
      </div>

      <div class="flex items-center justify-between rounded-lg border border-border px-3 py-2">
        <div><p class="text-sm">收藏并置顶</p><p class="text-xs text-muted-foreground">在灵动岛面板列表中优先显示</p></div>
        <Switch :model-value="settings.prefs.favoritePanels.includes(detailId)" aria-label="收藏并置顶面板" @update:model-value="(v) => settings.set('favoritePanels', v ? [...settings.prefs.favoritePanels.filter((id) => id !== detailId), detailId!] : settings.prefs.favoritePanels.filter((id) => id !== detailId))" />
      </div>

      <!-- 编辑器：倒数日 / 快速启动为独立编辑器，其余为选项行 -->
      <GalleryEditor v-if="detailId === 'gallery'" />
      <EventsEditor v-else-if="detailId === 'calendar'" />
      <CountdownEditor v-else-if="detailId === 'countdown'" />
      <QuickstartEditor v-else-if="detailId === 'quickstart'" />
      <PomodoroSettings v-else-if="detailId === 'pomodoro'" />
      <div v-if="detailId === 'water'" class="flex items-center justify-between gap-3 rounded-lg border p-3"><span class="text-sm">每日目标杯数</span><Select :model-value="String(settings.prefs.waterGoal)" @update:model-value="v => settings.set('waterGoal', Number(v))"><SelectTrigger class="w-28" aria-label="每日目标杯数"><SelectValue /></SelectTrigger><SelectContent><SelectGroup><SelectItem v-for="n in [4, 6, 8, 10, 12]" :key="n" :value="String(n)">{{ n }} 杯</SelectItem></SelectGroup></SelectContent></Select></div>
      <div
        v-if="detailOptions.length"
        class="flex flex-col gap-1 rounded-lg border border-border bg-card px-3 py-1"
      >
        <div
          v-for="opt in detailOptions"
          :key="opt.key"
          class="flex items-center justify-between border-border/60 py-2.5 [&:not(:first-child)]:border-t"
        >
          <template v-if="opt.type === 'switch'">
            <span class="text-sm">{{ opt.label }}</span>
            <Switch
              :model-value="optionValue(detailId!, opt.key, opt.default) as boolean"
              :aria-label="opt.label"
              @update:model-value="(v) => setOption(detailId!, opt.key, !!v)"
            />
          </template>

          <template v-else-if="opt.type === 'select'">
            <span class="text-sm">{{ opt.label }}</span>
            <Select
              :model-value="(optionValue(detailId!, opt.key, opt.default) as string)"
              @update:model-value="(v) => setOption(detailId!, opt.key, v as string)"
            >
              <SelectTrigger class="h-8 w-28 text-xs" :aria-label="opt.label">
                <SelectValue />
              </SelectTrigger>
              <SelectContent class="z-50 text-xs">
                <SelectGroup>
                <SelectItem
                  v-for="o in opt.options"
                  :key="o.value"
                  :value="o.value"
                >{{ o.label }}</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </template>

          <template v-else-if="opt.type === 'date'">
            <span class="text-sm">{{ opt.label }}</span>
            <Popover v-model:open="dateOpen">
              <PopoverTrigger as-child>
                <Button variant="outline" size="sm" class="h-8 text-xs">
                  {{ joinDateLabel() }}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" class="w-auto p-2">
                <Calendar
                  v-model="joinDateModel"
                  locale="zh-CN"
                  :display-format-options="{ year: 'numeric', month: 'long' }"
                />
              </PopoverContent>
            </Popover>
          </template>
        </div>
      </div>

      <!-- 固定示例，不挂载实时面板或触发实际操作。 -->
      <div class="flex flex-col gap-1.5">
        <p class="text-xs text-muted-foreground">面板预览 · 示例数据</p>
        <div class="flex items-center justify-center overflow-hidden rounded-lg p-3" :style="{ minHeight: `${PANEL_SIZES[settings.prefs.panelSize].h * 0.8 + 24}px` }" aria-label="卡片预览">
          <div :style="{ width: `${PANEL_SIZES[settings.prefs.panelSize].w}px`, height: `${PANEL_SIZES[settings.prefs.panelSize].h}px`, zoom: 0.8, borderRadius: `${Math.min(28, settings.prefs.borderRadius + 4)}px`, background: 'var(--background)', boxShadow: 'var(--island-shadow)', overflow: 'hidden' }">
            <PanelPreview :id="detailId" />
          </div>
        </div>
      </div>
    </template>

    <!-- 排序页 -->
    <template v-else-if="view === 'sort'">
      <div class="flex items-center gap-2">
        <Tooltip><TooltipTrigger as-child><Button variant="ghost" size="icon" class="size-8" aria-label="返回列表" @click="view = 'list'">
          <ArrowLeft class="size-4" aria-hidden="true" />
        </Button></TooltipTrigger><TooltipContent>返回列表</TooltipContent></Tooltip>
        <p class="text-sm font-semibold">调整卡片顺序</p>
        <span class="text-xs text-muted-foreground">按住手柄上下拖动，即对应灵动岛指示点顺序</span>
      </div>

      <div class="flex flex-col gap-1.5" role="list" aria-label="卡片顺序">
        <div
          v-for="(row, i) in sortRows"
          :key="row.id"
          data-row
          role="listitem"
          class="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5 transition-shadow"
          :class="dragging === row.id ? 'shadow-lg ring-1 ring-primary' : ''"
        >
          <span
            class="-mx-1 flex size-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-muted-foreground hover:bg-accent active:cursor-grabbing"
            aria-label="拖动排序"
            @pointerdown="onSortGrabDown(row, $event)"
          >
            <GripVertical class="size-4" aria-hidden="true" />
          </span>
          <span class="w-5 shrink-0 text-center text-xs text-muted-foreground tabular-nums">{{ i + 1 }}</span>
          <PanelIllustration :id="row.id" class="size-4 shrink-0 object-contain" />
          <span class="min-w-0 flex-1 truncate text-sm" :class="row.enabled ? '' : 'text-muted-foreground'">
            {{ row.label }}
          </span>
          <span class="shrink-0 text-xs text-muted-foreground">{{ row.enabled ? '展示中' : '已关闭' }}</span>
        </div>
      </div>
    </template>

    <!-- 卡片列表页（网格布局） -->
    <template v-else>
      <p class="text-xs text-muted-foreground">
        按分类管理卡片：开启即添加到灵动岛；点箭头进入卡片详情设置。
      </p>

      <!-- 搜索 + 排序入口 -->
      <div class="flex gap-2">
        <div class="relative min-w-0 flex-1">
          <Search
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            v-model="query"
            class="h-9 bg-card pl-9"
            placeholder="搜索卡片，如：时间、CPU、下班"
            aria-label="搜索面板卡片"
          />
        </div>
        <Button variant="outline" size="sm" class="h-9 shrink-0 gap-1.5 text-xs" @click="view = 'sort'">
          <ArrowUpDown class="size-4" aria-hidden="true" />
          调整顺序
        </Button>
      </div>

      <section
        v-for="group in groups"
        :key="group.category"
        class="flex flex-col gap-2"
      >
        <div class="flex items-center justify-between gap-3">
          <h3 class="flex items-baseline gap-2 text-base font-semibold">
            {{ group.category }}
            <span class="text-xs font-normal text-muted-foreground">{{ group.rows.length }} 张卡片</span>
          </h3>
          <div class="flex shrink-0 items-center gap-2">
            <Button size="sm" class="h-8" :disabled="group.rows.every((row) => row.enabled)" :aria-label="`开启${group.category}${query.trim() ? '搜索结果' : '分类全部面板'}`" @click="setGroupEnabled(group.rows, true)">{{ query.trim() ? '开启结果' : '全部开启' }}</Button>
            <Button variant="outline" size="sm" class="h-8" :disabled="group.rows.every((row) => !row.enabled)" :aria-label="`关闭${group.category}${query.trim() ? '搜索结果' : '分类全部面板'}`" @click="setGroupEnabled(group.rows, false)">{{ query.trim() ? '关闭结果' : '全部关闭' }}</Button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-2.5">
          <div
            v-for="row in group.rows"
            :key="row.id"
            class="flex flex-col gap-1.5 rounded-lg border border-border bg-card p-3"
          >
            <div class="flex items-center justify-between">
              <PanelIllustration :id="row.id" class="size-4 object-contain" />
              <Switch
                :model-value="row.enabled"
                :aria-label="`${row.enabled ? '移除' : '添加'}${row.label}卡片`"
                @update:model-value="(v) => setEnabled(row.id, !!v)"
              />
            </div>
            <div class="flex items-end justify-between gap-1.5">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium" :class="row.enabled ? '' : 'text-muted-foreground'">
                  {{ row.label }}
                </p>
                <p class="truncate text-xs text-muted-foreground/80">{{ row.desc }}</p>
              </div>
              <Tooltip><TooltipTrigger as-child><Button
                variant="ghost"
                size="icon"
                class="size-7 shrink-0 text-muted-foreground"
                :aria-label="`${row.label}设置`"
                @click="openDetail(row.id)"
              >
                <ChevronRight class="size-4" aria-hidden="true" />
              </Button></TooltipTrigger><TooltipContent>{{ `${row.label}设置` }}</TooltipContent></Tooltip>
            </div>
          </div>
        </div>
      </section>

      <p v-if="noResult" class="py-6 text-center text-sm text-muted-foreground">
        没有匹配「{{ query }}」的卡片
      </p>

      <p class="text-xs text-muted-foreground">
        关闭的卡片不会占用灵动岛指示点；建议至少保留一张卡片开启。
      </p>
    </template>
  </div>
</template>

<style scoped>
/* 行位置变化的平滑移动 */
.rows-move {
  transition: transform 180ms ease;
}

.rows-enter-active,
.rows-leave-active {
  transition:
    opacity 150ms ease,
    transform 150ms ease;
}

.rows-enter-from,
.rows-leave-to {
  opacity: 0;
}
</style>
