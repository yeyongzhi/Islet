<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettingsStore, PANEL_SIZES, type CompactStyle, type IslandEdge, type PanelIndicatorStyle, type WindowDisplayMode } from '@/stores/settings'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const settings = useSettingsStore()

const POSITION_OPTIONS: { value: IslandEdge; label: string }[] = [
  { value: 'top', label: '顶部' },
  { value: 'left', label: '左侧' },
  { value: 'right', label: '右侧' },
]

// —— 开机自启动（autostart 插件，注册表方式，无需持久化偏好） ——
const autoStart = ref(false)
const autoStartBusy = ref(false)
const monitors = ref<Array<{ id: string; label: string }>>([])
const monitorError = ref('')
const hotkeyAvailable = ref<boolean | null>(null)
const systemFonts = ref<string[]>([])
const fontError = ref('')

onMounted(async () => {
  try { systemFonts.value = await invoke<string[]>('list_system_fonts') } catch { fontError.value = '无法读取系统字体，当前字体设置仍会保留' }
  try { monitors.value = await invoke<Array<{ id: string; label: string }>>('list_island_monitors') } catch { monitorError.value = '无法读取显示器列表' }
  try { hotkeyAvailable.value = await invoke<boolean>('restore_hotkey_available') } catch { hotkeyAvailable.value = false }
  try {
    autoStart.value = await invoke<boolean>('plugin:autostart|is_enabled')
  } catch {
    // 非 Tauri 环境忽略
  }
  try {
    const s = await invoke<{ width: number; height: number }>('get_screen_size')
    screen.value = s
  } catch {
    // 非 Tauri 环境使用默认值
  }
})

async function selectMonitor(name: string) {
  try {
    await invoke('select_island_monitor', { name })
    settings.set('monitorName', name)
    screen.value = await invoke<{ width: number; height: number }>('get_screen_size')
    applyOffsetPct(50)
    monitorError.value = ''
  } catch { monitorError.value = '切换显示器失败，请重试' }
}

// —— 停靠位置与沿边偏移 ——
const screen = ref({ width: 1280, height: 800 })

const isSide = computed(() => settings.prefs.islandEdge === 'left' || settings.prefs.islandEdge === 'right')
const offsetPct = computed(() => {
  const along = isSide.value ? screen.value.height : screen.value.width
  return Math.min(100, Math.max(0, Math.round(settings.prefs.islandOffset / along * 100)))
})

/** 偏移在停靠边上的百分比（中心点） */
function applyOffsetPct(pct: number) {
  const clamped = Math.min(100, Math.max(0, Math.round(pct)))
  const along = isSide.value ? screen.value.height : screen.value.width
  const offset = (along * clamped) / 100
  // 实时预览：直接应用布局，不等偏好广播（广播仍会持久化最终位置）
  const size = PANEL_SIZES[settings.prefs.panelSize] ?? PANEL_SIZES.medium
  invoke('apply_island_layout', {
    edge: settings.prefs.islandEdge,
    expanded: false,
    offset,
    panelWidth: size.w,
    panelHeight: size.h,
    edgeGap: settings.prefs.compactStyle === 'notch' || settings.prefs.edgeAttached ? 0 : 8,
  }).catch(() => {})
  settings.updateIslandLayout(settings.prefs.islandEdge, offset)
}

// —— 开机自启动 ——
async function setAutoStart(enabled: boolean) {
  if (autoStartBusy.value) return
  autoStartBusy.value = true
  try {
    await invoke(enabled ? 'plugin:autostart|enable' : 'plugin:autostart|disable')
    autoStart.value = enabled
  } catch {
    // 失败时回弹开关
    autoStart.value = !enabled
  } finally {
    autoStartBusy.value = false
  }
}
</script>

