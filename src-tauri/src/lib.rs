use std::process::Command;
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    pub path_or_command: String,
    pub category: String,
    pub icon: String,
}

#[tauri::command]
fn hide_window(window: WebviewWindow) {
    let _ = window.hide();
}

#[tauri::command]
fn show_window(window: WebviewWindow) {
    let _ = window.show();
    let _ = window.set_focus();
}

#[tauri::command]
fn toggle_window(window: WebviewWindow) {
    if let Ok(is_visible) = window.is_visible() {
        if is_visible {
            let _ = window.hide();
        } else {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let safe_url = if url.starts_with("http://") || url.starts_with("https://") || url.starts_with("mailto:") || url.starts_with("file://") {
        url
    } else {
        format!("https://{}", url)
    };

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &safe_url])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&safe_url)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&safe_url)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

#[tauri::command]
fn launch_system_app(app_cmd: String) -> Result<(), String> {
    let trimmed = app_cmd.trim();
    if trimmed.is_empty() {
        return Err("Application command is empty".to_string());
    }

    #[cfg(target_os = "windows")]
    {
        // On Windows, start via cmd /C start or direct command
        Command::new("cmd")
            .args(["/C", "start", "", trimmed])
            .spawn()
            .map_err(|e| format!("Failed to launch '{}': {}", trimmed, e))?;
        return Ok(());
    }

    #[cfg(target_os = "macos")]
    {
        if trimmed.ends_with(".app") || trimmed.starts_with("/") {
            Command::new("open")
                .arg(trimmed)
                .spawn()
                .map_err(|e| format!("Failed to open '{}': {}", trimmed, e))?;
        } else {
            Command::new("open")
                .args(["-a", trimmed])
                .spawn()
                .map_err(|e| format!("Failed to open '{}': {}", trimmed, e))?;
        }
        return Ok(());
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("sh")
            .args(["-c", &format!("{} &", trimmed)])
            .spawn()
            .map_err(|e| format!("Failed to launch '{}': {}", trimmed, e))?;
        return Ok(());
    }

    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported operating system".to_string())
    }
}

