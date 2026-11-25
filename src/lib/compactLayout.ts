import type { CompactItem } from '@/stores/settings'

const SIZES: Record<CompactItem, number> = { face: 32, time: 78, weather: 48, date: 48, weekday: 48, battery: 42 }
type LayoutOptions = { compactShowSeconds: boolean; compactWeatherIcon: boolean; compactDateFormat: string }
function itemWidth(id: CompactItem, options?: LayoutOptions) {
  if (id === 'time' && options?.compactShowSeconds === false) return 58
  if (id === 'weather' && options?.compactWeatherIcon) return 64
  if (id === 'date' && options?.compactDateFormat.startsWith('YYYY')) return 104
  return SIZES[id]
}
const WIDTH = 250
const GAP = 2
const HORIZONTAL_INSET = 8
/** 固定画布上按内容宽度约束位置，确保相邻元素不重叠。 */
export function compactLayout(items: CompactItem[], positions: Partial<Record<CompactItem, number>>, options?: LayoutOptions) {
  if (!items.length) return []
  const sum = items.reduce((n, id) => n + itemWidth(id, options), 0)
  const scale = Math.min(1, (WIDTH - 2 * HORIZONTAL_INSET - GAP * (items.length - 1)) / sum)
  const widths = items.map(id => itemWidth(id, options) * scale)
  const free = WIDTH - 2 * HORIZONTAL_INSET - widths.reduce((a, b) => a + b, 0) - GAP * (items.length - 1)
  let cursor = HORIZONTAL_INSET
  const result = items.map((id, index) => {
    const width = widths[index]!
    const fallback = cursor + (index ? free / Math.max(1, items.length - 1) : 0)
    const saved = positions?.[id]
    const left = Math.max(cursor, Number.isFinite(saved) ? saved! : fallback)
    cursor = left + width + GAP
    return { id, left, width }
  })
  let right = WIDTH - HORIZONTAL_INSET
  for (let i = result.length - 1; i >= 0; i--) {
    const item = result[i]!
    item.left = Math.min(item.left, right - item.width)
    right = item.left - GAP
  }
  return result
}

/** 移动内容；跨过相邻内容的中心时调整顺序，并推开相邻项以避免重叠。 */
export function moveCompactItem(items: CompactItem[], positions: Partial<Record<CompactItem, number>>, id: CompactItem, desiredLeft: number, options?: LayoutOptions) {
  const current = compactLayout(items, positions, options)
  const moving = current.find(item => item.id === id)
  if (!moving) return null
  const others = current.filter(item => item.id !== id)
  const center = desiredLeft + moving.width / 2
  const index = others.findIndex(item => center < item.left + item.width / 2)
  const insertion = index < 0 ? others.length : index
  const arranged = [...others.slice(0, insertion), { ...moving, left: desiredLeft }, ...others.slice(insertion)]
  const leftBound = HORIZONTAL_INSET
  const rightBound = WIDTH - HORIZONTAL_INSET
  const leftSpace = arranged.slice(0, insertion).reduce((sum, item) => sum + item.width + GAP, leftBound)
  const rightSpace = arranged.slice(insertion + 1).reduce((sum, item) => sum + item.width + GAP, 0)
  arranged[insertion]!.left = Math.max(leftSpace, Math.min(rightBound - rightSpace - moving.width, desiredLeft))
  for (let i = insertion - 1; i >= 0; i--) {
    arranged[i]!.left = Math.min(arranged[i]!.left, arranged[i + 1]!.left - GAP - arranged[i]!.width)
  }
  for (let i = insertion + 1; i < arranged.length; i++) {
    arranged[i]!.left = Math.max(arranged[i]!.left, arranged[i - 1]!.left + arranged[i - 1]!.width + GAP)
  }
  return { items: arranged.map(item => item.id), positions: Object.fromEntries(arranged.map(item => [item.id, item.left])) as Partial<Record<CompactItem, number>> }
}
