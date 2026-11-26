<script lang="ts" setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useMusicStore } from '@/stores/music'

const props = withDefaults(
  defineProps<{
    /** 展开态传 true：嘴角上扬更明显 */
    happy?: boolean
    mood?: 'neutral' | 'happy' | 'angry' | 'sad' | 'surprised'
  }>(),
  { happy: false },
)

const music = useMusicStore()

// —— 眨眼 / wink 状态机（随机间隔，模拟生物感） ——
const blinking = ref(false)
const winking = ref(false)
const spontaneousMood = ref<'neutral' | 'happy' | 'sad' | 'surprised'>('neutral')
let blinkTimer: number | undefined
let clearTimer: number | undefined

function closeEyes(duration: number) {
  blinking.value = true
  window.clearTimeout(clearTimer)
  clearTimer = window.setTimeout(() => {
    blinking.value = false
  }, duration)
}

function loop() {
  const delay = 2600 + Math.random() * 3400
  blinkTimer = window.setTimeout(() => {
    if (!props.mood) {
      const moods = ['neutral', 'happy', 'sad', 'surprised'] as const
      spontaneousMood.value = moods[Math.floor(Math.random() * moods.length)]!
    }
    closeEyes(140)
    // 15% 概率连眨两下；8% 概率来个 wink（右眼闭 + 微笑）
    const roll = Math.random()
    if (roll < 0.15) {
      window.setTimeout(() => closeEyes(120), 220)
    } else if (roll < 0.23) {
      window.setTimeout(() => {
        winking.value = true
        window.setTimeout(() => {
          winking.value = false
        }, 900)
      }, 260)
    }
    loop()
  }, delay)
}

onMounted(() => {
  loop()
  // 常驻轮询系统媒体状态（幂等），驱动音乐节奏摇摆
  music.startPolling()
})
onBeforeUnmount(() => {
  window.clearTimeout(blinkTimer)
  window.clearTimeout(clearTimer)
})

const currentMood = computed(() => props.mood ?? spontaneousMood.value)
const isSmiling = computed(() => props.happy || winking.value || !!music.state?.playing)
const mouthPath = computed(() =>
  currentMood.value === 'sad' ? 'M18 25 Q24 19 30 25' : currentMood.value === 'angry' ? 'M19 23 L29 23' : currentMood.value === 'surprised' ? 'M24 20 a2 2 0 1 0 0.01 0' : isSmiling.value || currentMood.value === 'happy' ? 'M17 20 Q24 26.5 31 20' : 'M19 21.5 L29 21.5',
)
</script>

<template>
  <!-- 机器人脸：双眼 + 嘴；眨眼/wink 由随机状态机驱动，摇摆为持续 CSS 动画 -->
  <div class="robot-face" :class="{ groove: !!music.state?.playing }" aria-hidden="true">
    <svg viewBox="0 0 48 32" class="size-full">
      <g class="face-inner">
        <rect
          class="eye"
          :class="{ closed: blinking || winking }"
          x="8"
          y="7"
          width="9"
          height="17"
          rx="4.5"
        />
        <rect
          class="eye"
          :class="{ closed: blinking }"
          x="31"
          y="7"
          width="9"
          height="17"
          rx="4.5"
        />
        <!-- 眼睛高光 -->
        <circle class="glint" cx="11.5" cy="11" r="1.4" />
        <circle class="glint" cx="34.5" cy="11" r="1.4" />
        <path v-if="mood === 'angry'" class="mouth" d="M7 4 L17 7 M31 7 L41 4" />
        <path class="mouth" :d="mouthPath" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.robot-face {
  display: block;
  /* 待机摇摆：轻缓左右晃动 + 微倾 */
  animation: sway 3.2s ease-in-out infinite alternate;
  transform-origin: center;
}

/* 音乐播放时跟着节奏加快摆动 */
.robot-face.groove {
  animation-duration: 0.9s;
}

@keyframes sway {
  from {
    transform: translateX(-1.6px) rotate(-1.4deg);
  }
  to {
    transform: translateX(1.6px) rotate(1.4deg);
  }
}

.face-inner {
  transform-origin: center;
}

.eye {
  fill: var(--foreground);
  transform-origin: center;
  transform-box: fill-box;
  transition: transform 90ms ease-out;
}

.eye.closed {
  transform: scaleY(0.12);
}

.glint {
  fill: var(--background);
  transition: opacity 90ms ease-out;
}

.eye.closed + .glint {
  opacity: 0;
}

/* 高光与眼睛的联动：闭眼时隐藏（按 x 坐标近似匹配左右眼） */
circle.glint {
  transition: opacity 90ms ease-out;
}

.mouth {
  fill: none;
  stroke: var(--foreground);
  stroke-width: 2.4;
  stroke-linecap: round;
  transition: d 180ms ease;
}
</style>
