<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { getCurrentWindow } from '@tauri-apps/api/window'
import {
  Bell,
  Database,
  Info,
  LayoutGrid,
  Minus,
  Palette,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  Shield,
  Square,
  X,
} from 'lucide-vue-next'
import type { Component } from 'vue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import AboutSection from '@/components/settings/AboutSection.vue'
import AppearanceSection from '@/components/settings/AppearanceSection.vue'
import DataSection from '@/components/settings/DataSection.vue'
import GeneralSection from '@/components/settings/GeneralSection.vue'
import NotificationSection from '@/components/settings/NotificationSection.vue'
import PanelsSection from '@/components/settings/PanelsSection.vue'
import PrivacySection from '@/components/settings/PrivacySection.vue'
import { useSettingsStore } from '@/stores/settings'

const settings = useSettingsStore()
const win = getCurrentWindow()

// 设置窗口：无边框透明壳（圆角跟随全局圆角），body 保持透明
onMounted(() => {
  document.body.style.background = 'transparent'
  document.documentElement.style.background = 'transparent'
  document.body.style.minHeight = '100vh'
})

type SettingsCategory = 'general' | 'appearance' | 'panels' | 'notify' | 'privacy' | 'data' | 'about'

const CATEGORIES: { id: SettingsCategory; label: string; icon: Component }[] = [
  { id: 'general', label: '通用', icon: Settings2 },
  { id: 'appearance', label: '外观', icon: Palette },
  { id: 'panels', label: '面板', icon: LayoutGrid },
  { id: 'notify', label: '通知', icon: Bell },
  { id: 'privacy', label: '隐私', icon: Shield },
  { id: 'data', label: '数据', icon: Database },
  { id: 'about', label: '关于', icon: Info },
]

const active = ref<SettingsCategory>('general')
const collapsed = ref(false)

/** 窗口圆角跟随全局圆角（上限 24px 保证可读性） */
const windowRadius = computed(() => `${Math.min(24, Math.max(6, settings.prefs.borderRadius))}px`)

function minimize() {
  win.minimize().catch(() => {})
}

function toggleMaximize() {
  win.toggleMaximize().catch(() => {})
}

function close() {
  // Rust 侧拦截关闭：隐藏到托盘
  win.close().catch(() => {})
}
</script>

<template>
  <!-- 无边框窗口壳：整体圆角跟随全局圆角；透明窗口下用 CSS 阴影（系统阴影会使圆角变方角） -->
  <div
    class="flex h-screen flex-col overflow-hidden bg-background"
    :style="{ borderRadius: windowRadius, boxShadow: '0 10px 44px rgba(0, 0, 0, 0.28)' }"
  >
    <!-- 自绘标题栏：空白区域可拖动移动窗口 -->
    <header
      data-tauri-drag-region
      class="flex h-11 shrink-0 select-none items-center justify-between border-b border-border pl-4"
    >
      <p data-tauri-drag-region class="text-sm font-medium">WinIsland 设置</p>
      <div class="flex h-full items-center" @pointerdown.stop>
        <Button
          variant="ghost"
          size="icon"
          class="size-11 rounded-none text-muted-foreground hover:bg-accent"
          aria-label="最小化"
          @click="minimize"
        >
          <Minus class="size-4" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-11 rounded-none text-muted-foreground hover:bg-accent"
          aria-label="最大化/还原"
          @click="toggleMaximize"
        >
          <Square class="size-3.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-11 rounded-none text-muted-foreground hover:bg-red-500 hover:text-white"
          aria-label="关闭"
          @click="close"
        >
          <X class="size-4" aria-hidden="true" />
        </Button>
      </div>
    </header>

    <!-- 卡片式布局：侧边栏与内容区为两张圆角卡片，留有间距 -->
    <div class="flex min-h-0 flex-1 gap-3 bg-background p-3">
      <nav
        class="flex shrink-0 flex-col rounded-xl border border-border bg-card p-2"
        :class="collapsed ? 'w-14 items-center' : 'w-44 gap-1'"
        aria-label="设置分类"
      >
        <Button
          v-for="c in CATEGORIES"
          :key="c.id"
          variant="ghost"
        :class="[
          collapsed ? 'size-9 justify-center' : 'justify-start gap-2',
          active === c.id ? 'bg-primary/10 text-primary hover:bg-primary/15' : '',
        ]"
          :aria-pressed="active === c.id"
          :title="c.label"
          @click="active = c.id"
        >
          <component :is="c.icon" class="size-4" aria-hidden="true" />
          <span v-if="!collapsed">{{ c.label }}</span>
        </Button>

        <!-- 底部：收缩/展开侧边栏 -->
        <Button
          variant="ghost"
          size="icon"
          class="mt-auto size-9 self-center text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          :aria-label="collapsed ? '展开侧边栏' : '收起侧边栏'"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="collapsed = !collapsed"
        >
          <PanelLeftOpen v-if="collapsed" class="size-4" aria-hidden="true" />
          <PanelLeftClose v-else class="size-4" aria-hidden="true" />
        </Button>
      </nav>

      <div class="min-w-0 flex-1 overflow-hidden rounded-xl border border-border bg-card">
        <ScrollArea class="h-full">
          <div class="px-6 py-5">
            <GeneralSection v-if="active === 'general'" />
            <AppearanceSection v-else-if="active === 'appearance'" />
            <PanelsSection v-else-if="active === 'panels'" />
            <NotificationSection v-else-if="active === 'notify'" />
            <PrivacySection v-else-if="active === 'privacy'" />
            <DataSection v-else-if="active === 'data'" />
            <AboutSection v-else />
          </div>
        </ScrollArea>
      </div>
    </div>
  </div>
</template>
