<script lang="ts" setup>
import { RouterView } from 'vue-router'
import { Toaster } from '@/components/ui/sonner'
</script>

<template>
  <RouterView />
  <!-- 操作结果反馈（复制成功等） -->
  <Toaster position="top-center" rich-colors close-button />
</template>
