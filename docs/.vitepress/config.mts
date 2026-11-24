import { defineConfig } from 'vitepress'

// 站点将部署到 GitHub Pages 项目页：yeyongzhi.github.io/Islet/
export default defineConfig({
  base: '/Islet/',
  lang: 'zh-CN',
  title: 'Islet（灵岛）',
  description: 'Islet（灵岛）是 Windows 桌面灵动岛与轻量信息工具，重要信息一眼可见。',
  head: [['link', { rel: 'icon', type: 'image/png', href: '/Islet/favicon.png' }]],
  themeConfig: {
    nav: [
      { text: '介绍', link: '/' },
      { text: '安装', link: '/install' },
      { text: '使用', link: '/usage' },
      { text: '面板', link: '/features' },
      { text: '更新日志', link: '/changelog' },
    ],
    sidebar: [
      { text: '介绍', link: '/' },
      { text: '安装说明', link: '/install' },
      { text: '使用说明', link: '/usage' },
      { text: '面板清单', link: '/features' },
      { text: '更新日志', link: '/changelog' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/yeyongzhi/Islet' }],
    outline: { level: [2, 3], label: '本页目录' },
  },
})
