<script lang="ts" setup>
import CompactPill from '@/components/island/CompactPill.vue'
import ExpandedPanel from '@/components/island/ExpandedPanel.vue'
import { useIslandStore } from '@/stores/island'

const island = useIslandStore()
</script>

<template>
  <!-- 悬停展开：鼠标进入窗口展开面板，移出后收起为胶囊 -->
  <main
    class="fixed inset-0 flex items-start justify-center"
    @mouseenter="island.setExpanded(true)"
    @mouseleave="island.setExpanded(false)"
  >
    <Transition name="island" mode="out-in">
      <CompactPill v-if="!island.expanded" />
      <ExpandedPanel v-else />
    </Transition>
  </main>
</template>

<style scoped>
.island-enter-active,
.island-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}
.island-enter-from,
.island-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
