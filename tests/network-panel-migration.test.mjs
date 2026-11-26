import { test } from 'node:test'
import assert from 'node:assert/strict'
import { migrateNetworkPanels } from '../src/lib/networkPanelMigration.ts'

test('旧连接面板启用时保留它的位置、收藏与上次面板', () => {
  const migrated = migrateNetworkPanels({ panelOrder: ['clock', 'netspeed', 'weather', 'connection', 'music'], disabledPanels: ['netspeed'], favoritePanels: ['connection'], lastPanel: 'connection' })
  assert.deepEqual(migrated.panelOrder, ['clock', 'weather', 'netspeed', 'music'])
  assert.deepEqual(migrated.disabledPanels, [])
  assert.deepEqual(migrated.favoritePanels, ['netspeed'])
  assert.equal(migrated.lastPanel, 'netspeed')
  assert.deepEqual(migrateNetworkPanels(migrated), migrated)
})

test('旧网速面板启用时保留其位置；两个面板都关闭时保持关闭', () => {
  const prefs = { panelOrder: ['connection', 'clock', 'netspeed'], disabledPanels: ['connection'], favoritePanels: ['connection', 'netspeed'] }
  const enabled = migrateNetworkPanels(prefs)
  assert.deepEqual(enabled.panelOrder, ['clock', 'netspeed'])
  assert.deepEqual(enabled.disabledPanels, [])
  assert.deepEqual(enabled.favoritePanels, ['netspeed'])
  const disabled = migrateNetworkPanels({ ...prefs, disabledPanels: ['connection', 'netspeed'] })
  assert.deepEqual(disabled.disabledPanels, ['netspeed'])
})

test('旧网速面板未出现连接面板时不更改用户设置', () => {
  const prefs = { panelOrder: ['clock', 'netspeed'], disabledPanels: ['netspeed'] }
  assert.equal(migrateNetworkPanels(prefs), prefs)
})

test('重复的旧面板标识只迁移一次', () => {
  const migrated = migrateNetworkPanels({ panelOrder: ['connection', 'connection', 'netspeed'], disabledPanels: [] })
  assert.deepEqual(migrated.panelOrder, ['netspeed'])
})
