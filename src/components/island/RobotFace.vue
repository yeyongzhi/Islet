<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMusicStore } from '@/stores/music'
type Mood = 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised' | 'sleepy' | 'excited' | 'wink' | 'thinking' | 'smug'
const props = withDefaults(defineProps<{ happy?: boolean; mood?: Mood }>(), { happy: false })
const music = useMusicStore()
const blinking = ref(false)
const spontaneousMood = ref<Mood>('neutral')
const moods: Mood[] = ['neutral', 'neutral', 'happy', 'happy', 'surprised', 'sleepy', 'excited', 'wink', 'thinking', 'smug', 'sad', 'angry']
let timer: number | undefined
let blinkTimer: number | undefined
function loop() {
  timer = window.setTimeout(() => {
    blinking.value = true
    blinkTimer = window.setTimeout(() => { blinking.value = false; spontaneousMood.value = moods[Math.floor(Math.random() * moods.length)]! }, 150)
    loop()
  }, 3500 + Math.random() * 4500)
}
onMounted(() => { if (!props.mood) { loop(); music.startPolling() } })
onBeforeUnmount(() => { window.clearTimeout(timer); window.clearTimeout(blinkTimer) })
const currentMood = computed<Mood>(() => props.mood ?? (props.happy || music.state?.playing ? 'happy' : spontaneousMood.value))
const mouthPath = computed(() => ({ neutral: 'M20 24 Q24 25 28 24', happy: 'M18 22 Q24 28 30 22', angry: 'M20 25 Q24 22 28 25', sad: 'M19 26 Q24 21 29 26', surprised: 'M24 22 a2.2 2.2 0 1 0 .01 0', sleepy: 'M21 24 Q24 26 27 24', excited: 'M19 22 Q24 29 29 22 Z', wink: 'M19 22 Q24 27 30 22', thinking: 'M21 24 Q24 22 27 24', smug: 'M19 24 Q25 28 30 22' })[currentMood.value])
const curvedEyes = computed(() => currentMood.value === 'excited' || currentMood.value === 'sleepy')
</script>

<template>
  <div class="robot-face" :class="{ groove: !mood && !!music.state?.playing, preview: !!mood }" aria-hidden="true">
    <svg viewBox="0 0 48 32" class="size-full">
      <g v-if="curvedEyes && !blinking" class="stroke">
        <path v-if="currentMood === 'excited'" d="M8 16 Q12.5 8 17 16 M31 16 Q35.5 8 40 16" />
        <path v-else d="M8 16 Q12.5 20 17 16 M31 16 Q35.5 20 40 16" />
      </g>
      <template v-else>
        <rect class="eye" :class="{ closed: blinking || currentMood === 'wink' }" x="8" y="6" width="9" height="16" rx="4.5" />
        <rect class="eye" :class="{ closed: blinking }" x="31" y="6" width="9" height="16" rx="4.5" />
        <circle v-if="!blinking && currentMood !== 'wink'" class="glint" cx="11" cy="10" r="1.5" />
        <circle v-if="!blinking" class="glint" cx="34" cy="10" r="1.5" />
      </template>
      <path v-if="currentMood === 'angry'" class="stroke" d="M7 3 L17 6 M31 6 L41 3" />
      <path v-if="currentMood === 'sad'" class="stroke" d="M8 5 L16 3 M32 3 L40 5" />
      <path v-if="currentMood === 'thinking'" class="stroke" d="M7 5 L16 4 M32 3 L40 5" />
      <path class="stroke" :d="mouthPath" />
    </svg>
  </div>
</template>

<style scoped>
.robot-face { display: block; animation: sway 3.2s ease-in-out infinite alternate; transform-origin: center; }
.robot-face.groove { animation-duration: .9s; }
.robot-face.preview { animation: none; }
@keyframes sway { from { transform: translateX(-1px) rotate(-1deg); } to { transform: translateX(1px) rotate(1deg); } }
.eye { fill: var(--foreground); transform-origin: center; transform-box: fill-box; transition: transform 90ms ease-out; }
.eye.closed { transform: scaleY(.12); }
.glint { fill: var(--background); }
.stroke { fill: none; stroke: var(--foreground); stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
@media (prefers-reduced-motion: reduce) { .robot-face { animation: none; } }
</style>
