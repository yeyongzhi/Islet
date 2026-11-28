<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { weatherIcon } from '@/services/openMeteo'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { alignCompactItem, compactLayout, compactWidth, moveCompactItem } from '@/lib/compactLayout'
import IslandPill from '@/components/island/IslandPill.vue'
import RobotFace from '@/components/island/RobotFace.vue'
import { COMPACT_ITEMS, useSettingsStore, type CompactDateFormat, type CompactItem } from '@/stores/settings'

const settings = useSettingsStore()
const weatherIcons = [
  { label: '晴', code: 0 }, { label: '多云', code: 2 }, { label: '阴', code: 3 },
  { label: '雾', code: 45 }, { label: '雨', code: 61 }, { label: '雪', code: 71 },
  { label: '雷雨', code: 95 },
]
const enabled = computed(() => settings.prefs.compactItems)
const groups: { label: string; items: CompactItem[] }[] = [
  { label: '灵岛', items: ['face'] },
  { label: '日期与时间', items: ['time', 'date', 'weekday'] },
  { label: '状态信息', items: ['weather', 'battery'] },
]
const preview = ref<HTMLElement | null>(null)
const dragging = ref<CompactItem | null>(null)
const selected = ref<CompactItem | null>(null)
const draft = ref<{ items: CompactItem[]; positions: Partial<Record<CompactItem, number>> } | null>(null)
let dragOffset = 0
let dragPointer = -1
let dragTarget: HTMLElement | null = null
let dragFrame = 0
let lastPointerX = 0
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
function toggle(id: CompactItem, value: boolean) {
  if (!value && selected.value === id) selected.value = null
  settings.setCompactItems(value ? [...enabled.value, id] : enabled.value.filter(item => item !== id))
}
function startDrag(id: CompactItem, event: PointerEvent) {
  if (event.button !== 0 || selected.value !== id) return
  if (!preview.value) return
  event.preventDefault()
  const rect = preview.value.getBoundingClientRect()
  const item = compactLayout(enabled.value, settings.prefs.compactPositions, settings.prefs).find(item => item.id === id)
  if (!item) return
  dragOffset = (event.clientX - rect.left) * compactWidth(enabled.value, settings.prefs) / rect.width - item.left
  draft.value = { items: [...enabled.value], positions: { ...settings.prefs.compactPositions } }
  dragging.value = id
  dragPointer = event.pointerId
  dragTarget = event.currentTarget as HTMLElement
  dragTarget.setPointerCapture(event.pointerId)
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', cancelDrag)
}
function onDrag(event: PointerEvent) {
  if (event.pointerId !== dragPointer || !dragging.value || !preview.value) return
  lastPointerX = event.clientX
  if (dragFrame) return
  dragFrame = requestAnimationFrame(updateDrag)
}
function updateDrag() {
  dragFrame = 0
  if (!dragging.value || !preview.value || !draft.value) return
  const rect = preview.value.getBoundingClientRect()
  if (!rect.width) return
  const next = moveCompactItem(draft.value.items, draft.value.positions, dragging.value, (lastPointerX - rect.left) * compactWidth(draft.value.items, settings.prefs) / rect.width - dragOffset, settings.prefs)
  if (next) draft.value = next
}
function moveBy(id: CompactItem, direction: number) {
  const layout = compactLayout(enabled.value, settings.prefs.compactPositions, settings.prefs)
  const index = layout.findIndex(item => item.id === id)
  const item = layout[index]
  if (!item) return
  let desired = item.left + direction * 4
  const neighbor = layout[index + direction]
  if (neighbor && (direction > 0 ? item.left + item.width + 2 >= neighbor.left : item.left <= neighbor.left + neighbor.width + 2)) {
    desired = neighbor.left + neighbor.width / 2 - item.width / 2 + direction
  }
  const next = moveCompactItem(enabled.value, settings.prefs.compactPositions, id, desired, settings.prefs)
  if (next) settings.setCompactLayout(next.items, next.positions)
}

function align(id: CompactItem, alignment: 'left' | 'center' | 'right') {
  selected.value = id
  const next = alignCompactItem(enabled.value, settings.prefs.compactPositions, id, alignment, settings.prefs)
  if (next) settings.setCompactLayout(next.items, next.positions)
}

function clearSelection(event: PointerEvent) {
  if (event.button === 0 && !(event.target as Element).closest('[data-compact-item]')) selected.value = null
}

