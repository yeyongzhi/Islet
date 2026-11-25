<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PANEL_SIZES, THEME_COLORS, useSettingsStore, type AppearanceMode, type PanelSize } from '@/stores/settings'

const settings = useSettingsStore()

const MODE_OPTIONS: { value: AppearanceMode; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '亮色' },
  { value: 'dark', label: '暗色（默认）' },
]

const PANEL_SIZE_OPTIONS = (Object.keys(PANEL_SIZES) as PanelSize[]).map((key) => ({
  value: key,
  label: key === 'small' ? `${PANEL_SIZES[key].label}（默认）` : PANEL_SIZES[key].label,
}))

const RADIUS_OPTIONS = [
  { value: '0', label: '直角 · 0 px' },
  { value: '4', label: '微圆角 · 4 px' },
  { value: '8', label: '小圆角 · 8 px' },
  { value: '12', label: '中圆角 · 12 px' },
  { value: '16', label: '大圆角 · 16 px' },
  { value: '24', label: '超大圆角 · 24 px（默认）' },
]

const FONT_OPTIONS = [
  { value: '14', label: '14 px（默认）' },
  { value: '15', label: '15 px' },
  { value: '16', label: '16 px' },
]
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">外观模式</h3>
      <Select
        :model-value="settings.prefs.appearanceMode"
        @update:model-value="(v) => settings.set('appearanceMode', v as AppearanceMode)"
      >
        <SelectTrigger class="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="m in MODE_OPTIONS" :key="m.value" :value="m.value">{{ m.label }}</SelectItem>
        </SelectContent>
      </Select>
      <p class="text-xs text-muted-foreground">
        外观模式即时作用于灵动岛与设置窗口；跟随系统时监听系统变化。
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">面板尺寸</h3>
      <Select
        :model-value="settings.prefs.panelSize"
        @update:model-value="(v) => settings.set('panelSize', v as PanelSize)"
      >
        <SelectTrigger class="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="s in PANEL_SIZE_OPTIONS" :key="s.value" :value="s.value">
            {{ s.label }} · {{ PANEL_SIZES[s.value].w }} × {{ PANEL_SIZES[s.value].h }} px
          </SelectItem>
        </SelectContent>
      </Select>
      <p class="text-xs text-muted-foreground">
        灵动岛展开面板的大小；内容随档位整体缩放，改选后悬停展开即可看到效果。
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">主题色</h3>
      <div class="flex flex-wrap gap-2">
        <Tooltip v-for="theme in THEME_COLORS" :key="theme.id"><TooltipTrigger as-child><Button
          variant="ghost" size="icon"
          type="button"
          class="flex size-8 items-center justify-center rounded-full transition-transform hover:scale-105"
          :style="{ backgroundColor: theme.primary }"
          :aria-label="`主题色：${theme.label}`"
          :aria-pressed="settings.prefs.themeColor === theme.id"
          @click="settings.set('themeColor', theme.id)"
        >
          <Check
            v-if="settings.prefs.themeColor === theme.id"
            class="size-4 text-white"
            aria-hidden="true"
          />
        </Button></TooltipTrigger><TooltipContent>{{ `主题色：${theme.label}` }}</TooltipContent></Tooltip>
      </div>
      <p class="text-xs text-muted-foreground">
        主题色用于按钮、选中态等强调元素，即时生效。
      </p>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">全局圆角</h3>
      <Select
        :model-value="String(settings.prefs.borderRadius)"
        @update:model-value="(v) => settings.set('borderRadius', Number(v))"
      >
        <SelectTrigger class="w-64"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="r in RADIUS_OPTIONS" :key="r.value" :value="r.value">{{ r.label }}</SelectItem>
        </SelectContent>
      </Select>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">全局字体大小</h3>
      <Select
        :model-value="String(settings.prefs.fontSize)"
        @update:model-value="(v) => settings.set('fontSize', Number(v))"
      >
        <SelectTrigger class="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem v-for="f in FONT_OPTIONS" :key="f.value" :value="f.value">{{ f.label }}</SelectItem>
        </SelectContent>
      </Select>
    </section>
  </div>
</template>
