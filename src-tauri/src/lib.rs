use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{
    menu::{Menu, MenuItem},
    tray::TrayIconBuilder,
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, State,
    WebviewWindow, WindowEvent,
};

/// 收起态（胶囊）尺寸，单位：逻辑像素
const PILL_WIDTH: f64 = 250.0;
const PILL_HEIGHT: f64 = 40.0;
/// 侧边停靠时的收起态（竖向长条）尺寸
const DOCK_STRIP_WIDTH: f64 = 32.0;
const DOCK_STRIP_HEIGHT: f64 = 220.0;
/// 展开态（面板）尺寸，单位：逻辑像素
const EXPANDED_WIDTH: f64 = 440.0;
const EXPANDED_HEIGHT: f64 = 224.0;
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

fn transfer_file() -> PathBuf {
    let dir = app_root().join("data");
    let _ = fs::create_dir_all(&dir);
    dir.join("transfer.json")
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

#[tauri::command]
fn load_transfer() -> Result<Option<String>, String> {
    read_json(&transfer_file())
}

#[tauri::command]
fn save_transfer(json: String) -> Result<(), String> {
    write_json(&transfer_file(), &json)
}

#[tauri::command]
fn inspect_transfer_paths(paths: Vec<String>) -> Vec<serde_json::Value> {
    paths.into_iter().map(|path| {
        let metadata = fs::metadata(&path).ok();
        serde_json::json!({ "path": path, "exists": metadata.is_some(), "is_dir": metadata.as_ref().map(|m| m.is_dir()), "size": metadata.as_ref().filter(|m| m.is_file()).map(|m| m.len()) })
    }).collect()
}

struct AppState {
    clipboard_started: AtomicBool,
    clipboard_enabled: AtomicBool,
    restore_hotkey: AtomicBool,
    /// 常驻 sysinfo 实例：CPU 占用需要跨调用刷新才能得到增量
    system: std::sync::Mutex<sysinfo::System>,
    /// 网速计算：上次快照（Networks 实例、时间戳、累计字节数）
    net: std::sync::Mutex<(sysinfo::Networks, std::time::Instant, u64, u64)>,
}

#[derive(Serialize)]
struct SystemStatsOut {
    cpu_pct: f32,
    mem_used_gb: f32,
    mem_total_gb: f32,
    mem_pct: f32,
}

/// 系统监控数据：CPU 占用 + 内存用量（面板轮询调用）
#[tauri::command]
fn get_system_stats(state: State<'_, AppState>) -> Result<SystemStatsOut, String> {
    let mut sys = state.system.lock().map_err(|e| e.to_string())?;
    sys.refresh_cpu_usage();
    sys.refresh_memory();
    let mem_total = sys.total_memory() as f64;
    let mem_used = sys.used_memory() as f64;
    Ok(SystemStatsOut {
        cpu_pct: sys.global_cpu_usage().clamp(0.0, 100.0),
        mem_used_gb: ((mem_used / 1073741824.0 * 10.0).round() / 10.0) as f32,
        mem_total_gb: ((mem_total / 1073741824.0 * 10.0).round() / 10.0) as f32,
        mem_pct: if mem_total > 0.0 {
            (mem_used / mem_total * 100.0).clamp(0.0, 100.0) as f32
        } else {
            0.0
        },
    })
}

/// 实时网速：基于上次快照的字节增量（面板每秒轮询）
#[tauri::command]
fn get_network_speed(state: State<'_, AppState>) -> Result<serde_json::Value, String> {
    let mut guard = state.net.lock().map_err(|e| e.to_string())?;
    guard.0.refresh(true);
    let now = std::time::Instant::now();
    let elapsed = now.duration_since(guard.1).as_secs_f64().max(0.5);
    let mut down = 0u64;
    let mut up = 0u64;
    for (_, data) in guard.0.iter() {
        down += data.total_received();
        up += data.total_transmitted();
    }
    let down_delta = down.saturating_sub(guard.2);
    let up_delta = up.saturating_sub(guard.3);
    let speed = serde_json::json!({
        "down_kbps": (down_delta as f64 / elapsed / 1024.0).round() as u64,
        "up_kbps": (up_delta as f64 / elapsed / 1024.0).round() as u64,
    });
    guard.1 = now;
    guard.2 = down;
    guard.3 = up;
    Ok(speed)
}

#[derive(Serialize)]
struct DiskOut {
    mount: String,
    total_gb: f32,
    available_gb: f32,
    pct: f32,
}

/// 磁盘占用列表
#[tauri::command]
fn get_disks() -> Result<Vec<DiskOut>, String> {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    Ok(disks
        .list()
        .iter()
        .map(|d| {
            let total = d.total_space() as f64;
            let available = d.available_space() as f64;
            let mount = d.mount_point().to_string_lossy().to_string();
            DiskOut {
                mount,
                total_gb: ((total / 1073741824.0) * 10.0).round() as f32 / 10.0,
                available_gb: ((available / 1073741824.0) * 10.0).round() as f32 / 10.0,
                pct: if total > 0.0 {
                    (((total - available) / total) * 100.0) as f32
                } else {
                    0.0
                },
            }
        })
        .collect())
}

#[derive(Serialize)]
struct SystemInfoOut {
    uptime_secs: u64,
    boot_time: u64,
    hostname: Option<String>,
    os_name: Option<String>,
    cpu_name: Option<String>,
    cpu_threads: usize,
    memory_bytes: u64,
    battery_pct: Option<f32>,
    battery_charging: Option<bool>,
}

/// 系统信息：开机时长 + 电池（台式机无电池则为 null）
#[tauri::command]
fn get_system_info(state: State<'_, AppState>) -> Result<SystemInfoOut, String> {
    let mut system = state.system.lock().map_err(|e| e.to_string())?;
    system.refresh_cpu_all();
    system.refresh_memory();
    let boot = sysinfo::System::boot_time();
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();
    let uptime_secs = now.saturating_sub(boot);
    // 电池信息：复用 Win32 电源 API（sysinfo 0.38 已移除 battery 模块）
    let mut ps = windows::Win32::System::Power::SYSTEM_POWER_STATUS::default();
    let (battery_pct, battery_charging) = if unsafe {
        windows::Win32::System::Power::GetSystemPowerStatus(&mut ps)
    }
    .is_ok()
        && ps.BatteryLifePercent != 255
    {
        (
            Some(ps.BatteryLifePercent as f32),
            match ps.ACLineStatus { 0 => Some(false), 1 => Some(true), _ => None },
        )
    } else {
        (None, None)
    };
    Ok(SystemInfoOut {
        uptime_secs,
        boot_time: boot,
        hostname: sysinfo::System::host_name(),
        os_name: sysinfo::System::long_os_version(),
        cpu_name: system.cpus().first().map(|cpu| cpu.brand().trim().to_owned()).filter(|name| !name.is_empty()),
        cpu_threads: system.cpus().len(),
        memory_bytes: system.total_memory(),
        battery_pct,
        battery_charging,
    })
}

/// 面板卡片数据文件：data/panels/<key>.json
fn panel_data_file(key: &str) -> PathBuf {
    let dir = app_root().join("data").join("panels");
    let _ = fs::create_dir_all(&dir);
    dir.join(format!("{key}.json"))
}

/// 读取面板卡片数据（倒数日 / 快速启动等）
#[tauri::command]
fn load_panel_data(key: String) -> Result<Option<String>, String> {
    let safe: String = key.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').collect();
    if safe.is_empty() {
        return Err("无效的数据键".into());
    }
    read_json(&panel_data_file(&safe))
}

/// 保存面板卡片数据
#[tauri::command]
fn save_panel_data(key: String, json: String) -> Result<(), String> {
    let safe: String = key.chars().filter(|c| c.is_ascii_alphanumeric() || *c == '-').collect();
    if safe.is_empty() {
        return Err("无效的数据键".into());
    }
    write_json(&panel_data_file(&safe), &json)
}

/// 打开文件/文件夹/网址（快速启动卡片）
#[tauri::command]
fn launch_path(path: String) -> Result<(), String> {
    std::process::Command::new("cmd")
        .args(["/C", "start", "", &path])
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

/// 屏幕工作区信息（逻辑像素）
fn screen_metrics(window: &WebviewWindow) -> Option<(f64, f64, f64)> {
    let monitor = window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten())?;
    let scale = monitor.scale_factor();
    let size = monitor.size();
    Some((size.width as f64 / scale, size.height as f64 / scale, scale))
}

fn screen_origin(window: &WebviewWindow) -> (i32, i32) {
    window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten())
        .map(|m| (m.position().x, m.position().y)).unwrap_or((0, 0))
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
/// panel 为展开态尺寸（可选，来自前端面板尺寸偏好）；None 时使用默认值
/// gap 为距屏幕边缘的间距（贴边展示为 0，悬浮为 EDGE_MARGIN）
fn apply_layout(
    window: &WebviewWindow,
    edge: &str,
    expanded: bool,
    offset: f64,
    panel: Option<(f64, f64)>,
    gap: f64,
) -> Result<(), String> {
    let Some((sw, sh, scale)) = screen_metrics(window) else {
        return Ok(());
    };
    let screen = (sw, sh);
    let compact = if edge == "top" || edge == "bottom" {
        (PILL_WIDTH, PILL_HEIGHT)
    } else {
        (DOCK_STRIP_WIDTH, DOCK_STRIP_HEIGHT)
    };
    let size = if expanded {
        panel.unwrap_or((EXPANDED_WIDTH, EXPANDED_HEIGHT))
    } else {
        compact
    };
    let center = clamp_offset(edge, offset, screen, compact);
    let m = gap;

    let (x, y) = match edge {
        "top" => (center - size.0 / 2.0, m),
        "bottom" => (center - size.0 / 2.0, sh - m - size.1),
        "left" => (m, center - size.1 / 2.0),
        _ => (sw - m - size.0, center - size.1 / 2.0),
    };

    let x = x.clamp(0.0, (sw - size.0).max(0.0));
    let y = y.clamp(0.0, (sh - size.1).max(0.0));

    let _ = window.set_size(LogicalSize::new(size.0, size.1));
    let (origin_x, origin_y) = screen_origin(window);
    let _ = window.set_position(PhysicalPosition::new(origin_x + (x * scale).round() as i32, origin_y + (y * scale).round() as i32));
    Ok(())
}

/// 设置灵动岛布局（展开/收起 + 停靠边 + 沿边偏移 + 可选面板尺寸 + 边缘间距）
#[tauri::command]
fn set_island_layout(
    window: WebviewWindow,
    edge: String,
    expanded: bool,
    offset: f64,
    panel_width: Option<f64>,
    panel_height: Option<f64>,
    edge_gap: Option<f64>,
) -> Result<(), String> {
    apply_layout(
        &window,
        &edge,
        expanded,
        offset,
        panel_width.zip(panel_height),
        edge_gap.unwrap_or(EDGE_MARGIN),
    )
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
    let (origin_x, origin_y) = screen_origin(&window);
    let (px, py) = ((x - origin_x) as f64 / scale, (y - origin_y) as f64 / scale);
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
        (DOCK_STRIP_WIDTH, DOCK_STRIP_HEIGHT)
    };

    // 沿边偏移：取窗口中心在边方向上的投影
    let offset = if edge == "top" || edge == "bottom" {
        px + pw / 2.0
    } else {
        py + ph / 2.0
    };
    let offset = clamp_offset(&edge, offset, (sw, sh), compact);

    // 从偏好文件读取贴边展示设置（前端松手后还会按实时值再应用一次）
    let attached = read_json(&setting_file())
        .ok()
        .flatten()
        .and_then(|raw| serde_json::from_str::<serde_json::Value>(&raw).ok())
        .map(|v| v["edgeAttached"].as_bool().unwrap_or(true))
        .unwrap_or(true);
    let gap = if attached { 0.0 } else { EDGE_MARGIN };
    apply_layout(&window, &edge, false, offset, None, gap)?;
    log::info!(
        "[drag] finish_drag: edge={edge} offset={offset} pos=({px:.0},{py:.0}) size=({pw:.0},{ph:.0}) dists=(t:{d_top:.0},b:{d_bottom:.0},l:{d_left:.0},r:{d_right:.0})"
    );
    let monitor = window.current_monitor().ok().flatten().and_then(|m| m.name().cloned());
    Ok(serde_json::json!({ "edge": edge, "offset": offset, "monitor": monitor }))
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

/// 屏幕工作区逻辑尺寸（设置页停靠位置滑条需要）
#[tauri::command]
fn get_screen_size(app: AppHandle) -> Result<serde_json::Value, String> {
    let window = app.get_webview_window("main").ok_or("找不到灵动岛窗口")?;
    match screen_metrics(&window) {
        Some((w, h, _)) => Ok(serde_json::json!({ "width": w, "height": h })),
        None => Err("无法获取屏幕信息".into()),
    }
}

#[tauri::command]
fn list_island_monitors(app: AppHandle) -> Result<Vec<String>, String> {
    let window = app.get_webview_window("main").ok_or("找不到灵动岛窗口")?;
    Ok(window.available_monitors().map_err(|e| e.to_string())?.iter().filter_map(|m| m.name().cloned()).collect())
}

#[tauri::command]
fn select_island_monitor(app: AppHandle, name: String) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("找不到灵动岛窗口")?;
    let monitors = window.available_monitors().map_err(|e| e.to_string())?;
    let monitor = monitors.iter().find(|m| m.name().map(|n| n.as_str()) == Some(name.as_str()))
        .or_else(|| monitors.first()).ok_or("没有可用的显示器")?;
    let position = monitor.position();
    window.set_position(PhysicalPosition::new(position.x + 10, position.y + 10)).map_err(|e| e.to_string())
}

