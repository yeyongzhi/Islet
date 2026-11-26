/** 返回当日下班倒计时；使用向上取整，避免提前显示已到零秒。 */
export function formatOffworkCountdown(now: Date, endTime: string): string {
  const [hours, minutes] = endTime.split(':').map(Number)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours ?? 18, minutes ?? 0).getTime()
  const diff = end - now.getTime()
  if (diff <= 0) return '已下班 🎉'
  const seconds = Math.ceil(diff / 1000)
  return [Math.floor(seconds / 3600), Math.floor(seconds % 3600 / 60), seconds % 60]
    .map(value => String(value).padStart(2, '0')).join(':')
}
