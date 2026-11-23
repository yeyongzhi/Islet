<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { ArrowLeft, ArrowRight } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSettingsStore, PANEL_SIZES, type CompactContent, type IslandEdge } from '@/stores/settings'
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
const monitors = ref<string[]>([])
const monitorError = ref('')
const hotkeyAvailable = ref<boolean | null>(null)

onMounted(async () => {
  try { monitors.value = await invoke<string[]>('list_island_monitors') } catch { monitorError.value = '无法读取显示器列表' }
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

/** 偏移在停靠边上的百分比（中心点） */
const offsetPct = computed(() => {
  const along = isSide.value ? screen.value.height : screen.value.width
  return Math.round((settings.prefs.islandOffset / along) * 100)
})

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
      <h3 class="text-sm font-semibold">收起与展开</h3>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">收起时显示</span>
        <Select :model-value="settings.prefs.compactContent" @update:model-value="(v) => settings.set('compactContent', v as CompactContent)">
          <SelectTrigger class="w-44" aria-label="收起时显示"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup>
            <SelectItem value="weather">时间与天气</SelectItem><SelectItem value="music">音乐</SelectItem>
            <SelectItem value="monitor">CPU 与内存</SelectItem><SelectItem value="network">网速</SelectItem>
            <SelectItem value="countdown">最近倒数日</SelectItem><SelectItem value="pomodoro">番茄钟</SelectItem>
          </SelectGroup></SelectContent>
        </Select>
      </div>
      <p class="text-xs text-muted-foreground">专注计时和通知会临时优先显示；侧边停靠保持紧凑图标。</p>
      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">展开方式</span>
        <Select :model-value="settings.prefs.expandMode" @update:model-value="(v) => settings.set('expandMode', v as 'hover' | 'click')">
          <SelectTrigger class="w-44" aria-label="展开方式"><SelectValue /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem value="hover">悬停展开</SelectItem><SelectItem value="click">点击展开</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
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
          <SelectContent><SelectGroup><SelectItem v-for="v in [200, 500, 1000, 2000]" :key="v" :value="String(v)">{{ v }} 毫秒</SelectItem></SelectGroup></SelectContent>
        </Select>
      </div>
      <div class="flex items-center justify-between gap-3">
        <div><p class="text-sm">记住上次面板</p><p class="text-xs text-muted-foreground">下次启动时恢复上次查看的面板</p></div>
        <Switch :model-value="settings.prefs.rememberPanel" aria-label="记住上次面板" @update:model-value="(v) => settings.set('rememberPanel', !!v)" />
      </div>
      <div class="flex items-center justify-between gap-3">
        <div><p class="text-sm">全屏时自动隐藏</p><p class="text-xs text-muted-foreground">前台应用占满当前屏幕时隐藏，退出全屏后恢复</p></div>
        <Switch :model-value="settings.prefs.hideOnFullscreen" aria-label="全屏时自动隐藏" @update:model-value="(v) => settings.set('hideOnFullscreen', !!v)" />
      </div>
      <p class="text-xs text-muted-foreground">{{ hotkeyAvailable === null ? '正在检查恢复快捷键…' : hotkeyAvailable ? '恢复灵动岛：Ctrl + Alt + I；也可从系统托盘恢复。' : '恢复快捷键注册失败或被占用，请使用系统托盘恢复。' }}</p>
    </section>
    <section class="flex flex-col gap-3">
      <h3 class="text-sm font-semibold">灵动岛显示位置</h3>

      <div class="flex items-center justify-between gap-3">
        <span class="text-sm">显示器</span>
        <Select :model-value="monitors.includes(settings.prefs.monitorName) ? settings.prefs.monitorName : monitors[0]" :disabled="!monitors.length" @update:model-value="(v) => selectMonitor(String(v))">
          <SelectTrigger class="w-44" aria-label="显示器"><SelectValue placeholder="无法读取显示器" /></SelectTrigger>
          <SelectContent><SelectGroup><SelectItem v-for="(monitor, index) in monitors" :key="monitor" :value="monitor">{{ `显示器 ${index + 1} · ${monitor}` }}</SelectItem></SelectGroup></SelectContent>
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

      <!-- 沿边位置：滑条 + 左右微调 + 恢复居中 -->
      <div class="flex items-center gap-3">
        <span class="w-20 shrink-0 text-sm text-muted-foreground">
          {{ isSide ? '垂直位置' : '水平位置' }}
        </span>
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          aria-label="向起点方向微调"
          @click="applyOffsetPct(offsetPct - 3)"
        >
          <ArrowLeft class="size-4" aria-hidden="true" />
        </Button>
        <Slider
          class="min-w-0 flex-1"
          :model-value="[offsetPct]"
          :min="0"
          :max="100"
          :step="1"
          aria-label="沿停靠边的位置"
          @update:model-value="(v) => applyOffsetPct((v as number[])[0] ?? offsetPct)"
        />
        <Button
          variant="outline"
          size="icon"
          class="size-8 shrink-0"
          aria-label="向终点方向微调"
          @click="applyOffsetPct(offsetPct + 3)"
        >
          <ArrowRight class="size-4" aria-hidden="true" />
        </Button>
        <Button variant="outline" size="sm" class="h-8 shrink-0 text-xs" @click="applyOffsetPct(50)">
          恢复居中
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        左右停靠时收起为竖向长条，展开面板朝屏幕内侧打开；也可以直接按住灵动岛拖动到目标边吸附。
      </p>

      <!-- 贴边展示 -->
      <div class="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2.5">
        <div class="flex flex-col">
          <span class="text-sm font-medium">贴边展示</span>
          <span class="text-xs text-muted-foreground">
            开启后灵动岛完全贴合屏幕边缘；关闭时与边缘保持 8px 悬浮间距
          </span>
        </div>
        <Switch
          :model-value="settings.prefs.edgeAttached"
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
          <span class="text-xs text-muted-foreground">登录 Windows 后自动在托盘启动 WinIsland</span>
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
