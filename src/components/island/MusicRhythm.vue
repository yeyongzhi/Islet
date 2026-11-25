<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMusicStore } from '@/stores/music'

const music = useMusicStore()
const coverColor = ref('var(--primary)')
let colorRequest = 0
watch(() => music.thumbnail, (src) => {
  const request = ++colorRequest
  coverColor.value = 'var(--primary)'
  if (!src) return
  const image = new Image()
  image.onload = () => {
    if (request !== colorRequest) return
    try {
      const canvas = document.createElement('canvas')
      canvas.width = 32; canvas.height = 32
      const context = canvas.getContext('2d', { willReadFrequently: true })
      if (!context) return
      context.drawImage(image, 0, 0, 32, 32)
      const pixels = context.getImageData(0, 0, 32, 32).data
      const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i]!, g = pixels[i + 1]!, b = pixels[i + 2]!, alpha = pixels[i + 3]!
        if (alpha < 128 || Math.max(r, g, b) < 35 || Math.min(r, g, b) > 235) continue
        const key = `${r >> 5},${g >> 5},${b >> 5}`
        const bucket = buckets.get(key) ?? { r: 0, g: 0, b: 0, count: 0 }
        bucket.r += r; bucket.g += g; bucket.b += b; bucket.count++
        buckets.set(key, bucket)
      }
      const dominant = [...buckets.values()].sort((a, b) => b.count - a.count)[0]
      if (dominant) coverColor.value = `rgb(${Math.round(dominant.r / dominant.count)} ${Math.round(dominant.g / dominant.count)} ${Math.round(dominant.b / dominant.count)})`
    } catch { /* 无法读取封面像素时使用主题色。 */ }
  }
  image.src = src
}, { immediate: true })
</script>

<template>
  <div v-if="music.state?.title" class="music-rhythm pointer-events-none absolute inset-x-0 bottom-0 flex h-10 items-end justify-center gap-1 overflow-hidden" :class="{ 'music-rhythm--paused': !music.state.playing }" :style="{ color: coverColor }" aria-hidden="true">
    <span v-for="n in 72" :key="n" class="rhythm-bar" :style="{ '--bar-height': `${10 + (n * 17 % 30)}px`, '--bar-delay': `${(n * 137 % 900) * -1}ms`, '--bar-duration': `${650 + (n * 113 % 550)}ms` }" />
  </div>
</template>

<style scoped>
.music-rhythm { opacity: .35; }
.rhythm-bar { flex: 0 0 4px; height: var(--bar-height); border-radius: 999px 999px 0 0; background: currentColor; transform-origin: bottom; animation: rhythm var(--bar-duration) ease-in-out var(--bar-delay) infinite alternate; }
.music-rhythm--paused .rhythm-bar { animation-play-state: paused; }
@keyframes rhythm { from { transform: scaleY(.18); } to { transform: scaleY(1); } }
@media (prefers-reduced-motion: reduce) { .rhythm-bar { animation: none; transform: scaleY(.35); } }
</style>
