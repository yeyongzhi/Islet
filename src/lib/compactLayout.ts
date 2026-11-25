import type { CompactItem } from '@/stores/settings'

const SIZES: Record<CompactItem, number> = { face: 32, time: 68, weather: 48, date: 36, weekday: 32, battery: 42 }
const WIDTH = 250
const GAP = 2
/** 固定画布上按内容宽度约束位置，确保相邻元素不重叠。 */
export function compactLayout(items: CompactItem[], positions: Partial<Record<CompactItem, number>>) {
  if (!items.length) return []
  const sum = items.reduce((n, id) => n + SIZES[id], 0)
  const scale = Math.min(1, (WIDTH - GAP * (items.length - 1)) / sum)
  const widths = items.map(id => SIZES[id] * scale)
  const free = WIDTH - widths.reduce((a, b) => a + b, 0) - GAP * (items.length - 1)
  let cursor = 0
  const result = items.map((id, index) => {
    const width = widths[index]!
    const fallback = cursor + (index ? free / Math.max(1, items.length - 1) : 0)
    const saved = positions?.[id]
    const left = Math.max(cursor, Number.isFinite(saved) ? saved! : fallback)
    cursor = left + width + GAP
    return { id, left, width }
  })
  let right = WIDTH
  for (let i = result.length - 1; i >= 0; i--) {
    const item = result[i]!
    item.left = Math.min(item.left, right - item.width)
    right = item.left - GAP
  }
  return result
}
