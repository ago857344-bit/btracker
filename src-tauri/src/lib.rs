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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(Repository(Mutex::new(())))
        .invoke_handler(tauri::generate_handler![
            load_state,
            save_state,
            summarize_syllabus_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running BTracker Next");
}
