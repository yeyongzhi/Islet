# 安装说明

## 前置条件

- Windows 10 及以上（x64）
- 安装包发布后可直接安装；开发体验需要 Node.js（含 pnpm）与 Rust 工具链（含 MSVC）

## 下载安装包

正式版本将通过 GitHub Releases 提供 NSIS 安装程序（`Islet_x.y.z_x64-setup.exe`）：

- 最新发布页：[Islet Releases](https://github.com/yeyongzhi/Islet/releases/latest)

::: tip 当前状态
项目尚未发布首个版本，当前可通过「从源码运行」体验。
:::

## 从源码运行

```bash
# 克隆仓库后，在项目根目录执行
pnpm install
pnpm tauri dev
```

## 构建 Windows 安装包

```bash
pnpm tauri build
```

产物位于 `src-tauri/target/release/bundle/nsis/`。

## 首次启动

应用启动后自动固定在屏幕顶部居中；关闭主界面不会退出程序，请通过系统托盘或展开面板右上角设置菜单退出。
