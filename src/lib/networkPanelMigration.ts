/** 将旧的网络连接和网速面板合并，保留已启用面板的位置与收藏状态。 */
type NetworkPanelPrefs = { panelOrder?: string[]; disabledPanels?: string[]; favoritePanels?: string[]; lastPanel?: string }
export function migrateNetworkPanels<T extends NetworkPanelPrefs>(prefs: T): T {
  const order = Array.isArray(prefs.panelOrder) ? prefs.panelOrder : undefined
  const disabled = Array.isArray(prefs.disabledPanels) ? prefs.disabledPanels : undefined
  const favorites = Array.isArray(prefs.favoritePanels) ? prefs.favoritePanels : undefined
  const oldId = 'connection'
  const mergedId = 'netspeed'
  if (!order?.includes(oldId) && !disabled?.includes(oldId) && !favorites?.includes(oldId) && prefs.lastPanel !== oldId) return prefs
  const result: NetworkPanelPrefs = { ...prefs }
  if (order) {
    const networkIds = order.filter(id => id === oldId || id === mergedId)
    const preferred = networkIds.find(id => !disabled?.includes(id)) ?? networkIds[0]
    let inserted = false
    result.panelOrder = order.flatMap(id => {
      if (id !== oldId && id !== mergedId) return [id]
      if (id !== preferred || inserted) return []
      inserted = true
      return [mergedId]
    })
  }
  if (disabled) {
    const known = order?.filter(id => id === oldId || id === mergedId) ?? [oldId, mergedId].filter(id => disabled.includes(id))
    const enabled = known.some(id => !disabled.includes(id))
    result.disabledPanels = disabled.filter(id => id !== oldId && id !== mergedId)
    if (!enabled && (known.length > 0 || disabled.includes(mergedId))) result.disabledPanels.push(mergedId)
  }
  if (favorites) result.favoritePanels = [...new Set(favorites.map(id => id === oldId ? mergedId : id))]
  if (prefs.lastPanel === oldId) result.lastPanel = mergedId
  return result as T
}
