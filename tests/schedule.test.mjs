import { test } from 'node:test'
import assert from 'node:assert/strict'
import { daysUntil, isWithinHours, nextOccurrence } from '../src/lib/schedule.ts'
import { nextPomodoroPhase } from '../src/lib/pomodoro.ts'

test('跨午夜、普通及全天时段边界', () => {
  assert.equal(isWithinHours(23, 22, 8), true)
  assert.equal(isWithinHours(8, 22, 8), false)
  assert.equal(isWithinHours(9, 9, 18), true)
  assert.equal(isWithinHours(18, 9, 18), false)
  assert.equal(isWithinHours(12, 9, 9), true)
})

test('番茄钟完成专注、休息与最终轮次', () => {
  assert.deepEqual(nextPomodoroPhase('work', 0, 2), { phase: 'break', completedRounds: 1, completed: false })
  assert.deepEqual(nextPomodoroPhase('break', 1, 2), { phase: 'work', completedRounds: 1, completed: false })
  assert.deepEqual(nextPomodoroPhase('break', 2, 2), { phase: 'idle', completedRounds: 2, completed: true })
})

test('重复日期处理月末、闰日、过去和未来起始日', () => {
  assert.equal(daysUntil('2024-01-31', 'monthly', new Date(2025, 1, 1)), 27)
  assert.equal(daysUntil('2024-02-29', 'yearly', new Date(2025, 1, 1)), 27)
  assert.equal(daysUntil('2030-02-01', 'yearly', new Date(2026, 1, 1)), 1461)
  assert.equal(daysUntil('2026-01-01', 'none', new Date(2026, 0, 2)), -1)
})

test('重复事项展示实际下次日期，未来起始日和无效日期保持明确', () => {
  const date = nextOccurrence('2024-02-29', 'yearly', new Date(2025, 1, 1))
  assert.deepEqual([date.getFullYear(), date.getMonth() + 1, date.getDate()], [2025, 2, 28])
  const future = nextOccurrence('2030-02-01', 'yearly', new Date(2026, 1, 1))
  assert.equal(future.getFullYear(), 2030)
  assert.equal(nextOccurrence('2025-02-30', 'none', new Date()), null)
})
