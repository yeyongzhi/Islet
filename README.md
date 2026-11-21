# WinIsland

Windows 桌面灵动岛 —— 在屏幕顶部提供一枚常驻悬浮胶囊，展开即见日历、日期、时间与天气。

## 软件说明

WinIsland 是一款 Windows 桌面常驻小部件：默认收起为屏幕顶部居中的黑色胶囊（显示时间与天气），鼠标悬停后展开为信息面板，展示当月日历、完整日期时间与天气卡片。适合希望在桌面快速瞥见日程与天气的用户。

## 当前版本

`v0.1.0`（开发中，尚未发布）

## 最新版本

暂未发布正式版本。发布后将从 GitHub Releases 提供 Windows 安装包下载；发布入口：`https://github.com/<owner>/WinIsland/releases/latest`

## 功能清单

- ✅ 顶部居中透明胶囊：显示时间与天气概要
- ✅ 悬停展开 / 移出自动收起
- ✅ 展开面板：完整日期时间、当月日历、天气卡片
- ✅ 系统托盘退出、面板设置菜单退出
- 🚧 真实天气数据接入（当前为示例数据）
- 🚧 音乐播放等多页卡片

## 安装与使用

开发体验：

```bash
pnpm install
pnpm tauri dev
```

发布安装包将随 GitHub Release 提供（NSIS 安装程序）；完整说明见文档站「安装说明」。

## 开发简介

- `src/` Vue 3 前端（灵动岛胶囊与展开面板 UI）
- `src-tauri/` Tauri 2 后端（窗口定位、尺寸切换、系统托盘）
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
- VitePress（产品文档站）

## 更新日志

- [查看更新日志](./CHANGELOG.md)（文档站同步展示）

## 联系作者

- GitHub Issues：`https://github.com/<owner>/WinIsland/issues`