/// 设置页实时调整岛窗口布局（直接作用于 main 窗口，绕过偏好广播延迟）
#[tauri::command]
fn apply_island_layout(
    app: AppHandle,
    edge: String,
    expanded: bool,
    offset: f64,
    panel_width: Option<f64>,
    panel_height: Option<f64>,
    edge_gap: Option<f64>,
) -> Result<(), String> {
    let Some(window) = app.get_webview_window("main") else {
        return Ok(());
    };
    apply_layout(
        &window,
        &edge,
        expanded,
        offset,
        panel_width.zip(panel_height),
        edge_gap.unwrap_or(EDGE_MARGIN),
    )
}

/// 退出应用（托盘菜单与面板设置菜单共用）
#[tauri::command]
fn quit_app(app: AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn set_island_visible(app: AppHandle, visible: bool) -> Result<(), String> {
    let window = app.get_webview_window("main").ok_or("找不到灵动岛窗口")?;
    if visible { window.show() } else { window.hide() }.map_err(|e| e.to_string())
}

#[tauri::command]
fn restore_hotkey_available(state: State<'_, AppState>) -> bool {
    state.restore_hotkey.load(Ordering::SeqCst)
}

fn start_restore_hotkey(app: AppHandle) {
    std::thread::spawn(move || {
        use windows::Win32::UI::Input::KeyboardAndMouse::{RegisterHotKey, MOD_ALT, MOD_CONTROL, MOD_NOREPEAT};
        use windows::Win32::UI::WindowsAndMessaging::{GetMessageW, MSG, WM_HOTKEY};
        const ID: i32 = 1;
        if unsafe { RegisterHotKey(None, ID, MOD_CONTROL | MOD_ALT | MOD_NOREPEAT, 'I' as u32) }.is_err() {
            log::warn!("无法注册 Ctrl+Alt+I，快捷键可能已被占用");
            return;
        }
        app.state::<AppState>().restore_hotkey.store(true, Ordering::SeqCst);
        let mut message = MSG::default();
        while unsafe { GetMessageW(&mut message, None, 0, 0).0 } > 0 {
            if message.message == WM_HOTKEY && message.wParam.0 == ID as usize {
                let _ = app.emit("island://manual-show", ());
                let _ = set_island_visible(app.clone(), true);
            }
        }
    });
}

#[tauri::command]
fn is_foreground_fullscreen(app: AppHandle) -> bool {
    use windows::Win32::Foundation::RECT;
    use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetShellWindow, GetWindowRect, IsWindowVisible};
    let Some(window) = app.get_webview_window("main") else { return false };
    let Some(monitor) = window.current_monitor().ok().flatten().or_else(|| window.primary_monitor().ok().flatten()) else { return false };
    let foreground = unsafe { GetForegroundWindow() };
    if foreground.0.is_null() || foreground == unsafe { GetShellWindow() } || !unsafe { IsWindowVisible(foreground).as_bool() } { return false; }
    let mut rect = RECT::default();
    if unsafe { GetWindowRect(foreground, &mut rect) }.is_err() { return false; }
    let p = monitor.position();
    let size = monitor.size();
    rect.left <= p.x && rect.top <= p.y && rect.right >= p.x + size.width as i32 && rect.bottom >= p.y + size.height as i32
}

