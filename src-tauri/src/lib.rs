use tauri::{AppHandle, Manager, WebviewWindow};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

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

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    if event.state() == ShortcutState::Pressed {
                        if let Some(window) = app.get_webview_window("main") {
                            toggle_window(window);
                        }
                    }
                })
                .build(),
        )
        .invoke_handler(tauri::generate_handler![hide_window, show_window, toggle_window])
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