function finishDrag(commit: boolean) {
  if (dragFrame) { cancelAnimationFrame(dragFrame); updateDrag() }
  if (commit && draft.value) settings.setCompactLayout(draft.value.items, draft.value.positions)
  if (dragTarget?.hasPointerCapture(dragPointer)) dragTarget.releasePointerCapture(dragPointer)
  dragging.value = null
  draft.value = null
  dragTarget = null
  dragPointer = -1
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', cancelDrag)
}
function endDrag(event: PointerEvent) { if (event.pointerId === dragPointer) finishDrag(true) }
function cancelDrag(event: PointerEvent) { if (event.pointerId === dragPointer) finishDrag(false) }
onBeforeUnmount(() => finishDrag(false))
</script>
<template>
  <div class="flex max-w-xl flex-col gap-5">
    <div><h3 class="text-sm font-semibold">收起状态</h3><p class="mt-1 text-xs text-muted-foreground">单击选中内容后拖动调整位置，右键可快速对齐；选中后也可使用左右方向键。</p></div>
    <div class="overflow-x-auto rounded-lg bg-muted/30 p-4" @pointerdown="clearSelection">
      <div class="flex min-w-max justify-center">
        <div ref="preview" class="h-10 shrink-0 overflow-hidden bg-background text-foreground" :style="{ width: `${compactWidth(draft?.items ?? enabled, settings.prefs)}px`, borderRadius: `${Math.min(20, settings.prefs.borderRadius + 4)}px`, boxShadow: 'var(--island-shadow)' }" aria-label="收起状态预览"><IslandPill edit-mode :selected-item="selected" :preview-items="draft?.items" :preview-positions="draft?.positions" @select="selected = $event" @drag-start="startDrag" @move="moveBy" @align="align" /></div>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">番茄钟运行和通知出现时会临时优先显示；左右停靠时纵向显示所选内容。内容过多时可能被截断。</p>
    <section v-for="group in groups" :key="group.label" class="flex flex-col gap-2">
      <h4 class="text-sm font-semibold">{{ group.label }}</h4>
      <div class="grid grid-cols-2 gap-3">
        <Card v-for="id in group.items" :key="id" class="gap-3 py-3 shadow-none">
          <CardHeader class="flex flex-row items-center justify-between gap-2 px-3">
            <CardTitle class="text-sm">{{ label(id) }}</CardTitle>
            <Switch :model-value="enabled.includes(id)" :aria-label="`显示${label(id)}`" @update:model-value="value => toggle(id, !!value)" />
          </CardHeader>
          <CardContent v-if="id === 'time' || id === 'weather' || id === 'date'" class="flex items-center justify-between gap-2 px-3">
            <span class="shrink-0 text-xs text-muted-foreground">{{ id === 'time' ? '显示秒' : id === 'date' ? '日期格式' : '显示图标' }}</span>
            <Switch v-if="id === 'time'" :model-value="settings.prefs.compactShowSeconds" aria-label="时间显示秒" @update:model-value="value => settings.set('compactShowSeconds', !!value)" />
            <Select v-else-if="id === 'date'" :model-value="settings.prefs.compactDateFormat" @update:model-value="value => settings.set('compactDateFormat', value as CompactDateFormat)">
              <SelectTrigger class="min-w-0 w-36" aria-label="日期格式"><SelectValue /></SelectTrigger>
              <SelectContent><SelectGroup><SelectItem v-for="format in ['YYYY-MM-DD', 'YYYY/MM/DD', 'MM-DD', 'MM/DD', 'M/D']" :key="format" :value="format">{{ format }}</SelectItem></SelectGroup></SelectContent>
            </Select>
            <Switch v-else :model-value="settings.prefs.compactWeatherIcon" aria-label="天气显示图标" @update:model-value="value => settings.set('compactWeatherIcon', !!value)" />
          </CardContent>
          <CardContent v-if="id === 'face'" class="flex items-center gap-2 px-3">
            <div class="flex flex-wrap items-center gap-2"><span v-for="mood in (['neutral', 'happy', 'angry', 'sad', 'surprised'] as const)" :key="mood" class="flex flex-col items-center gap-1"><RobotFace :mood="mood" class="size-8 shrink-0" /><span class="text-xs text-muted-foreground">{{ { neutral: '平静', happy: '开心', angry: '生气', sad: '难过', surprised: '惊讶' }[mood] }}</span></span></div>
          </CardContent>
          <CardContent v-if="id === 'weather'" class="flex flex-wrap gap-x-3 gap-y-2 px-3" aria-label="天气图标预览">
            <span v-for="item in weatherIcons" :key="item.label" class="flex items-center gap-1 text-xs text-muted-foreground" :title="item.label">
              <PanelDetailIcon :name="weatherIcon(item.code)" />{{ item.label }}
            </span>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
