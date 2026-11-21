use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, LogicalPosition, LogicalSize, Manager, PhysicalPosition, State,
    WebviewWindow, WindowEvent,
};

/// 收起态（胶囊）尺寸，单位：逻辑像素
const PILL_WIDTH: f64 = 360.0;
const PILL_HEIGHT: f64 = 44.0;
/// 侧边停靠时的收起态（小方块）尺寸
const DOCK_PILL_SIZE: f64 = 48.0;
/// 展开态（面板）尺寸，单位：逻辑像素
const EXPANDED_WIDTH: f64 = 540.0;
const EXPANDED_HEIGHT: f64 = 360.0;
/// 距屏幕边缘的贴边间距
const EDGE_MARGIN: f64 = 8.0;
/// 吸附判定阈值：距某边小于该值视为停靠该边
const EDGE_SNAP_THRESHOLD: f64 = 160.0;

/// 数据根目录：安装（exe）根目录下的 setting/ 与 data/
fn app_root() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn setting_file() -> PathBuf {
    let dir = app_root().join("setting");
    let _ = fs::create_dir_all(&dir);
    dir.join("preferences.json")
}

fn data_file() -> PathBuf {
    let dir = app_root().join("data");
    let _ = fs::create_dir_all(&dir);
    dir.join("counters.json")
}

/// 读取 JSON 文件，不存在返回 None；损坏时保留原文件并报错，不用默认值覆盖
fn read_json(path: &PathBuf) -> Result<Option<String>, String> {
    if !path.exists() {
        return Ok(None);
    }
    let raw = fs::read_to_string(path).map_err(|e| e.to_string())?;
    // 校验 JSON 合法性
    serde_json::from_str::<serde_json::Value>(&raw)
        .map_err(|e| format!("配置文件损坏（已保留原文件）：{e}"))?;
    Ok(Some(raw))
}

