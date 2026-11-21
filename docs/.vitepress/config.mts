import { defineConfig } from 'vitepress'

// 站点将部署到 GitHub Pages 项目页：<owner>.github.io/WinIsland/
export default defineConfig({
  base: '/WinIsland/',
  lang: 'zh-CN',
  title: 'WinIsland',
  description: 'Windows 桌面灵动岛：日历、日期、时间与天气，悬停即现。',
  themeConfig: {
    nav: [
      { text: '介绍', link: '/' },
      { text: '安装', link: '/install' },
      { text: '使用', link: '/usage' },
      { text: '功能', link: '/features' },
      { text: '更新日志', link: '/changelog' },
    ],
    sidebar: [
      { text: '介绍', link: '/' },
      { text: '安装说明', link: '/install' },
      { text: '使用说明', link: '/usage' },
      { text: '功能清单', link: '/features' },
      { text: '更新日志', link: '/changelog' },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/<owner>/WinIsland' }],
    outline: { level: [2, 3], label: '本页目录' },
  },
})
