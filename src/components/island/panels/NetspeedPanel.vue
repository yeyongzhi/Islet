<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import networkImage from '@/assets/panel-illustrations/network.png'
import TrendLine from '@/components/island/TrendLine.vue'

interface NetworkState { connected: boolean; internet?: boolean; wifi?: boolean; name?: string | null; signal?: number | null }
interface SpeedState { down_kbps: number | null; up_kbps: number | null }
const props = defineProps<{ preview?: boolean }>()
const connection = ref<NetworkState | null>(props.preview ? { connected: true, internet: true, wifi: true, name: '示例网络', signal: 4 } : null)
const speed = ref<SpeedState | null>(props.preview ? { down_kbps: 2458, up_kbps: 320 } : null)
const connectionFailed = ref(false)
const speedFailed = ref(false)
const downHistory = ref<number[]>(props.preview ? [500, 850, 690, 1250, 1100, 1800, 1500, 2458] : [])
const upHistory = ref<number[]>(props.preview ? [100, 180, 150, 220, 170, 270, 210, 320] : [])
let connectionTimer: number | undefined
let speedTimer: number | undefined
let readingConnection = false
let readingSpeed = false

const connectionText = computed(() => {
  if (connectionFailed.value) return connection.value ? '连接状态更新失败' : '连接状态不可用'
  if (!connection.value) return '加载中…'
  if (!connection.value.connected) return '未连接网络'
  const state = connection.value.internet ? '已连接互联网' : '无互联网访问'
  return connection.value.wifi && connection.value.signal != null ? `${state} · 信号 ${connection.value.signal}/5` : state
})
function formatSpeed(value: number | null | undefined) {
  if (value == null) return speedFailed.value ? '—' : '加载中…'
  return value >= 1024 ? `${(value / 1024).toFixed(1)} MB/s` : `${value} KB/s`
}
async function refreshConnection() {
  if (readingConnection) return
  readingConnection = true
  try { connection.value = await invoke<NetworkState>('get_network_connection'); connectionFailed.value = false }
  catch { connectionFailed.value = true }
  finally { readingConnection = false }
}
async function refreshSpeed() {
  if (readingSpeed) return
  readingSpeed = true
  try {
    const next = await invoke<SpeedState>('get_network_speed')
    speed.value = next
    if (next.down_kbps !== null) downHistory.value = [...downHistory.value, next.down_kbps].slice(-30)
    if (next.up_kbps !== null) upHistory.value = [...upHistory.value, next.up_kbps].slice(-30)
    speedFailed.value = false
  } catch { speedFailed.value = true }
  finally { readingSpeed = false }
}
onMounted(() => {
  if (props.preview) return
  void refreshConnection()
  void refreshSpeed()
  connectionTimer = window.setInterval(refreshConnection, 5000)
  speedTimer = window.setInterval(refreshSpeed, 1000)
})
onBeforeUnmount(() => { window.clearInterval(connectionTimer); window.clearInterval(speedTimer) })
</script>

<template>
  <div class="flex h-full min-h-0 min-w-0 flex-col gap-1">
    <div class="flex min-w-0 shrink-0 items-center gap-2">
      <img :src="networkImage" class="size-8 shrink-0 object-contain" alt="" aria-hidden="true" />
      <div class="min-w-0 flex-1"><p class="truncate text-sm font-semibold" :title="connection?.name ?? undefined">{{ connection?.name || (connection?.connected ? '当前网络' : '网络连接') }}</p><p class="truncate text-xs text-muted-foreground" role="status">{{ connectionText }}</p></div>
      <span class="shrink-0 text-[10px] text-muted-foreground" title="网速为所有网卡流量之和">全部网卡</span>
    </div>
    <div class="grid min-h-0 flex-1 grid-cols-2 divide-x divide-border">
      <div v-for="item in [{ label: '下载', icon: 'download', value: speed?.down_kbps, history: downHistory }, { label: '上传', icon: 'upload', value: speed?.up_kbps, history: upHistory }]" :key="item.label" class="min-h-0 min-w-0 gap-0  py-0 ">
        <div class="flex h-full min-h-0 flex-col justify-between gap-0.5 px-3 py-1">
          <p class="flex items-center gap-1 text-xs text-muted-foreground"><PanelDetailIcon :name="item.icon" />{{ item.label }}</p>
          <p class="truncate text-base font-semibold tabular-nums">{{ formatSpeed(item.value) }}</p>
          <p v-if="speedFailed" class="truncate text-xs text-muted-foreground">{{ item.value == null ? '读取失败' : '更新失败 · 旧数据' }}</p>
          <TrendLine v-else-if="item.history.length > 1" :values="[...item.history].reverse()" :label="`${item.label}速度`" />
          <p v-else class="truncate text-xs text-muted-foreground">采样中…</p>
        </div>
      </div>
    </div>
  </div>
</template>
