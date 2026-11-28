<script setup lang="ts">
import { panelIllustration } from '@/lib/panelIllustrations'
import type { PanelId } from '@/stores/panels'
defineProps<{ id: PanelId }>()
</script>

<template>
  <img :src="panelIllustration(id)" alt="" aria-hidden="true" />
</template>