fn write_json(path: &PathBuf, json: &str) -> Result<(), String> {
    // 校验后再写入，避免把非法内容落盘
    let value: serde_json::Value =
        serde_json::from_str(json).map_err(|e| format!("JSON 无效：{e}"))?;
    fs::write(path, serde_json::to_string_pretty(&value).unwrap_or_else(|_| json.to_string()))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn load_preferences() -> Result<Option<String>, String> {
    read_json(&setting_file())
}

#[tauri::command]
fn save_preferences(json: String) -> Result<(), String> {
    write_json(&setting_file(), &json)
}

#[tauri::command]
fn load_counters() -> Result<Option<String>, String> {
    read_json(&data_file())
}

#[tauri::command]
fn save_counters(json: String) -> Result<(), String> {
    write_json(&data_file(), &json)
}

struct AppState {
    clipboard_started: AtomicBool,
}

/// 屏幕工作区信息（逻辑像素）
fn screen_metrics(window: &WebviewWindow) -> Option<(f64, f64, f64)> {
    let monitor = window.primary_monitor().ok()??;
    let scale = monitor.scale_factor();
    let size = monitor.size();
    Some((size.width as f64 / scale, size.height as f64 / scale, scale))
}

/// 归一化边名与偏移量：offset 为胶囊中心沿该边的坐标（逻辑像素）
fn clamp_offset(edge: &str, offset: f64, screen: (f64, f64), pill: (f64, f64)) -> f64 {
    let (sw, sh) = screen;
    match edge {
        "top" | "bottom" => offset.clamp(pill.0 / 2.0, sw - pill.0 / 2.0),
        _ => offset.clamp(pill.1 / 2.0, sh - pill.1 / 2.0),
    }
}

/// 应用灵动岛布局：按停靠边与展开状态计算窗口尺寸与位置并应用
fn apply_layout(
    window: &WebviewWindow,
    edge: &str,
    expanded: bool,
    offset: f64,
) -> Result<(), String> {
    let Some((sw, sh, _scale)) = screen_metrics(window) else {
        return Ok(());
    };
    let screen = (sw, sh);
    let compact = if edge == "top" || edge == "bottom" {
        (PILL_WIDTH, PILL_HEIGHT)
    } else {
        (DOCK_PILL_SIZE, DOCK_PILL_SIZE)
    };
    let size = if expanded {
        (EXPANDED_WIDTH, EXPANDED_HEIGHT)
    } else {
        compact
    };
    let center = clamp_offset(edge, offset, screen, compact);
    let m = EDGE_MARGIN;

    let (x, y) = match edge {
        "top" => (center - size.0 / 2.0, m),
        "bottom" => (center - size.0 / 2.0, sh - m - size.1),
        "left" => (m, center - size.1 / 2.0),
        _ => (sw - m - size.0, center - size.1 / 2.0),
    };

    let x = x.clamp(0.0, (sw - size.0).max(0.0));
    let y = y.clamp(0.0, (sh - size.1).max(0.0));

    let _ = window.set_size(LogicalSize::new(size.0, size.1));
    let _ = window.set_position(LogicalPosition::new(x, y));
    Ok(())
}

/// 设置灵动岛布局（展开/收起 + 停靠边 + 沿边偏移）
#[tauri::command]
fn set_island_layout(
    window: WebviewWindow,
    edge: String,
    expanded: bool,
    offset: f64,
) -> Result<(), String> {
    apply_layout(&window, &edge, expanded, offset)
}

/// 开始拖动窗口；该调用阻塞到拖动结束
#[tauri::command]
fn start_drag(window: WebviewWindow) -> Result<(), String> {
    window.start_dragging().map_err(|e| e.to_string())
}

/// 拖动结束后的吸附计算：返回 {edge, offset}，并立即应用收起态布局
#[tauri::command]
fn finish_drag(window: WebviewWindow, current_edge: String) -> Result<serde_json::Value, String> {
    let Some((sw, sh, scale)) = screen_metrics(&window) else {
        return Err("无法获取屏幕信息".into());
    };
    let Ok(PhysicalPosition { x, y }) = window.outer_position() else {
        return Err("无法获取窗口位置".into());
    };
    let (px, py) = (x as f64 / scale, y as f64 / scale);
    let Ok(size) = window.outer_size() else {
        return Err("无法获取窗口尺寸".into());
    };
    let (pw, ph) = (size.width as f64 / scale, size.height as f64 / scale);

    // 到四边的距离
    let d_top = py;
    let d_bottom = sh - (py + ph);
    let d_left = px;
    let d_right = sw - (px + pw);
    let candidates = [
        ("top", d_top),
        ("bottom", d_bottom),
        ("left", d_left),
        ("right", d_right),
    ];
    let nearest = candidates
        .iter()
        .min_by(|a, b| a.1.partial_cmp(&b.1).unwrap())
        .expect("至少存在一条边");

    // 距所有边都太远时保持原边；否则吸附最近边
    let edge = if nearest.1 <= EDGE_SNAP_THRESHOLD {
        nearest.0.to_string()
    } else {
        current_edge
    };
    let compact = if edge == "top" || edge == "bottom" {
        (PILL_WIDTH, PILL_HEIGHT)
    } else {
        (DOCK_PILL_SIZE, DOCK_PILL_SIZE)
    };

    // 沿边偏移：取窗口中心在边方向上的投影
    let offset = if edge == "top" || edge == "bottom" {
        px + pw / 2.0
    } else {
        py + ph / 2.0
    };
    let offset = clamp_offset(&edge, offset, (sw, sh), compact);

    apply_layout(&window, &edge, false, offset)?;
    Ok(serde_json::json!({ "edge": edge, "offset": offset }))
}

/// 打开设置窗口（隐藏 → 显示并聚焦）
#[tauri::command]
fn open_settings(app: AppHandle) -> Result<(), String> {
    if let Some(w) = app.get_webview_window("settings") {
        let _ = w.show();
        let _ = w.set_focus();
    }
    Ok(())
}

/// 返回应用数据根目录（exe 所在目录），供设置页展示
#[tauri::command]
fn get_data_dir() -> Result<String, String> {
    Ok(app_root().to_string_lossy().to_string())
}

/// 退出应用（托盘菜单与面板设置菜单共用）
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

// ---------- SMTC（Windows 系统媒体控制） ----------

#[derive(Serialize)]
struct MediaStateOut {
    title: String,
    artist: String,
    position_secs: f64,
    duration_secs: f64,
    playing: bool,
}

/// 读取当前系统媒体会话状态；无播放会话时返回 None
#[tauri::command]
async fn get_media_state() -> Result<Option<MediaStateOut>, String> {
    use windows::Media::Control::{
        GlobalSystemMediaTransportControlsSessionPlaybackStatus,
        GlobalSystemMediaTransportControlsSessionManager,
    };

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    let sessions = manager.GetSessions().map_err(|e| e.to_string())?;
    let Some(session) = sessions.into_iter().next() else {
        return Ok(None);
    };

    let playback = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
    let playing = playback.PlaybackStatus().map_err(|e| e.to_string())?
        == GlobalSystemMediaTransportControlsSessionPlaybackStatus::Playing;
    let timeline = session.GetTimelineProperties().map_err(|e| e.to_string())?;
    let position_secs = timeline.Position().map_err(|e| e.to_string())?.Duration as f64 / 1e7;
    let duration_secs = timeline.EndTime().map_err(|e| e.to_string())?.Duration as f64 / 1e7;

    let props = session
        .TryGetMediaPropertiesAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    let title = props.Title().map_err(|e| e.to_string())?.to_string();
    let artist = props.Artist().map_err(|e| e.to_string())?.to_string();

    Ok(Some(MediaStateOut { title, artist, position_secs, duration_secs, playing }))
}

/// 媒体控制：play / pause / next / prev
#[tauri::command]
async fn media_control(action: String) -> Result<(), String> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    let sessions = manager.GetSessions().map_err(|e| e.to_string())?;
    let Some(session) = sessions.into_iter().next() else {
        return Err("无活动媒体会话".to_string());
    };
    match action.as_str() {
        "play" => session.TryPlayAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "pause" => session.TryPauseAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "next" => session.TrySkipNextAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "prev" => session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        _ => return Err(format!("未知操作：{action}")),
    };
    Ok(())
}

