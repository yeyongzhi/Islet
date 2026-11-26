import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

test('计时器暂停后恢复，结束后只提醒一次', async () => {
  const oldWindow = globalThis.window
  const oldNow = Date.now
  const intervals = []
  const calls = []
  let now = 100_000
  globalThis.window = { location: { hash: '' }, __TAURI_INTERNALS__: { invoke: async (command, args) => { calls.push({ command, args }) } }, setInterval: callback => { intervals.push(callback); return intervals.length }, setTimeout, clearTimeout, clearInterval: () => {} }
  Date.now = () => now
  const server = await createServer({ configFile: false, resolve: { alias: { '@': `${process.cwd()}/src` } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { useTimerStore } = await server.ssrLoadModule('/src/stores/timer.ts')
    const { useNotifyStore } = await server.ssrLoadModule('/src/stores/notify.ts')
    const { useIslandStore } = await server.ssrLoadModule('/src/stores/island.ts')
    const { useSettingsStore, PANEL_SIZES } = await server.ssrLoadModule('/src/stores/settings.ts')
    setActivePinia(createPinia())
    const timer = useTimerStore()
    assert.equal(timer.setMinutes(0), false)
    assert.equal(timer.setMinutes(1), true)
    timer.start()
    now += 15_000
    intervals[0]()
    assert.equal(timer.remaining, 45)
    timer.pause()
    now += 30_000
    intervals[0]()
    assert.equal(timer.remaining, 45)
    timer.start()
    now += 45_000
    intervals[0]()
    assert.equal(timer.remaining, 0)
    assert.equal(timer.completed, true)
    assert.equal(timer.running, false)
    assert.equal(useNotifyStore().current?.text, '倒计时结束')
    intervals[0]()
    assert.equal(timer.completed, true)
    const island = useIslandStore()
    const settings = useSettingsStore()
    const surface = PANEL_SIZES[settings.prefs.panelSize]
    await island.setExpanded(true, { w: 220, h: 64 })
    await island.setExpanded(true)
    await island.setExpanded(false)
    const layouts = calls.filter(call => call.command === 'set_island_state').map(call => call.args)
    assert.equal(layouts.length, 3)
    assert.deepEqual(layouts.map(layout => [layout.panelWidth, layout.panelHeight]), [[220, 64], [surface.w, surface.h], [surface.w, surface.h]])
    assert.ok(layouts.every(layout => layout.surfaceWidth === surface.w && layout.surfaceHeight === surface.h))
    useNotifyStore().stop()
  } finally {
    await server.close()
    Date.now = oldNow
    globalThis.window = oldWindow
  }
})
