import type { PanelId } from '@/stores/panels'

const images = import.meta.glob<string>('../assets/panel-illustrations/*.png', { eager: true, query: '?url', import: 'default' })

export function panelIllustration(id: PanelId): string {
  const name = id === 'netspeed' ? 'network' : id === 'disks' ? 'disk' : id
  return images[`../assets/panel-illustrations/${name}.png`] ?? ''
}
