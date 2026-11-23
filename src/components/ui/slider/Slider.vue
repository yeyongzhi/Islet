<script setup lang="ts">
import type { SliderRootEmits, SliderRootProps } from "reka-ui"
import type { HTMLAttributes } from "vue"
import { reactiveOmit } from "@vueuse/core"
import { cn } from "cn"
import { SliderRange, SliderRoot, SliderTrack, SliderThumb, useForwardPropsEmits } from "reka-ui"

const props = defineProps<SliderRootProps & { class?: HTMLAttributes["class"] }>()

const emits = defineEmits<SliderRootEmits>()

const delegatedProps = reactiveOmit(props, "class")

const forwarded = useForwardPropsEmits(delegatedProps, emits)
</script>

<template>
  <SliderRoot
    v-slot="{ modelValue }"
    data-slot="slider"
    :class="cn(
      'relative flex w-full touch-none select-none items-center data-[disabled]:opacity-50',
      props.class,
    )"
    v-bind="forwarded"
  >
    <SliderTrack
      data-slot="slider-track"
      class="bg-muted relative h-1.5 w-full grow overflow-hidden rounded-full"
    >
      <SliderRange
        data-slot="slider-range"
        class="bg-primary absolute h-full"
      />
    </SliderTrack>
    <SliderThumb
      v-for="(_, i) in modelValue"
      :key="i"
      data-slot="slider-thumb"
      class="border-primary bg-background block size-4 shrink-0 rounded-full border shadow-sm transition-[color,box-shadow] hover:ring-4 hover:ring-primary/20 focus-visible:ring-4 focus-visible:ring-primary/30 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
    />
  </SliderRoot>
</template>
