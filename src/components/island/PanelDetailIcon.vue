<script setup lang="ts">
const props = defineProps<{ name: string }>()
const images = import.meta.glob<string>('@/assets/panel-details/*.png', { eager: true, query: '?url', import: 'default' })
const panelImages = import.meta.glob<string>('@/assets/panel-illustrations/*.png', { eager: true, query: '?url', import: 'default' })
const image = (name: string) => images[`/src/assets/panel-details/${name}.png`] ?? panelImages[`/src/assets/panel-illustrations/${name}.png`] ?? ''
</script>
<template>
  <img :src="image(props.name)" class="size-4 shrink-0 object-contain" alt="" aria-hidden="true" />
</template>
