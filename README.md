# WinIsland

Windows 桌面灵动岛 —— 在屏幕边缘提供一枚常驻悬浮胶囊，展开即见日历、天气、音乐、专注时钟与健康小工具。

## 软件说明

WinIsland 是一款 Windows 桌面常驻小部件：默认收起为屏幕边缘的小胶囊（显示时间/番茄钟与天气），鼠标悬停后展开为多面板信息站，支持四边停靠与拖动换位。适合希望在桌面快速处理轻量信息的用户。

## 当前版本

`v0.2.0`（开发中，尚未发布）

## 最新版本

暂未发布正式版本。发布后将从 GitHub Releases 提供 Windows 安装包下载；发布入口：`https://github.com/<owner>/WinIsland/releases/latest`

## 功能清单

- ✅ 顶部/侧边停靠的透明胶囊：时间、番茄钟倒计时与天气概要
- ✅ 悬停展开 / 移出自动收起，形变动画过渡
- ✅ 多面板切换（翻页箭头 + 指示点）：
  - 日历：当月日历 + 天气概要
  - 天气：Open-Meteo 真实数据，今日详情 + 未来 6 天预报，城市可切换
  - 音乐：SMTC 读取本机播放器（网易云/QQ 音乐等），曲名/进度/播放控制
  - 番茄专注：25/5 可调计时，运行时胶囊显示倒计时
  - 剪贴板：文本历史（50 条），点击回写
  - 健康：喝水杯数目标进度 + 小手/大手当日计数
- ✅ 拖动换位，顶/左/右/底四边吸附，位置跨启动记忆
- ✅ 设置窗口：外观（模式/主题色/圆角/字号）、数据管理、关于
- ✅ 系统托盘退出、面板设置菜单

## 安装与使用

开发体验：

```bash
pnpm install
pnpm tauri dev
```

发布安装包将随 GitHub Release 提供（NSIS 安装程序）；完整说明见文档站「安装说明」。

## 开发简介

- `src/` Vue 3 前端（岛胶囊、六个面板、设置窗口）
- `src-tauri/` Tauri 2 后端（窗口停靠/拖动、SMTC、剪贴板监听、本地持久化）
- `docs/` VitePress 产品文档站

本地开发需 Node.js（含 pnpm）、Rust 工具链（含 MSVC）。

```bash
pnpm install          # 安装依赖
pnpm dev              # 仅前端浏览器预览
pnpm tauri dev        # 桌面应用开发调试
pnpm build            # 前端类型检查与构建
pnpm tauri build      # 构建 Windows 安装包
pnpm --dir docs docs:build  # 构建文档站
```

## 技术栈

- Vue 3 + TypeScript + Vite（前端）
- Pinia / Vue Router（状态与路由）
- Tailwind CSS 4 + shadcn-vue（UI 组件）
- Tauri 2 / Rust（桌面运行时、窗口与托盘）
- Windows SMTC / arboard（媒体控制、剪贴板）
- VitePress（产品文档站）

## 更新日志

- [查看更新日志](./CHANGELOG.md)（文档站同步展示）

## 联系作者

- GitHub Issues：`https://github.com/<owner>/WinIsland/issues`
