<script lang="ts" setup>
import { computed, onMounted } from 'vue'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { useMusicStore, type MediaAction } from '@/stores/music'

const music = useMusicStore()

onMounted(() => music.startPolling())

const hasTrack = computed(() => !!music.state?.title)
const progressPct = computed(() => {
  const s = music.state
  if (!s || s.duration_secs <= 0) return 0
  return Math.min(100, Math.max(0, (s.position_secs / s.duration_secs) * 100))
})

function fmt(total: number) {
  const safe = Math.max(0, Math.floor(total))
  const m = Math.floor(safe / 60).toString().padStart(2, '0')
  const s = (safe % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function toggle() {
  const action: MediaAction = music.state?.playing ? 'pause' : 'play'
  music.control(action)
}
</script>

<template>
  <!-- 音乐面板：SMTC 读取本机播放器（网易云/QQ音乐等）状态 -->
  <div class="flex h-full flex-col items-center justify-center gap-4">
    <!-- 空状态：无媒体会话 -->
    <template v-if="!hasTrack">
      <div
        class="flex size-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5"
      >
        <Music class="size-8 text-white/40" aria-hidden="true" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium text-white/80">未在播放</p>
        <p class="mt-1 text-xs text-white/50">
          在网易云音乐、QQ音乐等播放器开始播放后自动显示
        </p>
      </div>
    </template>

    <!-- 播放中 / 有会话 -->
    <template v-else>
      <div
        class="flex size-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-fuchsia-600"
      >
        <Music class="size-9 text-white" aria-hidden="true" />
      </div>
      <div class="max-w-full text-center">
        <p class="truncate text-base font-semibold text-white">{{ music.state!.title }}</p>
        <p class="mt-0.5 truncate text-xs text-white/60">
          {{ music.state!.artist || '未知歌手' }}
        </p>
      </div>

      <!-- 进度条 -->
      <div class="w-full max-w-md">
        <div class="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            class="h-full rounded-full bg-violet-500 transition-[width] duration-500"
            :style="{ width: `${progressPct}%` }"
          />
        </div>
        <div class="mt-1 flex justify-between text-[10px] text-white/50 tabular-nums">
          <span>{{ fmt(music.state!.position_secs) }}</span>
          <span>{{ fmt(music.state!.duration_secs) }}</span>
        </div>
      </div>

      <!-- 播放控制 -->
      <div class="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          class="size-9 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="上一曲"
          @click="music.control('prev')"
        >
          <SkipBack class="size-4" aria-hidden="true" />
        </Button>
        <Button
          size="icon"
          class="size-11 rounded-full bg-violet-600 text-white hover:bg-violet-500"
          :aria-label="music.state!.playing ? '暂停' : '播放'"
          @click="toggle"
        >
          <Pause v-if="music.state!.playing" class="size-5" aria-hidden="true" />
          <Play v-else class="size-5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="size-9 text-white/80 hover:bg-white/10 hover:text-white"
          aria-label="下一曲"
          @click="music.control('next')"
        >
          <SkipForward class="size-4" aria-hidden="true" />
        </Button>
      </div>
    </template>
  </div>
</template>