/// 发起系统级文件拖拽：从面板把暂存文件拖出到资源管理器等目标应用
/// 阻塞到拖拽结束（模态循环），因此放在异步命令的工作线程 + 主线程调度中执行
#[tauri::command]
async fn start_files_drag(
    app: AppHandle,
    window: tauri::Window,
    paths: Vec<String>,
) -> Result<(), String> {
    use std::sync::mpsc;

    if paths.is_empty() {
        return Err("没有可拖拽的文件".into());
    }

    let (tx, rx) = mpsc::channel::<Result<(), String>>();
    app.run_on_main_thread(move || {
        // DragItem 含非 Send 的数据提供者 trait，只能在主线程闭包内构造
        let item = drag::DragItem::Files(paths.iter().map(PathBuf::from).collect());
        // 拖拽光标预览图：应用图标（WIC 可解码的 PNG）
        let image = drag::Image::Raw(include_bytes!("../icons/32x32.png").to_vec());
        let result = drag::start_drag(&window, item, image, |_, _| {}, drag::Options::default())
            .map(|_| ())
            .map_err(|e| e.to_string());
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;

    rx.recv().map_err(|e| e.to_string())?
}

// ---------- SMTC（Windows 系统媒体控制） ----------

#[derive(Serialize)]
struct MediaStateOut {
    title: String,
    artist: String,
    position_secs: f64,
    duration_secs: f64,
    playing: bool,
    player: String,
    can_play: bool,
    can_pause: bool,
    can_next: bool,
    can_prev: bool,
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
    let Ok(session) = manager.GetCurrentSession() else {
        return Ok(None);
    };

    let playback = session.GetPlaybackInfo().map_err(|e| e.to_string())?;
    let controls = playback.Controls().map_err(|e| e.to_string())?;
    let player = session.SourceAppUserModelId().map(|id| id.to_string()).unwrap_or_default();
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

    Ok(Some(MediaStateOut { title, artist, position_secs, duration_secs, playing, player,
        can_play: controls.IsPlayEnabled().unwrap_or(false), can_pause: controls.IsPauseEnabled().unwrap_or(false),
        can_next: controls.IsNextEnabled().unwrap_or(false), can_prev: controls.IsPreviousEnabled().unwrap_or(false) }))
}

/// 读取当前媒体会话的专辑封面，返回 data URL；无封面时返回 None
#[tauri::command]
async fn get_media_thumbnail() -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(|| {
        use base64::Engine as _;
        use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;
        use windows::Storage::Streams::DataReader;

        let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
            .map_err(|e| e.to_string())?
            .join()
            .map_err(|e| e.to_string())?;
        let Ok(session) = manager.GetCurrentSession() else {
            return Ok(None);
        };
        let props = session
            .TryGetMediaPropertiesAsync()
            .map_err(|e| e.to_string())?
            .join()
            .map_err(|e| e.to_string())?;
        let Ok(thumbnail) = props.Thumbnail() else {
            return Ok(None);
        };

        // 打开缩略图只读流并读出全部字节
        let stream = thumbnail
            .OpenReadAsync()
            .map_err(|e| e.to_string())?
            .join()
            .map_err(|e| e.to_string())?;
        let content_type = stream
            .ContentType()
            .map(|c| c.to_string())
            .unwrap_or_else(|_| "image/png".to_string());
        let size = stream.Size().map_err(|e| e.to_string())?;
        if size == 0 {
            return Ok(None);
        }

        let input = stream.GetInputStreamAt(0).map_err(|e| e.to_string())?;
        let reader = DataReader::CreateDataReader(&input).map_err(|e| e.to_string())?;
        let loaded: u32 = reader
            .LoadAsync(size as u32)
            .map_err(|e| e.to_string())?
            .join()
            .map_err(|e| e.to_string())?;

        let mut buf = vec![0u8; loaded as usize];
        reader.ReadBytes(&mut buf).map_err(|e| e.to_string())?;

        Ok(Some(format!(
            "data:{content_type};base64,{}",
            base64::engine::general_purpose::STANDARD.encode(buf)
        )))
    })
    .await
    .map_err(|e| e.to_string())?
}

/// 媒体控制：play / pause / next / prev
#[tauri::command]
async fn media_control(action: String) -> Result<(), String> {
    use windows::Media::Control::GlobalSystemMediaTransportControlsSessionManager;

    let manager = GlobalSystemMediaTransportControlsSessionManager::RequestAsync()
        .map_err(|e| e.to_string())?
        .await
        .map_err(|e| e.to_string())?;
    let Ok(session) = manager.GetCurrentSession() else {
        return Err("无活动媒体会话".to_string());
    };
    let accepted = match action.as_str() {
        "play" => session.TryPlayAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "pause" => session.TryPauseAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "next" => session.TrySkipNextAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        "prev" => session.TrySkipPreviousAsync().map_err(|e| e.to_string())?.await.map_err(|e| e.to_string())?,
        _ => return Err(format!("未知操作：{action}")),
    };
    if accepted { Ok(()) } else { Err("播放器未接受此操作".into()) }
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
            handle.state::<AppState>().clipboard_started.store(false, Ordering::SeqCst);
            let _ = handle.emit("clipboard://error", "剪贴板监听初始化失败");
            return;
        };
        let mut last = String::new();
        loop {
            if !handle.state::<AppState>().clipboard_enabled.load(Ordering::SeqCst) {
                last.clear();
                std::thread::sleep(std::time::Duration::from_millis(800));
                continue;
            }
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

#[tauri::command]
fn set_clipboard_monitor_enabled(enabled: bool, state: State<'_, AppState>) {
    state.clipboard_enabled.store(enabled, Ordering::SeqCst);
}

/// 将文本写入系统剪贴板
#[tauri::command]
fn write_clipboard(text: String) -> Result<(), String> {
    arboard::Clipboard::new()
        .and_then(|mut c| c.set_text(text))
        .map_err(|e| e.to_string())
}

// ---------- 系统事件监听（通知中心数据源） ----------

/// 输入法中/英文切换监听：轮询前台窗口默认 IME 窗口的转换模式（NATIVE 位 = 中文）
fn ime_monitor(app: AppHandle) {
    use windows::Win32::Foundation::{LPARAM, WPARAM};
    use windows::Win32::UI::Input::Ime::ImmGetDefaultIMEWnd;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetForegroundWindow, SendMessageW, WM_IME_CONTROL,
    };
    const IMC_GETCONVERSIONMODE: usize = 0x0001;

    let mut last = -1i32;
    loop {
        std::thread::sleep(std::time::Duration::from_millis(400));
        unsafe {
            let fg = GetForegroundWindow();
            if fg.is_invalid() {
                continue;
            }
            let ime_wnd = ImmGetDefaultIMEWnd(fg);
            if ime_wnd.is_invalid() {
                continue;
            }
            let mode =
                SendMessageW(
                    ime_wnd,
                    WM_IME_CONTROL,
                    Some(WPARAM(IMC_GETCONVERSIONMODE)),
                    Some(LPARAM(0)),
                )
                .0;
            let chinese = (mode & 1) == 1; // IME_CMODE_NATIVE
            let cur = chinese as i32;
            if last != -1 && cur != last {
                let _ = app.emit("system://ime", chinese);
            }
            last = cur;
        }
    }
}

/// 网络连接状态监听：轮询 WinRT 网络列表管理器的互联网连接级别
fn network_monitor(app: AppHandle) {
    use windows::Networking::Connectivity::{NetworkConnectivityLevel, NetworkInformation};

    let mut last = -1i32;
    loop {
        std::thread::sleep(std::time::Duration::from_secs(3));
        let connected = NetworkInformation::GetInternetConnectionProfile()
            .map(|p| p.GetNetworkConnectivityLevel() == Ok(NetworkConnectivityLevel::InternetAccess))
            .unwrap_or(false);
        let cur = connected as i32;
        if last != -1 && cur != last {
            let _ = app.emit("system://network", connected);
        }
        last = cur;
    }
}

/// 电池状态监听：电源接通/切换电池、低电量（≤20% 且放电）、充电完成
fn battery_monitor(app: AppHandle) {
    use windows::Win32::System::Power::{GetSystemPowerStatus, SYSTEM_POWER_STATUS};

    let mut last_ac = -1i32;
    let mut last_low = false;
    let mut last_full = false;
    loop {
        std::thread::sleep(std::time::Duration::from_secs(10));
        let mut ps = SYSTEM_POWER_STATUS::default();
        if unsafe { GetSystemPowerStatus(&mut ps) }.is_err() {
            continue;
        }
        let ac = if ps.ACLineStatus == 1 { 1i32 } else { 0i32 };
        let pct = ps.BatteryLifePercent; // 0-100，255 未知
        let known = pct != 255;
        let pct_val: i32 = if known { pct as i32 } else { -1 };

        if last_ac != -1 && ac != last_ac {
            let _ = app.emit(
                "system://battery",
                serde_json::json!({ "kind": if ac == 1 { "ac" } else { "battery" }, "pct": pct_val }),
            );
        }
        let low = known && ac == 0 && pct <= 20;
        if low && !last_low {
            let _ = app.emit(
                "system://battery",
                serde_json::json!({ "kind": "low", "pct": pct_val }),
            );
        }
        let full = known && ac == 1 && pct == 100;
        if full && !last_full {
            let _ = app.emit(
                "system://battery",
                serde_json::json!({ "kind": "full", "pct": 100 }),
            );
        }
        last_ac = ac;
        last_low = low;
        last_full = full;
    }
}

/// 系统音量监听：轮询默认输出设备主音量与静音状态（变化时推送）
fn volume_monitor(app: AppHandle) {
    use windows::Win32::Media::Audio::{
        Endpoints::IAudioEndpointVolume, IMMDeviceEnumerator, MMDeviceEnumerator,
        eMultimedia, eRender,
    };
    use windows::Win32::System::Com::{
        CoCreateInstance, CoInitializeEx, CLSCTX_ALL, COINIT_MULTITHREADED,
    };

    unsafe {
        let _ = CoInitializeEx(None, COINIT_MULTITHREADED);
    }
    let enumerator_result: Result<IMMDeviceEnumerator, windows::core::Error> =
        unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL) };
    let Ok(enumerator) = enumerator_result else {
        return;
    };
    let Ok(device) = (unsafe {
        enumerator.GetDefaultAudioEndpoint(eRender, eMultimedia)
    }) else {
        return;
    };
    let Ok(volume) = (unsafe { device.Activate::<IAudioEndpointVolume>(CLSCTX_ALL, None) }) else {
        return;
    };

    let mut last = -1i32;
    let mut last_mute = -1i32;
    loop {
        std::thread::sleep(std::time::Duration::from_millis(300));
        let Ok(v) = (unsafe { volume.GetMasterVolumeLevelScalar() }) else {
            continue;
        };
        let Ok(m) = (unsafe { volume.GetMute() }) else {
            continue;
        };
        let pct = (v * 100.0).round() as i32;
        let mute = m.as_bool() as i32;
        if last != -1 && (pct != last || mute != last_mute) {
            let _ = app.emit(
                "system://volume",
                serde_json::json!({ "pct": pct, "mute": mute == 1 }),
            );
        }
        last = pct;
        last_mute = mute;
    }
}

