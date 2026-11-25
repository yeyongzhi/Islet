# 安装说明

## 前置条件

- Windows 10 及以上（x64）
- Beta 安装需要 Windows x64；从源码开发需要 Node.js（含 pnpm）与 Rust 工具链（含 MSVC）

## 下载安装包

当前 Beta 通过 GitHub Release 提供 NSIS 安装程序（`Islet_0.1.0-beta3_x64-setup.exe`）：

- [下载 v0.1.0-beta3（Windows x64）](https://github.com/yeyongzhi/Islet/releases/tag/v0.1.0-beta3)

::: tip 当前状态
这是 Beta 预发布版本，尚非正式稳定版。遇到问题请通过 GitHub Issues 反馈。
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
