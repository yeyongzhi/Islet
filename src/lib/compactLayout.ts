import type { CompactItem } from '@/stores/settings'

const SIZES: Record<CompactItem, number> = { face: 32, time: 78, weather: 48, date: 48, weekday: 48, battery: 42 }
type LayoutOptions = { compactShowSeconds: boolean; compactWeatherIcon: boolean; compactDateFormat: string }
function itemWidth(id: CompactItem, options?: LayoutOptions) {
  if (id === 'time' && options?.compactShowSeconds === false) return 58
  if (id === 'weather' && options?.compactWeatherIcon) return 64
  if (id === 'date') {
    if (options?.compactDateFormat.startsWith('YYYY')) return 104
    if (options?.compactDateFormat === 'M/D') return 40
    return 58
  }
  return SIZES[id]
}
export function compactWidth(items: CompactItem[], options?: LayoutOptions) {
  return Math.max(80, items.reduce((n, id) => n + itemWidth(id, options), 0) + Math.max(0, items.length - 1) * 8 + 16)
}
const GAP = 2
const HORIZONTAL_INSET = 8
/** 固定画布上按内容宽度约束位置，确保相邻元素不重叠。 */
export function compactLayout(items: CompactItem[], positions: Partial<Record<CompactItem, number>>, options?: LayoutOptions) {
  if (!items.length) return []
  const WIDTH = compactWidth(items, options)
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
  const WIDTH = compactWidth(items, options)
  const current = compactLayout(items, positions, options)
  const moving = current.find(item => item.id === id)
  if (!moving) return null
  const others = current.filter(item => item.id !== id)
  // 以移动方向上的边缘跨过邻项中心为换位条件，宽元素也能移到窄元素之前。
  const threshold = desiredLeft < moving.left ? desiredLeft : desiredLeft > moving.left ? desiredLeft + moving.width : desiredLeft + moving.width / 2
  const index = others.findIndex(item => threshold < item.left + item.width / 2)
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

/** 在不重叠的前提下，将指定内容尽可能对齐到胶囊左侧、中央或右侧。 */
export function alignCompactItem(items: CompactItem[], positions: Partial<Record<CompactItem, number>>, id: CompactItem, alignment: 'left' | 'center' | 'right', options?: LayoutOptions) {
  const layout = compactLayout(items, positions, options)
  const currentIndex = layout.findIndex(item => item.id === id)
  const selected = layout[currentIndex]
  if (!selected) return null
  const others = layout.filter(item => item.id !== id)
  const width = compactWidth(items, options)
  const target = alignment === 'left' ? HORIZONTAL_INSET : alignment === 'right' ? width - HORIZONTAL_INSET - selected.width : (width - selected.width) / 2
  let best: { insertion: number; left: number; error: number } | undefined
  for (let insertion = 0; insertion <= others.length; insertion++) {
    const before = others.slice(0, insertion).reduce((n, item) => n + item.width + GAP, HORIZONTAL_INSET)
    const after = others.slice(insertion).reduce((n, item) => n + item.width + GAP, 0)
    const left = Math.max(before, Math.min(width - HORIZONTAL_INSET - after - selected.width, target))
    const error = Math.abs(left - target)
    if (!best || error < best.error || (error === best.error && Math.abs(insertion - currentIndex) < Math.abs(best.insertion - currentIndex))) best = { insertion, left, error }
  }
  if (!best) return null
  const arranged = [...others.slice(0, best.insertion), { ...selected, left: best.left }, ...others.slice(best.insertion)]
  for (let i = best.insertion - 1; i >= 0; i--) arranged[i]!.left = arranged[i + 1]!.left - GAP - arranged[i]!.width
  for (let i = best.insertion + 1; i < arranged.length; i++) arranged[i]!.left = arranged[i - 1]!.left + arranged[i - 1]!.width + GAP
  return { items: arranged.map(item => item.id), positions: Object.fromEntries(arranged.map(item => [item.id, item.left])) as Partial<Record<CompactItem, number>> }
}
