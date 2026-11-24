<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { Switch } from '@/components/ui/switch'
import IslandPill from '@/components/island/IslandPill.vue'
import { COMPACT_ITEMS, useSettingsStore, type CompactItem } from '@/stores/settings'

const settings = useSettingsStore()
const enabled = computed(() => settings.prefs.compactItems)
const disabled = computed(() => COMPACT_ITEMS.filter(item => !enabled.value.includes(item.id)))
const preview = ref<HTMLElement | null>(null)
const dragging = ref<CompactItem | null>(null)
function label(id: CompactItem) { return COMPACT_ITEMS.find(item => item.id === id)!.label }
function toggle(id: CompactItem, value: boolean) {
  settings.setCompactItems(value ? [...enabled.value, id] : enabled.value.filter(item => item !== id))
}
function move(id: CompactItem, to: number) {
  const items = [...enabled.value]
  const from = items.indexOf(id)
  const target = Math.max(0, Math.min(items.length - 1, to))
  if (from < 0 || from === target) return
  items.splice(from, 1)
  items.splice(target, 0, id)
  settings.setCompactItems(items)
}
function startDrag(id: CompactItem, event: PointerEvent) {
  if (event.button !== 0) return
  dragging.value = id
  window.addEventListener('pointermove', onDrag)
  window.addEventListener('pointerup', endDrag)
  window.addEventListener('pointercancel', endDrag)
}
function onDrag(event: PointerEvent) {
  if (!dragging.value || !preview.value) return
  const items = [...preview.value.querySelectorAll<HTMLElement>('[data-compact-item]')]
  if (!items.length) return
  const target = items.findIndex(item => event.clientX < item.getBoundingClientRect().left + item.getBoundingClientRect().width / 2)
  move(dragging.value, target < 0 ? items.length - 1 : target)
}
function moveBy(id: CompactItem, direction: number) { move(id, enabled.value.indexOf(id) + direction) }
function endDrag() {
  dragging.value = null
  window.removeEventListener('pointermove', onDrag)
  window.removeEventListener('pointerup', endDrag)
  window.removeEventListener('pointercancel', endDrag)
}
onBeforeUnmount(endDrag)
</script>
<template>
  <div class="flex max-w-xl flex-col gap-5">
    <div><h3 class="text-sm font-semibold">收起状态</h3><p class="mt-1 text-xs text-muted-foreground">选择显示内容，直接拖动预览中的内容调整顺序，修改立即生效；也可聚焦内容后使用左右方向键。</p></div>
    <div class="flex justify-center rounded-lg bg-muted/30 p-4">
      <div ref="preview" class="h-10 w-[250px] overflow-hidden bg-background text-foreground" :style="{ borderRadius: `${Math.min(20, settings.prefs.borderRadius + 4)}px`, boxShadow: 'var(--island-shadow)' }" aria-label="收起状态预览"><IslandPill edit-mode @drag-start="startDrag" @move="moveBy" /></div>
    </div>
    <p class="text-xs text-muted-foreground">番茄钟运行和通知出现时会临时优先显示；左右停靠时显示紧凑图标。内容过多时可能被截断。</p>
    <div class="flex flex-col gap-2" aria-label="已显示的内容">
      <div v-for="id in enabled" :key="id" class="flex items-center gap-2 rounded-lg border p-3">
        <span class="min-w-0 flex-1 text-sm">{{ label(id) }}</span>
        <Switch :model-value="true" :aria-label="`显示${label(id)}`" @update:model-value="value => toggle(id, !!value)" />
      </div>
    </div>
    <div v-if="disabled.length" class="flex flex-col gap-2">
      <p class="text-xs text-muted-foreground">可添加的内容</p>
      <div v-for="item in disabled" :key="item.id" class="flex items-center justify-between rounded-lg border p-3"><span class="text-sm">{{ item.label }}</span><Switch :model-value="false" :aria-label="`显示${item.label}`" @update:model-value="value => toggle(item.id, !!value)" /></div>
    </div>
  </div>
</template>
