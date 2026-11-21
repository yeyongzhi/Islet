use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    LogicalPosition, LogicalSize, Manager, WebviewWindow,
};

/// 收起态（胶囊）尺寸，单位：逻辑像素
const COMPACT_WIDTH: f64 = 360.0;
const COMPACT_HEIGHT: f64 = 44.0;
/// 展开态（面板）尺寸，单位：逻辑像素
const EXPANDED_WIDTH: f64 = 380.0;
const EXPANDED_HEIGHT: f64 = 560.0;
/// 距屏幕顶部的边距
const TOP_MARGIN: f64 = 8.0;

/// 将窗口水平居中并固定在屏幕顶部
fn position_top_center(window: &WebviewWindow, width: f64) {
    let Ok(Some(monitor)) = window.primary_monitor() else {
        return;
    };
    let scale = monitor.scale_factor();
    let screen_width = monitor.size().width as f64 / scale;
    let x = (screen_width - width) / 2.0;
    let _ = window.set_position(LogicalPosition::new(x, TOP_MARGIN));
}

/// 切换灵动岛收起/展开状态：调整窗口尺寸并重新顶部居中
#[tauri::command]
fn set_island_state(window: WebviewWindow, expanded: bool) {
    let (width, height) = if expanded {
        (EXPANDED_WIDTH, EXPANDED_HEIGHT)
    } else {
        (COMPACT_WIDTH, COMPACT_HEIGHT)
    };
    let _ = window.set_size(LogicalSize::new(width, height));
    position_top_center(&window, width);
}

/// 退出应用（托盘菜单与面板设置菜单共用）
#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![set_island_state, quit_app])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 主窗口：顶部居中
            let window = app
                .get_webview_window("main")
                .expect("main window must exist");
            position_top_center(&window, COMPACT_WIDTH);

            // 系统托盘：提供退出入口（无边框窗口没有标题栏关闭按钮）
            let quit = MenuItem::with_id(app, "quit", "退出 WinIsland", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&quit])?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .expect("default window icon must exist")
                        .clone(),
                )
                .tooltip("WinIsland")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
