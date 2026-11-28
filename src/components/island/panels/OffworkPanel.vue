<script lang="ts" setup>
import { computed } from 'vue'
import offworkImage from '@/assets/panel-illustrations/offwork.png'
import PanelDetailIcon from '@/components/island/PanelDetailIcon.vue'
import { useIslandStore } from '@/stores/island'
import { useSettingsStore } from '@/stores/settings'
import { PANEL_OPTIONS } from '@/stores/panels'
import { formatOffworkCountdown } from '@/lib/offworkCountdown'

const island = useIslandStore()
const settings = useSettingsStore()
const props = defineProps<{ preview?: boolean }>()
// 设置预览使用与预览标题相同的固定时间，不影响真实计时。
const now = computed(() => props.preview ? new Date(2026, 10, 25, 10, 8, 30) : island.now)

const endTime = computed(
  () => settings.getPanelOption('offwork', 'endTime', PANEL_OPTIONS.offwork[0]!.default) as string,
)
const payday = computed(
  () => Number(settings.getPanelOption('offwork', 'payday', PANEL_OPTIONS.offwork[1]!.default) as string),
)
const joinDate = computed(
  () => settings.getPanelOption('offwork', 'joinDate', PANEL_OPTIONS.offwork[2]!.default) as string,
)

/** 距下班 */
const offwork = computed(() => formatOffworkCountdown(now.value, endTime.value))

/** 距发薪日 */
const paydayText = computed(() => {
  const d = now.value
  const today = d.getDate()
  if (today === payday.value) return { text: '今天发工资 🎉', sub: `${payday.value} 号` }
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const target = new Date(d.getFullYear(), d.getMonth(), payday.value).getTime()
  const diffDays = Math.ceil((target - d.getTime()) / 86400000)
  const days = diffDays > 0 ? diffDays : daysInMonth - today + payday.value
  return { text: `${days} 天`, sub: `${payday.value} 号发薪` }
})

/** 工龄 */
const tenureText = computed(() => {
  if (!joinDate.value) return null
  const join = new Date(joinDate.value)
  if (Number.isNaN(join.getTime())) return null
  const days = Math.max(0, Math.floor((now.value.getTime() - join.getTime()) / 86400000))
  const years = Math.floor(days / 365)
  return {
    text: years > 0 ? `${years} 年 ${days % 365} 天` : `${days} 天`,
    sub: '已并肩作战',
  }
})
</script>

<template>
  <div class="flex h-full min-h-0 items-center gap-2">
    <img :src="offworkImage" class="size-20 shrink-0 object-contain" alt="" aria-hidden="true" />
    <div class="grid h-full min-w-0 flex-1 grid-cols-2 divide-x divide-border">
    <div class="flex min-w-0 flex-col justify-center gap-2 pr-2">
      <p class="flex items-center gap-2 text-xs text-muted-foreground"><PanelDetailIcon name="offwork" />距下班</p>
      <p class="text-base font-semibold tabular-nums">{{ offwork }}</p>
      <p class="text-xs text-muted-foreground">{{ endTime }} 下班</p>
    </div>
    <div class="flex min-w-0 flex-col justify-center gap-2 pl-2">
      <p class="flex items-center gap-2 text-xs text-muted-foreground"><PanelDetailIcon name="coins" />距发工资</p>
      <p class="truncate text-base font-semibold tabular-nums">{{ paydayText.text }}</p>
      <p class="truncate text-xs text-muted-foreground">{{ paydayText.sub }}</p>
      <p v-if="tenureText" class="flex items-center gap-1 truncate border-t border-border pt-2 text-xs text-muted-foreground"><PanelDetailIcon name="calendar" />工龄 {{ tenureText.text }}</p>
    </div>
    </div>
  </div>
</template>
