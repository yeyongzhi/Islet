<script lang="ts" setup>
import { ref } from 'vue'
import { Database, Info, Palette } from 'lucide-vue-next'
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import AboutSection from '@/components/settings/AboutSection.vue'
import AppearanceSection from '@/components/settings/AppearanceSection.vue'
import DataSection from '@/components/settings/DataSection.vue'

type SettingsCategory = 'appearance' | 'data' | 'about'

const CATEGORIES: { id: SettingsCategory; label: string; icon: Component }[] = [
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'data', label: '数据', icon: Database },
  { id: 'about', label: '关于', icon: Info },
]

const active = ref<SettingsCategory>('appearance')

const TITLES: Record<SettingsCategory, string> = {
  appearance: '外观',
  data: '数据',
  about: '关于',
}
</script>

<template>
  <!-- 设置窗口布局：左侧分类导航 + 右侧内容（滚动区域） -->
  <div class="flex h-screen">
    <nav class="flex w-44 shrink-0 flex-col gap-1 border-r p-3" aria-label="设置分类">
      <Button
        v-for="c in CATEGORIES"
        :key="c.id"
        variant="ghost"
        class="justify-start gap-2"
        :class="active === c.id ? 'bg-accent text-accent-foreground' : ''"
        :aria-pressed="active === c.id"
        @click="active = c.id"
      >
        <component :is="c.icon" class="size-4" aria-hidden="true" />
        {{ c.label }}
      </Button>
    </nav>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex shrink-0 items-center px-6 pt-5">
        <h1 class="text-base font-semibold">{{ TITLES[active] }}</h1>
      </header>
      <Separator class="mt-3" />
      <ScrollArea class="min-h-0 flex-1">
        <div class="px-6 py-5">
          <AppearanceSection v-if="active === 'appearance'" />
          <DataSection v-else-if="active === 'data'" />
          <AboutSection v-else />
        </div>
      </ScrollArea>
    </div>
  </div>
</template>
