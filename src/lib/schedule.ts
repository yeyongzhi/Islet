export type Repeat = 'none' | 'yearly' | 'monthly'

/** 同值表示全天；结束时刻不包含在时段内。 */
export function isWithinHours(hour: number, start: number, end: number): boolean {
  return start === end || (start < end ? hour >= start && hour < end : hour >= start || hour < end)
}

/** 以当地自然日比较；重复日期在当月无对应日期时取月末。 */
export function nextOccurrence(date: string, repeat: Repeat, now: Date): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  if (!match) return null
  const year = Number(match[1]), month = Number(match[2]) - 1, day = Number(match[3])
  let target = new Date(year, month, day)
  if (target.getFullYear() !== year || target.getMonth() !== month || target.getDate() !== day) return null
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (repeat !== 'none' && target <= today) {
    const makeDate = (y: number, m: number) => new Date(y, m, Math.min(day, new Date(y, m + 1, 0).getDate()))
    target = repeat === 'yearly' ? makeDate(today.getFullYear(), month) : makeDate(today.getFullYear(), today.getMonth())
    if (target < today) target = repeat === 'yearly' ? makeDate(today.getFullYear() + 1, month) : makeDate(today.getFullYear(), today.getMonth() + 1)
  }
  return target
}

export function daysUntil(date: string, repeat: Repeat, now: Date): number {
  const target = nextOccurrence(date, repeat, now)
  if (!target) return 0
  return Math.round((Date.UTC(target.getFullYear(), target.getMonth(), target.getDate()) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 86400000)
}