#[tauri::command]
fn scan_installed_apps() -> Vec<AppInfo> {
    let mut apps: Vec<AppInfo> = Vec::new();

    #[cfg(target_os = "windows")]
    {
        let standard_apps = vec![
            ("calc", "Calculator", "system", "Calculator"),
            ("notepad", "Notepad", "productivity", "FileText"),
            ("mspaint", "Paint", "media", "Palette"),
            ("explorer", "File Explorer", "system", "FolderOpen"),
            ("wt", "Windows Terminal", "developer", "Terminal"),
            ("powershell", "PowerShell", "developer", "Terminal"),
            ("cmd", "Command Prompt", "developer", "Terminal"),
            ("msedge", "Microsoft Edge", "productivity", "Globe"),
            ("chrome", "Google Chrome", "productivity", "Globe"),
            ("code", "Visual Studio Code", "developer", "Code"),
            ("spotify", "Spotify", "media", "Music"),
            ("slack", "Slack", "productivity", "MessageSquare"),
            ("discord", "Discord", "media", "MessageSquare"),
            ("notion", "Notion", "productivity", "FileText"),
            ("taskmgr", "Task Manager", "system", "Activity"),
            ("control", "Control Panel", "system", "Settings"),
            ("ms-settings:", "Windows Settings", "system", "Settings"),
            ("snippingtool", "Snipping Tool", "productivity", "Scissors"),
        ];

        for (cmd, name, category, icon) in standard_apps {
            apps.push(AppInfo {
                id: format!("win-{}", cmd.replace(':', "").replace(' ', "-")),
                name: name.to_string(),
                path_or_command: cmd.to_string(),
                category: category.to_string(),
                icon: icon.to_string(),
            });
        }

        let paths = vec![
            std::env::var("APPDATA").map(|p| format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", p)).ok(),
            std::env::var("ALLUSERSPROFILE").map(|p| format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", p)).ok(),
            std::env::var("ProgramData").map(|p| format!("{}\\Microsoft\\Windows\\Start Menu\\Programs", p)).ok(),
        ];

        for base_path in paths.into_iter().flatten() {
            if let Ok(entries) = std::fs::read_dir(&base_path) {
                for entry in entries.flatten() {
                    if let Ok(file_type) = entry.file_type() {
                        if file_type.is_file() {
                            let path = entry.path();
                            if let Some(ext) = path.extension() {
                                if ext.to_string_lossy().to_lowercase() == "lnk" {
                                    if let Some(stem) = path.file_stem() {
                                        let app_name = stem.to_string_lossy().to_string();
                                        if !apps.iter().any(|a| a.name.eq_ignore_ascii_case(&app_name)) {
                                            apps.push(AppInfo {
                                                id: format!("lnk-{}", apps.len()),
                                                name: app_name,
                                                path_or_command: path.to_string_lossy().to_string(),
                                                category: "installed".to_string(),
                                                icon: "Laptop".to_string(),
                                            });
                                        }
                                    }
                                }
                            }
                        } else if file_type.is_dir() {
                            if let Ok(sub_entries) = std::fs::read_dir(entry.path()) {
                                for sub_entry in sub_entries.flatten() {
                                    let sub_path = sub_entry.path();
                                    if let Some(ext) = sub_path.extension() {
                                        if ext.to_string_lossy().to_lowercase() == "lnk" {
                                            if let Some(stem) = sub_path.file_stem() {
                                                let app_name = stem.to_string_lossy().to_string();
                                                if !apps.iter().any(|a| a.name.eq_ignore_ascii_case(&app_name)) {
                                                    apps.push(AppInfo {
                                                        id: format!("lnk-{}", apps.len()),
                                                        name: app_name,
                                                        path_or_command: sub_path.to_string_lossy().to_string(),
                                                        category: "installed".to_string(),
                                                        icon: "Laptop".to_string(),
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        let app_dirs = vec![
            "/Applications",
            "/System/Applications",
            "/System/Applications/Utilities",
        ];

        for dir in app_dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        if ext == "app" {
                            if let Some(stem) = path.file_stem() {
                                let app_name = stem.to_string_lossy().to_string();
                                if !apps.iter().any(|a| a.name.eq_ignore_ascii_case(&app_name)) {
                                    apps.push(AppInfo {
                                        id: format!("mac-{}", apps.len()),
                                        name: app_name,
                                        path_or_command: path.to_string_lossy().to_string(),
                                        category: "installed".to_string(),
                                        icon: "Laptop".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let dirs = vec!["/usr/share/applications", "/usr/local/share/applications"];
        for dir in dirs {
            if let Ok(entries) = std::fs::read_dir(dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if let Some(ext) = path.extension() {
                        if ext == "desktop" {
                            if let Some(stem) = path.file_stem() {
                                let app_name = stem.to_string_lossy().to_string();
                                if !apps.iter().any(|a| a.name.eq_ignore_ascii_case(&app_name)) {
                                    apps.push(AppInfo {
                                        id: format!("linux-{}", apps.len()),
                                        name: app_name.replace('-', " "),
                                        path_or_command: path.to_string_lossy().to_string(),
                                        category: "installed".to_string(),
                                        icon: "Laptop".to_string(),
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    apps
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(window);
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            hide_window,
            show_window,
            toggle_window,
            open_external_url,
            launch_system_app,
            scan_installed_apps
        ])
        .setup(|app| {
            // Register global shortcut: Option+Space on macOS, Alt+Space on Windows/Linux
            #[cfg(desktop)]
            {
                let shortcut_str = if cfg!(target_os = "macos") {
                    "Option+Space"
                } else {
                    "Alt+Space"
                };

                if let Ok(parsed) = shortcut_str.parse::<Shortcut>() {
                    let _ = app.global_shortcut().register(parsed);
                }
            }

            // Window blur event: automatically hide when user clicks outside
            if let Some(window) = app.get_webview_window("main") {
                let win_clone = window.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Focused(focused) = event {
                        if !focused {
                            let _ = win_clone.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running arc desktop application");
}

