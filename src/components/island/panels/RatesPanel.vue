<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import illustration from '@/assets/panel-illustrations/rates.png'
import { fetchRates } from '@/services/rates'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'
import { Button } from '@/components/ui/button'

const settings = useSettingsStore()

const fromCur = computed(
  () => settings.getPanelOption('rates', 'fromCur', PANEL_OPTIONS.rates[0]!.default) as string,
)
const toCur = computed(
  () => settings.getPanelOption('rates', 'toCur', PANEL_OPTIONS.rates[1]!.default) as string,
)

const rate = ref<number | null>(null)
const rateDate = ref('')
const fetchedAt = ref<number | null>(null)
const rateStatus = ref<'loading' | 'ready' | 'stale' | 'error'>('loading')
let requestId = 0
let timer: number | undefined

async function load() {
  const id = ++requestId
  rateStatus.value = 'loading'
  const data = await fetchRates(fromCur.value, [toCur.value])
  if (id !== requestId) return
  if (data) {
    rate.value = data.rates[toCur.value] ?? null
    rateDate.value = data.date
    fetchedAt.value = data.__fetchedAt ?? null
    rateStatus.value = data.__stale ? 'stale' : rate.value === null ? 'error' : 'ready'
  } else {
    rate.value = null
    rateStatus.value = 'error'
  }
}
watch([fromCur, toCur], () => { rate.value = null; load() })

onMounted(() => {
  load()
  timer = window.setInterval(load, 10 * 60000)
})

onBeforeUnmount(() => window.clearInterval(timer))
</script>

<template>
  <!-- 汇率：基准货币 → 目标货币 -->
  <div class="h-full gap-0  py-0 ">
    <div class="flex h-full items-stretch gap-4 p-2">
      <img :src="illustration" class="size-20 shrink-0 self-center object-contain" alt="" aria-hidden="true" />
      <div class="flex min-h-0 min-w-0 flex-1 flex-col justify-between gap-1">
        <p class="text-xs text-muted-foreground">1 {{ fromCur }} 兑换 {{ toCur }}</p>
        <p class="truncate text-3xl font-semibold text-primary tabular-nums">{{ rate !== null ? rate.toFixed(4) : rateStatus === 'error' ? '暂不可用' : '加载中…' }}</p>
        <p v-if="rate !== null" class="text-xs text-muted-foreground">{{ fromCur === toCur ? '相同货币' : '数据日期 ' + rateDate }}{{ rateStatus === 'stale' ? ' · 缓存' : '' }}<span v-if="fetchedAt"> · 更新 {{ new Date(fetchedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) }}</span></p>
        <Button v-if="rateStatus === 'error' || rateStatus === 'stale'" size="sm" class="h-7 w-fit text-xs" @click="load">重试</Button>
      </div>
    </div>
  </div>
</template>
