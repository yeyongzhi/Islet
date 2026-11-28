# Islet（灵岛）

![Islet（灵岛）应用图标](./src-tauri/icons/128x128.png)

Windows 桌面灵动岛与轻量信息工具 —— 重要信息，一眼可见。

[项目文档](./docs/index.md) · [功能清单](./docs/features.md) · [安装说明](./docs/install.md) · [使用说明](./docs/usage.md) · [问题反馈](https://github.com/yeyongzhi/Islet/issues)

## 软件说明

Islet（灵岛）是一款 Windows 桌面常驻小部件：默认收起为屏幕边缘的小胶囊（显示时间/番茄钟与天气），鼠标悬停后展开为多面板信息站，支持四边停靠与拖动换位。它帮助用户快速查看信息并处理轻量任务。

## 当前版本

`v0.1.0-beta.8`（当前代码版本，Beta 预览版）

## 最新版本

[查看 Beta 发布及 Windows 安装包](https://github.com/yeyongzhi/Islet/releases)。正式版发布后可从 [最新正式版本](https://github.com/yeyongzhi/Islet/releases/latest) 获取。

## 功能清单

- ✅ 顶部/侧边停靠的透明胶囊：时间、番茄钟倒计时与天气概要
- ✅ 悬停展开 / 移出自动收起，形变动画过渡
- ✅ 多面板切换与管理：日历、日期时间、时间进度、倒数日、单位换算、天气、系统监控、网络连接、磁盘占用、音乐、番茄专注、剪贴板、中转站、快速启动、相册、下班倒计时、系统信息、久坐提醒、喝水、上厕所和护眼提醒
- ✅ 天气接入 Open-Meteo；音乐支持系统播放器控制；提供剪贴板历史和本地文件中转
- ✅ 拖动换位，顶/左/右/底四边吸附，位置跨启动记忆
- ✅ 设置窗口：外观（模式/主题色/圆角/字号）、数据管理、关于
- ✅ 系统托盘退出、面板设置菜单与收起态内容位置调整
- ✅ 支持刘海、胶囊与指示条样式，设置收起内容、字体和背景透明度
- ✅ 音乐面板支持进度拖动与封面配色律动，喝水面板显示每日目标与进度
- ✅ 倒计时器、音量控制、电池与电源、网络连接面板，可在设置中启用；音量面板可切换输出设备

## 安装与使用

也可以从源码运行：

```bash
pnpm install
pnpm tauri dev
```

安装步骤见[安装说明](./docs/install.md)，日常操作见[使用说明](./docs/usage.md)。当前 Beta 提供 Windows x64 NSIS 安装程序。

## 开发简介

- `src/` Vue 3 前端（岛胶囊、多面板、设置窗口）
- `src-tauri/` Tauri 2 后端（窗口停靠/拖动、SMTC、剪贴板监听、本地持久化）
- `docs/` VitePress 产品文档站

本地开发需 Node.js（含 pnpm）、Rust 工具链（含 MSVC）。

支持平台：Windows 10 及以上，x64。应用使用 Windows 桌面能力，当前不提供 macOS 或 Linux 安装包。

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

## 文档与更新日志

- [项目文档首页](./docs/index.md)
- [功能清单](./docs/features.md)
- [更新日志](./CHANGELOG.md)（VitePress 站点复用同一日志内容）

## 联系作者

- GitHub Issues：[Islet 问题反馈](https://github.com/yeyongzhi/Islet/issues)
