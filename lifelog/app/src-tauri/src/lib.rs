//! Lifelog desktop/mobile shell.
//!
//! Tonight's build is a front-end demo: all capture, sync and inference are
//! simulated in the webview with fictional showcase data. Native commands for
//! the real pipeline (frame capture, watch audio ingest, NAS/cloud backup,
//! on-device inference) will be added behind this same entry point.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("error while running Lifelog");
}