<template>
  <div class="flex max-w-xl flex-col gap-6">
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">界面显示</h3>
      <div class="flex items-center gap-3">
        <span class="w-20 shrink-0 text-sm">背景透明度</span>
        <Slider :model-value="[100 - settings.prefs.backgroundOpacity]" :min="0" :max="100" :step="1" aria-label="背景透明度" @update:model-value="v => { if (v?.[0] !== undefined) settings.set('backgroundOpacity', 100 - v[0]) }" />
        <span class="w-10 shrink-0 text-right text-sm tabular-nums">{{ 100 - settings.prefs.backgroundOpacity }}%</span>
      </div>
      <p class="text-xs text-muted-foreground">调整灵动岛背景的透明程度，不影响文字和图标。</p>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">界面字体</span>
        <Select :model-value="settings.prefs.fontFamily || '__system__'" @update:model-value="v => settings.set('fontFamily', v === '__system__' ? '' : String(v))">
          <SelectTrigger class="w-56" aria-label="界面字体"><SelectValue placeholder="系统默认" /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="__system__">系统默认</SelectItem>
            <SelectItem v-if="settings.prefs.fontFamily && !systemFonts.includes(settings.prefs.fontFamily)" :value="settings.prefs.fontFamily">{{ settings.prefs.fontFamily }}（不可用）</SelectItem>
            <SelectItem v-for="font in systemFonts" :key="font" :value="font"><span :style="{ fontFamily: JSON.stringify(font) }">{{ font }} · 字体预览 Aa 123</span></SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>
      <p v-if="fontError" class="text-xs text-destructive">{{ fontError }}</p>
    </section>
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">收起与展开</h3>
      <div class="flex flex-col gap-2">
        <span class="text-sm">收起样式</span>
        <RadioGroup :model-value="settings.prefs.compactStyle" aria-label="收起样式" class="grid grid-cols-3 gap-3" @update:model-value="v => settings.set('compactStyle', v as CompactStyle)">
          <Label v-for="option in [{ value: 'notch', label: '刘海' }, { value: 'capsule', label: '胶囊' }, { value: 'indicator', label: '指示条' }]" :key="option.value" :for="`compact-style-${option.value}`" class="flex cursor-pointer flex-col items-center gap-2 rounded-lg border p-2" :class="settings.prefs.compactStyle === option.value ? 'border-primary' : 'border-border'">
            <span class="flex h-12 w-full items-start justify-center overflow-hidden rounded-md bg-muted pt-1" aria-hidden="true">
              <span v-if="option.value === 'notch'" class="h-3 w-16 rounded-b-md bg-foreground" />
              <span v-else-if="option.value === 'capsule'" class="h-3 w-16 rounded-full bg-foreground" />
              <span v-else class="mt-1 h-1 w-10 rounded-full bg-foreground" />
            </span>
            <span class="flex items-center gap-2"><RadioGroupItem :id="`compact-style-${option.value}`" :value="option.value" />{{ option.label }}</span>
          </Label>
        </RadioGroup>
        <p class="text-xs text-muted-foreground">指示条收起时隐藏胶囊内容，悬停或点击可展开。</p>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">展开方式</span>
        <Select :model-value="settings.prefs.expandMode" @update:model-value="(v) => settings.set('expandMode', v as 'hover' | 'click')">
          <SelectTrigger class="w-44" aria-label="展开方式"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="hover">悬停展开</SelectItem><SelectItem value="click">点击展开</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3"><div><p class="text-sm">快捷切换面板</p><p class="text-xs text-muted-foreground">在面板顶部显示快捷选择入口</p></div><Switch :model-value="settings.prefs.quickPanelSwitch" aria-label="快捷切换面板" @update:model-value="v => settings.set('quickPanelSwitch', !!v)" /></div>
      <div class="flex items-center justify-between gap-3">
        <div><p class="text-sm">底部切换显示样式</p><p class="text-xs text-muted-foreground">选择面板导航显示为点位或文字</p></div>
        <Select :model-value="settings.prefs.panelIndicatorStyle" @update:model-value="(v) => settings.set('panelIndicatorStyle', v as PanelIndicatorStyle)">
          <SelectTrigger class="w-44" aria-label="底部切换显示样式"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="dots">点位</SelectItem><SelectItem value="text">文字</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">展开收起动画</span>
        <Select :model-value="settings.prefs.animationCurve" @update:model-value="v => settings.set('animationCurve', v as 'smooth' | 'ease-in' | 'ease-out' | 'ease-in-out')">
          <SelectTrigger class="w-44" aria-label="展开收起动画"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="smooth">顺滑</SelectItem><SelectItem value="ease-in">渐入</SelectItem><SelectItem value="ease-out">渐出</SelectItem><SelectItem value="ease-in-out">渐入渐出</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3"><div><p class="text-sm">提醒时摇晃灵岛</p><p class="text-xs text-muted-foreground">番茄专注和久坐提醒时轻微摇晃</p></div><Switch :model-value="settings.prefs.reminderShake" aria-label="提醒时摇晃灵岛" @update:model-value="v => settings.set('reminderShake', !!v)" /></div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">悬停展开延迟</span>
        <Select :model-value="String(settings.prefs.hoverDelay)" :disabled="settings.prefs.expandMode !== 'hover'" @update:model-value="(v) => settings.set('hoverDelay', Number(v))">
          <SelectTrigger class="w-44" aria-label="悬停展开延迟"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="v in [0, 200, 500, 1000]" :key="v" :value="String(v)">{{ v === 0 ? '立即' : `${v} 毫秒` }}</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">移出收起延迟</span>
        <Select :model-value="String(settings.prefs.leaveDelay)" @update:model-value="(v) => settings.set('leaveDelay', Number(v))">
          <SelectTrigger class="w-44" aria-label="移出收起延迟"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="v in [0, 200, 500, 1000, 2000]" :key="v" :value="String(v)">{{ v === 0 ? '立即' : `${v} 毫秒` }}</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div><p class="text-sm">记住上次面板</p><p class="text-xs text-muted-foreground">下次启动时恢复上次查看的面板</p></div>
        <Switch :model-value="settings.prefs.rememberPanel" aria-label="记住上次面板" @update:model-value="(v) => settings.set('rememberPanel', !!v)" />
      </div>
      <div v-for="setting in [{ key: 'maximizedDisplayMode' as const, label: '有窗口最大化时' }, { key: 'fullscreenDisplayMode' as const, label: '有应用处于独占全屏时' }]" :key="setting.key" class="flex flex-col gap-2">
        <span class="text-sm">{{ setting.label }}</span>
        <Tabs :model-value="settings.prefs[setting.key]" @update:model-value="v => settings.set(setting.key, v as WindowDisplayMode)">
          <TabsList :aria-label="setting.label">
            <TabsTrigger v-for="option in [{ value: 'normal', label: '保持原有样式' }, { value: 'indicator', label: '显示为指示条' }, { value: 'hide', label: '隐藏' }]" :key="option.value" :value="option.value">{{ option.label }}</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <p class="text-xs text-muted-foreground">最大化窗口按灵动岛所在显示器检测；独占全屏由 Windows 系统状态识别。</p>
      <p class="text-xs text-muted-foreground">{{ hotkeyAvailable === null ? '正在检查恢复快捷键…' : hotkeyAvailable ? '恢复灵动岛：Ctrl + Alt + I；也可从系统托盘恢复。' : '恢复快捷键注册失败或被占用，请使用系统托盘恢复。' }}</p>
    </section>
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">灵动岛显示位置</h3>

      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">显示器</span>
        <Select :model-value="monitors.some(monitor => monitor.id === settings.prefs.monitorName) ? settings.prefs.monitorName : monitors[0]?.id" :disabled="!monitors.length" @update:model-value="(v) => selectMonitor(String(v))">
          <SelectTrigger class="w-44" aria-label="显示器"><SelectValue placeholder="无法读取显示器" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="monitor in monitors" :key="monitor.id" :value="monitor.id">{{ monitor.label }}</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <p v-if="monitorError" class="text-xs text-destructive">{{ monitorError }}</p>

      <!-- 停靠边 -->
      <div class="flex items-center gap-4">
        <span class="w-20 shrink-0 text-sm text-muted-foreground">停靠</span>
        <Tabs
          :model-value="settings.prefs.islandEdge"
          @update:model-value="(v) => settings.set('islandEdge', v as IslandEdge)"
        >
          <TabsList>
            <TabsTrigger v-for="p in POSITION_OPTIONS" :key="p.value" :value="p.value" class="px-4">
              {{ p.label }}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div class="flex items-start gap-3">
        <span class="w-20 shrink-0 text-sm text-muted-foreground">{{ isSide ? '垂直位置' : '水平位置' }}</span>
        <div class="flex min-w-0 flex-1 flex-col gap-2">
          <Slider :model-value="[offsetPct]" :max="100" :step="1" :aria-label="isSide ? '垂直位置' : '水平位置'" @update:model-value="(v) => { if (v?.[0] !== undefined) applyOffsetPct(v[0]) }" />
          <div class="flex justify-between">
            <Button v-for="position in [{ pct: 0, label: isSide ? '最上' : '最左' }, { pct: 50, label: '居中' }, { pct: 100, label: isSide ? '最下' : '最右' }]" :key="position.pct" variant="outline" size="sm" :aria-pressed="offsetPct === position.pct" @click="applyOffsetPct(position.pct)">{{ position.label }}</Button>
          </div>
        </div>
      </div>
      <p class="text-xs text-muted-foreground">
        左右停靠时收起为竖向长条，展开面板朝屏幕内侧打开；也可以直接按住灵动岛拖动到目标边吸附。
      </p>

      <!-- 贴边展示 -->
      <div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
        <div class="flex flex-col">
          <span class="text-sm font-medium">贴边展示</span>
          <span class="text-xs text-muted-foreground">
            {{ settings.prefs.compactStyle === 'notch' ? '刘海样式始终贴合屏幕边缘' : '开启后灵动岛完全贴合屏幕边缘；关闭时与边缘保持 8px 悬浮间距' }}
          </span>
        </div>
        <Switch
          :model-value="settings.prefs.compactStyle === 'notch' || settings.prefs.edgeAttached"
          :disabled="settings.prefs.compactStyle === 'notch'"
          aria-label="贴边展示"
          @update:model-value="(v) => settings.set('edgeAttached', !!v)"
        />
      </div>
    </section>

    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">系统</h3>
      <div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
        <div class="flex flex-col">
          <span class="text-sm font-medium">开机自启动</span>
          <span class="text-xs text-muted-foreground">登录 Windows 后自动在托盘启动 Islet 灵岛</span>
        </div>
        <Switch
          :model-value="autoStart"
          :disabled="autoStartBusy"
          aria-label="开机自启动"
          @update:model-value="(v) => setAutoStart(!!v)"
        />
      </div>
    </section>
  </div>
</template>
