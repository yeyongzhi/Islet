/** 根据截止时间计算剩余秒数，防止定时器节流或休眠后产生累计误差。 */
export function timerRemaining(deadline: number, now: number): number {
  return Math.max(0, Math.ceil((deadline - now) / 1000))
}

export function formatTimer(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const rest = seconds % 60
  return (hours ? [hours, minutes, rest] : [minutes, rest]).map(value => String(value).padStart(2, '0')).join(':')
}
