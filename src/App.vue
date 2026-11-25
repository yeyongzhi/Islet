<script lang="ts" setup>
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
</script>

<template>
  <TooltipProvider :delay-duration="300"><RouterView /></TooltipProvider>
  <!-- 操作结果反馈（复制成功等） -->
  <Toaster position="top-center" rich-colors close-button />
</template>
