<script lang="ts" setup>
import { invoke } from '@tauri-apps/api/core'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import IslandPill from '@/components/island/IslandPill.vue'
import IslandPanel from '@/components/island/IslandPanel.vue'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore, type IslandEdge } from '@/stores/settings'

const island = useIslandStore()
const settings = useSettingsStore()

/** 壳层视觉状态：驱动胶囊 ↔ 面板的形变动画 */
const open = ref(false)
/** 收起动画结束后再缩小窗口的定时器 */
let collapseTimer: number | undefined

const MORPH_DURATION_MS = 460

/** 各停靠边的收起态尺寸（与 Rust 侧常量一致） */
const COMPACT_DIMS: Record<IslandEdge, { w: number; h: number; r: number }> = {
  top: { w: 360, h: 44, r: 22 },
  bottom: { w: 360, h: 44, r: 22 },
  left: { w: 48, h: 48, r: 16 },
  right: { w: 48, h: 48, r: 16 },
}

const shellStyle = computed(() => {
  const dims = COMPACT_DIMS[settings.prefs.islandEdge] ?? COMPACT_DIMS.top
  return open.value
    ? { width: '540px', height: '360px', borderRadius: '24px' }
    : { width: `${dims.w}px`, height: `${dims.h}px`, borderRadius: `${dims.r}px` }
})

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

function handleEnter() {
  if (open.value) return
  window.clearTimeout(collapseTimer)
  // 窗口先扩到面板尺寸（瞬时），壳层随后从胶囊动画形变为面板
  island.setExpanded(true)
  open.value = true
}

function handleLeave() {
  if (!open.value) return
  // 壳层先动画收拢回胶囊，动画结束后窗口再缩小
  open.value = false
  collapseTimer = window.setTimeout(
    () => island.setExpanded(false),
    MORPH_DURATION_MS + 40,
  )
}

/** 按住拖动：拖动结束后吸附到最近边并恢复展开状态 */
async function beginDrag(event: PointerEvent) {
  if (event.button !== 0) return
  try {
    await invoke('start_drag')
    const res = await invoke<{ edge: string; offset: number }>('finish_drag', {
      currentEdge: settings.prefs.islandEdge,
    })
    settings.updateIslandLayout(res.edge as IslandEdge, res.offset)
    // finish_drag 会收起窗口；若拖动前处于展开态则重新展开
    await invoke('set_island_layout', {
      edge: res.edge,
      expanded: island.expanded,
      offset: res.offset,
    })
  } catch {
    // 非 Tauri 环境忽略
  }
}

onMounted(() => {
  // 按持久化偏好应用初始停靠布局
  invoke('set_island_layout', {
    edge: settings.prefs.islandEdge,
    expanded: false,
    offset: settings.prefs.islandOffset,
  }).catch(() => {})
})

onBeforeUnmount(() => window.clearTimeout(collapseTimer))
</script>

<template>
  <!-- 悬停展开：鼠标进入窗口动画展开为面板，移出后动画收回胶囊；支持四边停靠 -->
  <main class="fixed inset-0 flex" :class="anchorClass" @mouseenter="handleEnter" @mouseleave="handleLeave">
    <div class="island-shell" :class="{ 'island-shell--open': open }" :style="shellStyle">
      <!-- 收起层：胶囊内容 -->
      <div class="island-pill-layer" @pointerdown="beginDrag">
        <IslandPill />
      </div>
      <!-- 展开层：面板内容 -->
      <div class="island-panel-layer">
        <IslandPanel @drag="beginDrag" />
      </div>
    </div>
  </main>
</template>

<style scoped>
/* 灵动岛壳层：从胶囊（360×44 或 48×48）形变为面板（540×360） */
.island-shell {
  position: relative;
  background: rgb(10 10 10 / 95%);
  /* 透明窗口下不做外投影：阴影会被窗口矩形裁剪出灰色残边 */
  box-shadow: 0 0 0 1px rgb(255 255 255 / 8%);
  overflow: hidden;
  user-select: none;
  transition:
    width 460ms cubic-bezier(0.22, 1, 0.36, 1),
    height 460ms cubic-bezier(0.22, 1, 0.36, 1),
    border-radius 460ms cubic-bezier(0.22, 1, 0.36, 1);
}

.island-pill-layer {
  position: absolute;
  inset: 0;
  color: white;
  opacity: 1;
  transform: scale(1);
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.island-shell--open .island-pill-layer {
  opacity: 0;
  transform: scale(0.92);
  pointer-events: none;
}

.island-panel-layer {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transform: scale(0.96);
  transform-origin: top center;
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

.island-shell--open .island-panel-layer {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
  transition-delay: 160ms;
}
</style>
