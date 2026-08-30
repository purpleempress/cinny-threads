#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod external_url;

use external_url::is_allowed_external_url;
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{
    webview::{NewWindowResponse, WebviewWindowBuilder},
    WebviewUrl,
};
use tauri_plugin_opener::OpenerExt;

pub fn run() {
    for key in ["NO_PROXY", "no_proxy"] {
        let current_value = std::env::var(key).unwrap_or_default();
        if !current_value.contains("localhost") {
            let new_value = if current_value.is_empty() {
                "localhost,127.0.0.1".to_string()
            } else {
                format!("{current_value},localhost,127.0.0.1")
            };
            std::env::set_var(key, new_value);
        }
    }

    let port: u16 = 44548;
    let context = tauri::generate_context!();

    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .plugin(tauri_plugin_window_state::Builder::default().build())
        .plugin(tauri_plugin_opener::init())
        .setup(move |app| {
            #[cfg(debug_assertions)]
            let window_url = WebviewUrl::App(Default::default());

            #[cfg(not(debug_assertions))]
            let window_url = {
                let url = format!("http://localhost:{port}").parse().unwrap();
                WebviewUrl::External(url)
            };

            let app_handle = app.handle().clone();
            let window_builder = WebviewWindowBuilder::new(app, "main".to_string(), window_url)
                .title("Cinny Threads")
                .disable_drag_drop_handler()
                .on_new_window(move |url, _features| {
                    if is_allowed_external_url(url.as_str()) {
                        let _ = app_handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    NewWindowResponse::Deny
                });

            #[cfg(target_os = "macos")]
            let window_builder = window_builder.title_bar_style(TitleBarStyle::Transparent);

            window_builder.build()?;
            Ok(())
        })
        .run(context)
        .expect("error while building Tauri application");
}
