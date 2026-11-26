import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatTimer, timerRemaining } from '../src/lib/timer.ts'

test('倒计时按截止时间计算，休眠后不会累积误差或显示负数', () => {
  assert.equal(timerRemaining(301_000, 1_000), 300)
  assert.equal(timerRemaining(301_000, 300_001), 1)
  assert.equal(timerRemaining(301_000, 301_000), 0)
  assert.equal(timerRemaining(301_000, 400_000), 0)
})

test('倒计时在小时边界保持清晰格式', () => {
  assert.equal(formatTimer(0), '00:00')
  assert.equal(formatTimer(59), '00:59')
  assert.equal(formatTimer(3600), '01:00:00')
  assert.equal(formatTimer(86400), '24:00:00')
})
