mod domain;

use chrono::Utc;
use domain::{summarize_syllabus, DocumentEnvelope, SyllabusSeed, SyllabusSummary};
use std::{fs, path::PathBuf, sync::Mutex};
use tauri::{AppHandle, Manager, State};

struct Repository(Mutex<()>);

fn state_path(app: &AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("tracker-state.json"))
}

#[tauri::command]
fn load_state(
    app: AppHandle,
    _repository: State<'_, Repository>,
) -> Result<Option<serde_json::Value>, String> {
    let path = state_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let source = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let envelope: DocumentEnvelope = serde_json::from_str(&source)
        .map_err(|error| format!("Saved tracker data is invalid: {error}"))?;
    Ok(Some(envelope.payload))
}

#[tauri::command]
fn save_state(
    app: AppHandle,
    state: serde_json::Value,
    repository: State<'_, Repository>,
) -> Result<(), String> {
    if !state.is_object() {
        return Err("Tracker state must be a JSON object".into());
    }
    let _guard = repository
        .0
        .lock()
        .map_err(|_| "State repository lock failed")?;
    let version = state
        .get("stateVersion")
        .and_then(serde_json::Value::as_u64)
        .unwrap_or(4) as u32;
    let envelope = DocumentEnvelope {
        state_version: version,
        saved_at: Utc::now().to_rfc3339(),
        payload: state,
    };
    let encoded = serde_json::to_vec_pretty(&envelope).map_err(|error| error.to_string())?;
    let path = state_path(&app)?;
    let temporary = path.with_extension("json.tmp");
    fs::write(&temporary, encoded).map_err(|error| error.to_string())?;
    fs::rename(temporary, path).map_err(|error| error.to_string())
}

#[tauri::command]
fn summarize_syllabus_command(seed: SyllabusSeed) -> SyllabusSummary {
    summarize_syllabus(seed)
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct DistractionCheckResult {
    pub blocked: bool,
    pub frontmost_app: String,
    pub window_title: String,
    pub matched_term: String,
}

#[tauri::command]
fn check_distraction_and_refocus(
    app: AppHandle,
    custom_blacklist: Option<Vec<String>>,
) -> Result<DistractionCheckResult, String> {
    #[cfg(target_os = "macos")]
    {
        let script = r#"
            tell application "System Events"
                set frontApp to ""
                set winTitle to ""
                try
                    set frontApp to name of first application process whose frontmost is true
                end try
                try
                    set winTitle to title of window 1 of (first application process whose frontmost is true)
                end try
                return frontApp & "|||" & winTitle
            end tell
        "#;

        let output = std::process::Command::new("osascript")
            .arg("-e")
            .arg(script)
            .output();

        let (frontmost_app, window_title) = match output {
            Ok(out) => {
                let combined = String::from_utf8_lossy(&out.stdout).trim().to_string();
                let parts: Vec<&str> = combined.split("|||").collect();
                let app = parts.get(0).unwrap_or(&"").trim().to_string();
                let title = parts.get(1).unwrap_or(&"").trim().to_string();
                (app, title)
            }
            Err(_) => (String::new(), String::new()),
        };

        let app_lower = frontmost_app.to_lowercase();
        let title_lower = window_title.to_lowercase();

        // Default blacklisted applications during Deep Work
        let default_blocked_apps = [
            "discord", "steam", "slack", "telegram", "whatsapp", "spotify",
            "twitter", "reddit", "league of legends", "valorant", "csgo",
            "counter-strike", "minecraft", "roblox", "battle.net", "epic games",
            "dota 2", "tiktok", "netflix", "twitch"
        ];

        // Default blacklisted window title keywords
        let default_blocked_titles = [
            "youtube", "shorts", "twitter", "x.com", "instagram", "reddit",
            "tiktok", "netflix", "twitch.tv", "anime", "facebook", "hulu", "disney+"
        ];

        let mut matched_term = String::new();
        let mut is_blocked = false;

        // Never self-block BTracker or our own windows
        let is_self = app_lower.contains("btracker") || app_lower.contains("tauri") || title_lower.contains("btracker");

        if !is_self {
            for item in &default_blocked_apps {
                if app_lower.contains(item) {
                    is_blocked = true;
                    matched_term = item.to_string();
                    break;
                }
            }

            if !is_blocked {
                for item in &default_blocked_titles {
                    if title_lower.contains(item) {
                        is_blocked = true;
                        matched_term = item.to_string();
                        break;
                    }
                }
            }

            if !is_blocked {
                if let Some(custom) = custom_blacklist {
                    for item in custom {
                        let item_clean = item.trim().to_lowercase();
                        if !item_clean.is_empty() && (app_lower.contains(&item_clean) || title_lower.contains(&item_clean)) {
                            is_blocked = true;
                            matched_term = item_clean;
                            break;
                        }
                    }
                }
            }
        }

        // If distraction detected, force BTracker window back to foreground
        if is_blocked {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
            let _ = std::process::Command::new("osascript")
                .arg("-e")
                .arg("tell application \"BTracker Next\" to activate")
                .output();
        }

        Ok(DistractionCheckResult {
            blocked: is_blocked,
            frontmost_app,
            window_title,
            matched_term,
        })
    }

    #[cfg(not(target_os = "macos"))]
    {
        Ok(DistractionCheckResult {
            blocked: false,
            frontmost_app: String::new(),
            window_title: String::new(),
            matched_term: String::new(),
        })
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Repository(Mutex::new(())))
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            summarize_syllabus_command,
            check_distraction_and_refocus
        ])
        .run(tauri::generate_context!())
        .expect("error while running BTracker Next");
}
