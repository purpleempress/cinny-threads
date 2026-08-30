#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod external_url;

use external_url::{is_allowed_external_url, is_local_frontend_url};
#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;
use tauri::{
    webview::{NewWindowResponse, PageLoadEvent, WebviewWindowBuilder},
    WebviewUrl,
};
use tauri_plugin_opener::OpenerExt;

#[cfg(any(not(debug_assertions), test))]
fn versioned_localhost_url(port: u16, version: &str) -> String {
    format!("http://localhost:{port}/?app-version={version}")
}

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
        .plugin(
            tauri_plugin_opener::Builder::new()
                .open_js_links_on_click(false)
                .build(),
        )
        .setup(move |app| {
            #[cfg(debug_assertions)]
            let window_url = WebviewUrl::App(Default::default());

            #[cfg(not(debug_assertions))]
            let window_url = {
                let url = versioned_localhost_url(port, env!("CARGO_PKG_VERSION"))
                    .parse()
                    .unwrap();
                WebviewUrl::External(url)
            };

            let navigation_app_handle = app.handle().clone();
            let new_window_app_handle = app.handle().clone();
            let window_builder = WebviewWindowBuilder::new(app, "main".to_string(), window_url)
                .title("Cinny")
                .disable_drag_drop_handler()
                .on_page_load(move |window, payload| {
                    if payload.event() == PageLoadEvent::Finished
                        && is_local_frontend_url(payload.url().as_str(), port)
                    {
                        let _ = window.eval(include_str!("external_links.js"));
                    }
                })
                .on_navigation(move |url| {
                    if is_local_frontend_url(url.as_str(), port) {
                        return true;
                    }
                    if is_allowed_external_url(url.as_str()) {
                        let _ = navigation_app_handle
                            .opener()
                            .open_url(url.as_str(), None::<&str>);
                    }
                    false
                })
                .on_new_window(move |url, _features| {
                    if is_allowed_external_url(url.as_str()) {
                        let _ = new_window_app_handle
                            .opener()
                            .open_url(url.as_str(), None::<&str>);
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

#[cfg(test)]
mod tests {
    use super::versioned_localhost_url;

    #[test]
    fn desktop_url_is_versioned_to_bypass_stale_web_assets() {
        assert_eq!(env!("CARGO_PKG_VERSION"), "4.12.6-threads.4");
        assert_eq!(
            versioned_localhost_url(44548, env!("CARGO_PKG_VERSION")),
            "http://localhost:44548/?app-version=4.12.6-threads.4"
        );
    }
}
