<script lang="ts" setup>
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { computed, onMounted, ref, watch } from 'vue'
import { Music, Pause, Play, SkipBack, SkipForward } from 'lucide-vue-next'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { useMusicStore, type MediaAction } from '@/stores/music'

const music = useMusicStore()

onMounted(() => music.startPolling())

const hasTrack = computed(() => !!music.state?.title)
const seekValue = ref<number | null>(null)
const displayPosition = computed(() => seekValue.value ?? music.state?.position_secs ?? 0)
watch(() => [music.state?.title, music.state?.artist, music.state?.player], () => { seekValue.value = null })
async function commitSeek(values: number[]) {
  const value = values[0]
  if (value !== undefined) await music.seek(value)
  seekValue.value = null
}

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
  <!-- 音乐面板：左封面 / 右曲名进度与控制（SMTC 读取本机播放器） -->
  <div class="relative flex h-full flex-col items-center justify-center gap-3 overflow-hidden">
    <!-- 空状态：无媒体会话 -->
    <template v-if="!hasTrack">
      <div class="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
        <Music class="size-7 text-muted-foreground" aria-hidden="true" />
      </div>
      <div class="text-center">
        <p class="text-sm font-medium">{{ music.error ? '播放器状态不可用' : '未在播放' }}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ music.error ? '无法读取播放器状态，请稍后重试' : '在播放器开始播放后自动显示' }}
        </p>
      </div>
    </template>

    <!-- 播放中 / 有会话 -->
    <template v-else>
      <div class="relative flex h-full w-full items-center gap-4">
        <!-- 左：专辑封面（加载失败回退占位图标） -->
        <div class="relative aspect-square h-full max-h-36 max-w-[45%] shrink-0 overflow-hidden rounded-xl bg-primary">
          <img v-if="music.thumbnail" :src="music.thumbnail" class="absolute inset-0 size-full object-cover" alt="" @error="music.thumbnail = null" />
          <div v-else class="absolute inset-0 flex items-center justify-center"><Music class="size-10 text-primary-foreground" aria-hidden="true" /></div>
        </div>

        <!-- 右：曲名 + 进度 + 控制 -->
        <div class="flex min-w-0 flex-1 flex-col gap-2.5">
          <div class="min-w-0">
            <p class="truncate text-lg font-semibold leading-tight" :title="music.state!.title">{{ music.state!.title }}</p>
            <p class="mt-1 truncate text-xs text-muted-foreground">
              {{ music.controlError || (music.error ? '状态读取失败，显示上次结果' : `${music.state!.artist || '未知歌手'} · ${music.state!.player || '未知播放器'}`) }}
            </p>
          </div>

          <!-- 进度条（播放器未上报时间轴时显示不可用提示） -->
          <div class="w-full">
            <Slider
              v-if="music.state!.duration_secs > 0"
              :model-value="[Math.min(displayPosition, music.state!.duration_secs)]"
              :max="music.state!.duration_secs"
              :step="1"
              :disabled="!music.state!.can_seek"
              :title="music.state!.can_seek ? '拖动调整播放进度' : '当前播放器不支持调整进度'"
              aria-label="播放进度"
              @update:model-value="values => { if (values?.[0] !== undefined) seekValue = values[0] }"
              @value-commit="commitSeek"
            />
            <div
              v-else
              class="h-2 w-full overflow-hidden rounded-full bg-muted"
              aria-label="播放器未提供播放进度"
            >
              <div class="indeterminate h-full w-1/4 rounded-full bg-primary/60" />
            </div>
            <div class="mt-1.5 flex justify-between text-xs text-muted-foreground tabular-nums">
              <template v-if="music.state!.duration_secs > 0">
                <span>{{ fmt(displayPosition) }}</span>
                <span>{{ fmt(music.state!.duration_secs) }}</span>
              </template>
              <span v-else class="w-full text-center">该播放器未上报播放进度</span>
            </div>
          </div>

          <!-- 播放控制 -->
          <div class="flex items-center justify-center gap-4 pt-1.5">
            <Tooltip><TooltipTrigger as-child><Button
              variant="ghost"
              size="icon"
              class="size-10 hover:bg-accent"
              aria-label="上一曲"
              :disabled="!music.state!.can_prev"
              @click="music.control('prev')"
            >
              <SkipBack class="size-5" aria-hidden="true" />
            </Button></TooltipTrigger><TooltipContent>上一曲</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger as-child><Button
              size="icon"
              class="size-11 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 hover:bg-primary/90"
              :aria-label="music.state!.playing ? '暂停' : '播放'"
              :disabled="music.state!.playing ? !music.state!.can_pause : !music.state!.can_play"
              @click="toggle"
            >
              <Pause v-if="music.state!.playing" class="size-5" aria-hidden="true" />
              <Play v-else class="size-5" aria-hidden="true" />
            </Button></TooltipTrigger><TooltipContent>{{ music.state!.playing ? '暂停' : '播放' }}</TooltipContent></Tooltip>
            <Tooltip><TooltipTrigger as-child><Button
              variant="ghost"
              size="icon"
              class="size-10 hover:bg-accent"
              aria-label="下一曲"
              :disabled="!music.state!.can_next"
              @click="music.control('next')"
            >
              <SkipForward class="size-5" aria-hidden="true" />
            </Button></TooltipTrigger><TooltipContent>下一曲</TooltipContent></Tooltip>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 未知进度的往复流动画 */
.indeterminate {
  animation: indeterminate 1.6s ease-in-out infinite alternate;
}
@keyframes indeterminate {
  from {
    transform: translateX(-100%);
  }
  to {
    transform: translateX(400%);
  }
}
</style>