// ---------- 剪贴板 ----------

/// 启动剪贴板监听线程（800ms 轮询去重），新内容通过 clipboard://new 事件推送
#[tauri::command]
fn start_clipboard_monitor(app: AppHandle, state: State<'_, AppState>) -> Result<(), String> {
    if state.clipboard_started.swap(true, Ordering::SeqCst) {
        return Ok(());
    }
    let handle = app.clone();
    std::thread::spawn(move || {
        let Ok(mut clip) = arboard::Clipboard::new() else {
            log::error!("剪贴板初始化失败");
            return;
        };
        let mut last = String::new();
        loop {
            if let Ok(text) = clip.get_text() {
                if !text.trim().is_empty() && text != last {
                    last = text.clone();
                    let _ = handle.emit("clipboard://new", text);
                }
            }
            std::thread::sleep(std::time::Duration::from_millis(800));
        }
    });
    Ok(())
}

/// 将文本写入系统剪贴板
#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    arboard::Clipboard::new()
        .and_then(|mut c| c.set_text(text))
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState { clipboard_started: AtomicBool::new(false) })
        .invoke_handler(tauri::generate_handler![
            set_island_layout,
            start_drag,
            finish_drag,
            open_settings,
            get_data_dir,
            quit_app,
            get_media_state,
            media_control,
            start_clipboard_monitor,
            write_clipboard,
            load_preferences,
            save_preferences,
            load_counters,
            save_counters,
        ])
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 主窗口：按偏好停靠（默认顶部居中）
            let window = app
                .get_webview_window("main")
                .expect("main window must exist");
            let mut edge = "top".to_string();
            let mut offset = f64::MAX;
            if let Ok(Some(raw)) = read_json(&setting_file()) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                    edge = v["islandEdge"].as_str().unwrap_or("top").to_string();
                    offset = v["islandOffset"].as_f64().unwrap_or(f64::MAX);
                }
            }
            let initial_offset = if offset == f64::MAX {
                let (sw, _, _) = screen_metrics(&window).unwrap_or((1280.0, 800.0, 1.0));
                sw / 2.0
            } else {
                offset
            };
            apply_layout(&window, &edge, false, initial_offset)?;

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
        .on_window_event(|window, event| {
            // 设置窗口点关闭时隐藏到托盘，不销毁
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "settings" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