/// 启动全部系统事件监听线程
fn start_system_monitors(app: AppHandle) {
    let ime_app = app.clone();
    std::thread::spawn(move || ime_monitor(ime_app));
    let net_app = app.clone();
    std::thread::spawn(move || network_monitor(net_app));
    let bat_app = app.clone();
    std::thread::spawn(move || battery_monitor(bat_app));
    let vol_app = app.clone();
    std::thread::spawn(move || volume_monitor(vol_app));
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState {
            clipboard_started: AtomicBool::new(false),
            clipboard_enabled: AtomicBool::new(false),
            system: std::sync::Mutex::new(sysinfo::System::new()),
            restore_hotkey: AtomicBool::new(false),
            net: std::sync::Mutex::new((
                sysinfo::Networks::new(),
                std::time::Instant::now(),
                0,
                0,
            )),
        })
        .invoke_handler(tauri::generate_handler![
            set_island_layout,
            finish_drag,
            open_settings,
            get_data_dir,
            get_screen_size,
            list_island_monitors,
            select_island_monitor,
            apply_island_layout,
            get_media_thumbnail,
            quit_app,
            set_island_visible,
            restore_hotkey_available,
            is_foreground_fullscreen,
            get_media_state,
            media_control,
            start_clipboard_monitor,
            set_clipboard_monitor_enabled,
            write_clipboard,
            load_preferences,
            save_preferences,
            load_counters,
            save_counters,
            load_transfer,
            save_transfer,
            inspect_transfer_paths,
            start_files_drag,
            get_system_stats,
            get_network_speed,
            get_disks,
            get_system_info,
            load_panel_data,
            save_panel_data,
            launch_path,
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
            let mut edge_attached = true;
            if let Ok(Some(raw)) = read_json(&setting_file()) {
                if let Ok(v) = serde_json::from_str::<serde_json::Value>(&raw) {
                    edge = v["islandEdge"].as_str().unwrap_or("top").to_string();
                    offset = v["islandOffset"].as_f64().unwrap_or(f64::MAX);
                    edge_attached = v["edgeAttached"].as_bool().unwrap_or(true);
                }
            }
            let initial_gap = if edge_attached { 0.0 } else { EDGE_MARGIN };
            let initial_offset = if offset == f64::MAX {
                let (sw, _, _) = screen_metrics(&window).unwrap_or((1280.0, 800.0, 1.0));
                sw / 2.0
            } else {
                offset
            };
            apply_layout(&window, &edge, false, initial_offset, None, initial_gap)?;

            // 启动系统事件监听（输入法/网络/电池，通知中心数据源）
            start_system_monitors(app.handle().clone());
            start_restore_hotkey(app.handle().clone());

            // 系统托盘：提供退出入口（无边框窗口没有标题栏关闭按钮）
            let quit = MenuItem::with_id(app, "quit", "退出 Islet 灵岛", true, None::<&str>)?;
            let show = MenuItem::with_id(app, "show", "显示灵动岛", true, None::<&str>)?;
            let settings = MenuItem::with_id(app, "settings", "打开设置", true, None::<&str>)?;
            let menu = Menu::with_items(app, &[&show, &settings, &quit])?;
            TrayIconBuilder::new()
                .icon(
                    app.default_window_icon()
                        .expect("default window icon must exist")
                        .clone(),
                )
                .tooltip("Islet 灵岛")
                .menu(&menu)
                .show_menu_on_left_click(true)
                .on_menu_event(|app, event| {
                    if event.id() == "quit" {
                        app.exit(0);
                    } else if event.id() == "show" {
                        let _ = app.emit("island://manual-show", ());
                        let _ = set_island_visible(app.clone(), true);
                    } else if event.id() == "settings" {
                        let _ = open_settings(app.clone());
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
