<script lang="ts" setup>
import { computed } from 'vue'
import { Solar } from 'lunar-typescript'

const now = new Date()
const solar = Solar.fromDate(now)
const lunar = solar.getLunar()

const lunarText = computed(() => {
  const leap = lunar.getMonth() < 0 ? '闰' : ''
  return `农历${leap}${lunar.getMonthInChinese()}月${lunar.getDayInChinese()}`
})

const yearText = computed(() => `${lunar.getYearInGanZhi()}年 · ${lunar.getYearShengXiao()}年`)

/** 今天若是节气或传统节日则展示 */
const festivalText = computed(() => {
  const items = [...solar.getFestivals(), ...lunar.getFestivals()]
  return items.join(' · ')
})

const jieQiText = computed(() => {
  const today = lunar.getJieQi()
  if (today) return `今日${today}`
  const prev = lunar.getPrevJieQi(true)
  return prev ? `节气：${prev.getName()}` : ''
})
</script>

<template>
  <!-- 农历节气：农历日期 + 干支生肖 + 节气/节日 -->
  <div class="flex h-full flex-col items-center justify-center gap-2 text-center">
    <p class="text-4xl font-semibold">{{ lunarText }}</p>
    <p class="text-sm text-muted-foreground">{{ yearText }}</p>
    <p class="text-xs text-muted-foreground">
      <span v-if="festivalText" class="font-medium text-primary">{{ festivalText }}</span>
      <span v-else-if="jieQiText">{{ jieQiText }}</span>
      <span v-else>{{ solar.getXingZuo() }}座</span>
    </p>
  </div>
</template>
