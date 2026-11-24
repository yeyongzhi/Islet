# Islet（灵岛）

![Islet（灵岛）应用图标](./src-tauri/icons/128x128.png)

Windows 桌面灵动岛与轻量信息工具 —— 重要信息，一眼可见。

## 软件说明

Islet（灵岛）是一款 Windows 桌面常驻小部件：默认收起为屏幕边缘的小胶囊（显示时间/番茄钟与天气），鼠标悬停后展开为多面板信息站，支持四边停靠与拖动换位。它帮助用户快速查看信息并处理轻量任务。

## 当前版本

`v0.1.0-beta1`（Beta 预览版，尚未正式发布）

## 最新版本

尚无正式版本发布。当前 Beta 预览版的 [发布页面](https://github.com/yeyongzhi/Islet/releases/tag/v0.1.0-beta1)（发布后可在此获取 Windows 安装包）；正式版发布后可从 [GitHub Releases](https://github.com/yeyongzhi/Islet/releases/latest) 下载。

## 功能清单

- ✅ 顶部/侧边停靠的透明胶囊：时间、番茄钟倒计时与天气概要
- ✅ 悬停展开 / 移出自动收起，形变动画过渡
- ✅ 多面板切换与管理：日历、日期时间、时间进度、倒数日、汇率、天气、系统监控、网速、磁盘占用、音乐、番茄专注、剪贴板、中转站、快速启动、下班倒计时、系统信息、久坐提醒、喝水、上厕所和护眼提醒
- ✅ 天气接入 Open-Meteo；音乐支持系统播放器控制；提供剪贴板历史和本地文件中转
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

- `src/` Vue 3 前端（岛胶囊、多面板、设置窗口）
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

- GitHub Issues：[Islet 问题反馈](https://github.com/yeyongzhi/Islet/issues)
