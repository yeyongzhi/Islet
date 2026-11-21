# WinIsland v0.2.0 多面板 + 设置窗口 + 贴边拖动 实施计划

## Context

当前 v0.1.0 只有单一日历面板、固定顶部居中、无设置界面。本次升级实现：
1. **多面板切换系统**（参考图2 翻页样式）：日历（默认）、天气、音乐、番茄专注、剪贴板历史、喝水/上厕所
2. **设置主窗口**：按 desktop-app-conventions 分类设置（外观/数据/关于）
3. **灵动岛贴边与拖动**：支持顶/左/右/底四边停靠、拖动换位、位置持久化

已确认决策：音乐用 **SMTC 系统媒体接口**；天气用 **Open-Meteo**（免费无 Key）；本期做全部 7 个面板。

## 一、Tauri 后端（src-tauri/）

### Cargo.toml 新增依赖
- `windows = { version = "0.62", features = ["Media_Control", "Foundation", "Storage_Streams"] }` — SMTC
- `arboard = "3"` — 剪贴板监听/写入

### lib.rs 重构（winisland_lib）
- **布局命令** `set_island_layout(edge: String, expanded: bool, offset: f64)`：按边（top/left/right/bottom）计算窗口尺寸与位置——top 时胶囊在顶部居中、面板向下；left/right 时胶囊垂直居中贴边、面板向屏幕内侧展开；bottom 面板向上。统一保留 TOP_MARGIN=8 的贴边间距，位置做屏幕边界钳制。
- **拖动** `start_drag()`（调用 window.start_dragging()）
- **SMTC 命令** `get_media_state() -> Option<{title, artist, position, duration, playing}>`（每次轮询取当前会话）+ `media_control(action)`（play/pause/next/prev）
- **剪贴板** `start_clipboard_monitor()`：arboard 后台线程轮询（800ms 去重），Tauri emit `clipboard://new`；`write_clipboard(text)`、`clear_clipboard_history()`（前端历史为主，Rust 只负责监听与写入）
- **偏好存储**（按安装根目录约定）：`load_preferences()/save_preferences(json)` 读写 exe 目录 `setting/preferences.json`；`load_counters()/save_counters(json)` 读写 `data/counters.json`（喝水/上厕所当日计数）。JSON 读取失败保留原文件返回错误，不用默认值覆盖。
- **设置窗口**：tauri.conf.json 增加 label=`settings` 的窗口（880×620、visible:false）；Rust `on_window_event` 拦截其 CloseRequested → hide（托盘驻留）；`open_settings` 命令显示并聚焦。
- capabilities：`main` 与 `settings` 两个窗口均授权 core:default + 自定义命令（自定义命令默认可用，无需额外权限）。

## 二、前端：面板框架与 7 个面板（src/）

### 状态层（src/stores/）
- `panels.ts`：面板注册表（id/名称/图标），`activePanel`；顺序：calendar → weather → music → pomodoro → clipboard → health
- `settings.ts`：外观偏好（appearanceMode/themeColor/borderRadius/fontSize）+ 岛停靠状态（edge/offset），load/save 走 preferences 命令，即时应用 CSS 变量（--radius、字号、主题色）
- `weather.ts`：Open-Meteo geocoding + forecast（中文 weathercode 映射表），城市缓存于偏好
- `music.ts`：1s 轮询 get_media_state，控制命令
- `pomodoro.ts`：idle/working/breaking/paused，25/5 分钟默认可调，运行时胶囊显示倒计时
- `clipboard.ts`：监听 `clipboard://new` 事件，上限 50 条，点击回写
- `health.ts`：water/pee/poo 计数 + 日期变更自动清零，持久化 counters

### 视图与组件
- `views/IslandView.vue`（重构）：拖动（胶囊 pointerdown → start_drag）、停靠边状态、形变动画保留；展开尺寸按面板统一 540×360
- `views/SettingsView.vue`（新增，路由 `/settings`）：左侧分类 nav（外观/数据/关于，Button ghost）+ 内容区 ScrollArea，按规范实现：
  - **外观**：外观模式（亮/暗/跟随系统，作用于设置窗口；岛固定暗色——悬浮窗语义，在界面上说明）、主题色预设（红橙黄绿青蓝紫，色块+选中态）、全局圆角 Select（0/4/8/12/16默认/24）、UI 字号 Select（14默认/16/18/20/24）
  - **数据**：数据存储位置展示、喝水/上厕所计数清零（AlertDialog 确认 + destructive）、剪贴板历史清空（确认）
  - **关于**：应用名/版本/简介、GitHub 链接；未发布前不显示「检查更新」按钮（无渠道，符合交互规范）
- `components/island/`：
  - `IslandPanel.vue` 重构为壳层：顶部日期时间 + ⚙设置菜单（设置/退出）+ 左右箭头（ChevronLeft/Right 切换面板）+ 底部指示点
  - `panels/CalendarPanel.vue`（现左右布局迁入）、`WeatherPanel.vue`（今日+5日预报）、`MusicPanel.vue`（封面占位/曲名/进度条/播放控制，无会话时显示"未在播放"空态）、`PomodoroPanel.vue`（计时+开始暂停+时长调整）、`ClipboardPanel.vue`（ScrollArea 列表+复制+清空）、`HealthPanel.vue`（喝水大按钮+目标进度、小手/大手计数）
- `components/settings/`：`SettingsNav.vue`、各分类区块组件
- 胶囊 `IslandPill.vue`：番茄钟运行时显示倒计时优先

### 新增 shadcn-vue 组件（CLI 安装）
scroll-area、select、switch、dialog、alert-dialog、sonner、input、label

## 三、验证与收尾

1. `cargo check` + `pnpm run build` 通过
2. `pnpm tauri dev` 启动：验证拖动贴边（手动）、面板切换动画、SMTC 读取（本机播放器播放时）、剪贴板监听、偏好持久化（重启恢复）
3. 无法自动化验证的项（拖动手感、SMTC 实机行为、Open-Meteo 网络）如实报告，交由用户手动验收
4. 版本 0.1.0 → **0.2.0**（minor，新功能）：package.json / tauri.conf.json / Cargo.toml / docs/package.json 同步；CHANGELOG.md 增条目（≤5 条 emoji 规范）；README 功能清单更新；提交 develop

## 关键文件清单

- 修改：`src-tauri/src/lib.rs`、`src-tauri/Cargo.toml`、`src-tauri/tauri.conf.json`、`src/views/IslandView.vue`、`src/components/island/*`、`src/stores/island.ts`、`vite.config.ts`（如需）
- 新增：`src/views/SettingsView.vue`、`src/components/island/panels/*.vue`(5个)、`src/components/settings/*.vue`、`src/stores/{panels,settings,weather,music,pomodoro,clipboard,health}.ts`、`src/services/openMeteo.ts`
- 复用：现有形变动画壳层（IslandView scoped style）、`@/components/ui/*` 全部现有组件、island store 的 setExpanded 时序逻辑