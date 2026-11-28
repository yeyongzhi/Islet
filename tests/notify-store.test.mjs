import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { createPinia, setActivePinia } from 'pinia'

test('展开和收起之间替换通知时不会留下失去计时器的旧通知', async () => {
  const oldWindow = globalThis.window
  let nextId = 0
  const timers = new Map()
  globalThis.window = {
    location: { hash: '' },
    __TAURI_INTERNALS__: { invoke: async () => {} },
    setTimeout: callback => { const id = ++nextId; timers.set(id, callback); return id },
    clearTimeout: id => timers.delete(id),
    setInterval: () => 0, clearInterval: () => {},
  }
  const server = await createServer({ configFile: false, resolve: { alias: { '@': `${process.cwd()}/src` } }, optimizeDeps: { noDiscovery: true, include: [] }, server: { middlewareMode: true }, appType: 'custom' })
  try {
    const { useNotifyStore } = await server.ssrLoadModule('/src/stores/notify.ts')
    const { useIslandStore } = await server.ssrLoadModule('/src/stores/island.ts')
    setActivePinia(createPinia())
    const notify = useNotifyStore()
    const island = useIslandStore()
    island.expanded = true
    notify.enqueue({ kind: 'ime', text: '输入法：英文' })
    assert.equal(notify.overlay?.text, '输入法：英文')
    island.expanded = false
    notify.enqueue({ kind: 'capsLock', text: '大写锁定已开启' })
    assert.equal(notify.overlay, null)
    assert.equal(notify.current?.kind, 'capsLock')
    for (const callback of [...timers.values()]) callback()
    assert.equal(notify.current, null)
    assert.equal(notify.overlay, null)
    notify.stop()
  } finally {
    await server.close()
    globalThis.window = oldWindow
  }
})
