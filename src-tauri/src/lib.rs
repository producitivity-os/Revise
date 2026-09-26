use app_core::{
    AppActivity, AppActivityTarget, InitializeRevisionSessionInput, ReviewRevisionCardInput,
    ReviewRevisionSessionCardInput, RevisionCard, RevisionCardQuery, RevisionDashboard,
    RevisionDashboardQuery, RevisionDeckSummary, RevisionScheduleResult, RevisionSession,
    RevisionSessionGoal, RevisionSessionOrigin, RevisionSessionReviewResult, RevisionSessionRun,
    SaveRevisionSessionInput, ServiceSettings, SetRevisionSessionStatusInput,
    StartRevisionSessionInput,
};
use data_client::DataClient;
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_deep_link::DeepLinkExt;
#[cfg(not(debug_assertions))]
use tauri_plugin_opener::OpenerExt;

struct AppState {
    client: Option<DataClient>,
    configured_settings: Option<ServiceSettings>,
    config_error: Option<String>,
    initial_target: Mutex<InitialRevisionTarget>,
    pending_standalone_session_id: Mutex<Option<String>>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct InitialRevisionTarget {
    notebook_id: Option<String>,
    workflow_session_id: Option<String>,
    goal: Option<RevisionSessionGoal>,
}

impl AppState {
    fn client(&self) -> Result<DataClient, String> {
        self.client.clone().ok_or_else(|| {
            self.config_error
                .clone()
                .unwrap_or_else(|| "data service is not configured".into())
        })
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct DataServiceStatus {
    connected: bool,
    configured_settings: Option<ServiceSettings>,
    active_settings: Option<ServiceSettings>,
    error: Option<String>,
}

#[tauri::command]
async fn data_service_status(state: State<'_, AppState>) -> Result<DataServiceStatus, String> {
    let Ok(client) = state.client() else {
        return Ok(DataServiceStatus {
            connected: false,
            configured_settings: state.configured_settings.clone(),
            active_settings: None,
            error: state.config_error.clone(),
        });
    };
    match client.settings().await {
        Ok(settings) => Ok(DataServiceStatus {
            connected: true,
            configured_settings: state.configured_settings.clone(),
            active_settings: Some(settings),
            error: None,
        }),
        Err(error) => Ok(DataServiceStatus {
            connected: false,
            configured_settings: state.configured_settings.clone(),
            active_settings: None,
            error: Some(error.to_string()),
        }),
    }
}

#[tauri::command]
fn initial_revision_target(state: State<'_, AppState>) -> InitialRevisionTarget {
    state
        .initial_target
        .lock()
        .map(|target| target.clone())
        .unwrap_or(InitialRevisionTarget {
            notebook_id: None,
            workflow_session_id: None,
            goal: None,
        })
}

#[tauri::command]
fn take_pending_standalone_session(state: State<'_, AppState>) -> Option<String> {
    state.pending_standalone_session_id.lock().ok()?.take()
}

#[tauri::command]
async fn list_revision_decks(
    state: State<'_, AppState>,
) -> Result<Vec<RevisionDeckSummary>, String> {
    state
        .client()?
        .list_revision_decks()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn list_revision_cards(
    query: RevisionCardQuery,
    state: State<'_, AppState>,
) -> Result<Vec<RevisionCard>, String> {
    state
        .client()?
        .list_revision_cards(query)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_revision_dashboard(
    query: RevisionDashboardQuery,
    state: State<'_, AppState>,
) -> Result<RevisionDashboard, String> {
    state
        .client()?
        .revision_dashboard(query)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn review_revision_card(
    input: ReviewRevisionCardInput,
    state: State<'_, AppState>,
) -> Result<RevisionScheduleResult, String> {
    state
        .client()?
        .review_revision_card(input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn review_revision_session_card(
    input: ReviewRevisionSessionCardInput,
    state: State<'_, AppState>,
) -> Result<RevisionSessionReviewResult, String> {
    state
        .client()?
        .review_revision_session_card(input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_revision_session(
    id: String,
    state: State<'_, AppState>,
) -> Result<Option<RevisionSession>, String> {
    state
        .client()?
        .revision_session(id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_revision_session_run(
    id: String,
    state: State<'_, AppState>,
) -> Result<RevisionSessionRun, String> {
    state
        .client()?
        .revision_session_run(id)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn get_active_standalone_revision_session(
    state: State<'_, AppState>,
) -> Result<Option<RevisionSession>, String> {
    state
        .client()?
        .active_standalone_revision_session()
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn start_standalone_revision_session(
    notebook_id: Option<String>,
    state: State<'_, AppState>,
) -> Result<RevisionSessionRun, String> {
    state
        .client()?
        .start_revision_session(StartRevisionSessionInput {
            id: uuid::Uuid::now_v7().to_string(),
            origin: RevisionSessionOrigin::Standalone,
            workflow_id: None,
            node_id: None,
            notebook_id,
        })
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn save_revision_session(
    input: SaveRevisionSessionInput,
    state: State<'_, AppState>,
) -> Result<RevisionSession, String> {
    state
        .client()?
        .save_revision_session(input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn initialize_revision_session(
    input: InitializeRevisionSessionInput,
    state: State<'_, AppState>,
) -> Result<RevisionSession, String> {
    state
        .client()?
        .initialize_revision_session(input)
        .await
        .map_err(|error| error.to_string())
}

#[tauri::command]
async fn set_revision_session_status(
    input: SetRevisionSessionStatusInput,
    state: State<'_, AppState>,
) -> Result<RevisionSession, String> {
    state
        .client()?
        .set_revision_session_status(input)
        .await
        .map_err(|error| error.to_string())
}

async fn dispatch_activity(
    app: &AppHandle,
    _client: &DataClient,
    activity: AppActivity,
) -> Result<(), String> {
    if !activity.is_valid() {
        return Err("invalid app activity".into());
    }
    #[cfg(debug_assertions)]
    {
        let _ = app;
        if _client
            .publish_app_activity(activity)
            .await
            .map_err(|error| error.to_string())?
        {
            return Ok(());
        }
        return Err(
            "Notes development host is not running. Start the desktop suite with `yarn desktop:dev`."
                .into(),
        );
    }
    #[cfg(not(debug_assertions))]
    {
        app.opener()
            .open_url(activity.url(), None::<&str>)
            .map_err(|error| error.to_string())
    }
}

#[tauri::command]
async fn open_notes_source(
    notebook_id: String,
    object_id: String,
    app: AppHandle,
    state: State<'_, AppState>,
) -> Result<(), String> {
    dispatch_activity(
        &app,
        &state.client()?,
        AppActivity::NotesCard {
            notebook_id,
            object_id: Some(object_id),
        },
    )
    .await
}

fn review_window_label(id: &str) -> String {
    format!(
        "review-{}",
        id.chars()
            .filter(|character| character.is_ascii_alphanumeric() || *character == '-')
            .collect::<String>()
    )
}

fn show_main_window(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Revise main window is unavailable".to_owned())?;
    let _ = window.set_size(tauri::LogicalSize::new(1360.0, 860.0));
    let _ = window.set_min_size(Some(tauri::LogicalSize::new(980.0, 640.0)));
    let _ = window.center();
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

fn show_review_window(app: &AppHandle, id: &str) -> Result<(), String> {
    let label = review_window_label(id);
    if let Some(window) = app.get_webview_window(&label) {
        window.show().map_err(|error| error.to_string())?;
        return window.set_focus().map_err(|error| error.to_string());
    }
    WebviewWindowBuilder::new(
        app,
        label,
        WebviewUrl::App(format!("index.html?sessionId={id}").into()),
    )
    .title("Review — Revise")
    .inner_size(860.0, 680.0)
    .min_inner_size(720.0, 520.0)
    .center()
    .decorations(true)
    .title_bar_style(tauri::TitleBarStyle::Overlay)
    .hidden_title(true)
    .build()
    .map(|_| ())
    .map_err(|error| error.to_string())
}

async fn handle_activity(app: AppHandle, activity: AppActivity) -> Result<(), String> {
    let client = app.state::<AppState>().client()?;
    match activity {
        AppActivity::ReviseReviewSession { session_id } => {
            client
                .revision_session_run(session_id.clone())
                .await
                .map_err(|error| error.to_string())?;
            show_review_window(&app, &session_id)
        }
        AppActivity::ReviseNotebookReview { notebook_id } => {
            let run = if let Some(session) = client
                .active_standalone_revision_session()
                .await
                .map_err(|error| error.to_string())?
            {
                client
                    .revision_session_run(session.id)
                    .await
                    .map_err(|error| error.to_string())?
            } else {
                client
                    .start_revision_session(StartRevisionSessionInput {
                        id: uuid::Uuid::now_v7().to_string(),
                        origin: RevisionSessionOrigin::Standalone,
                        workflow_id: None,
                        node_id: None,
                        notebook_id: Some(notebook_id),
                    })
                    .await
                    .map_err(|error| error.to_string())?
            };
            if let Ok(mut pending) = app.state::<AppState>().pending_standalone_session_id.lock() {
                *pending = Some(run.session.id.clone());
            }
            show_main_window(&app)?;
            app.emit("revise:start-session", &run.session.id)
                .map_err(|error| error.to_string())
        }
        _ => Err("activity is not handled by Revise".into()),
    }
}

fn dispatch_activity_urls(app: &AppHandle, values: impl IntoIterator<Item = String>) -> bool {
    let activities: Vec<_> = values
        .into_iter()
        .filter_map(|value| AppActivity::parse_url(&value))
        .filter(|activity| activity.target() == AppActivityTarget::Revise)
        .collect();
    let handled = !activities.is_empty();
    for activity in activities {
        let app = app.clone();
        tauri::async_runtime::spawn(async move {
            let _ = handle_activity(app, activity).await;
        });
    }
    handled
}

fn start_development_activity_host(app: AppHandle, client: DataClient) {
    let instance_id = uuid::Uuid::now_v7().to_string();
    tauri::async_runtime::spawn(async move {
        loop {
            let _ = client
                .register_app_activity_host(AppActivityTarget::Revise, instance_id.clone())
                .await;
            if let Ok(activities) = client
                .claim_app_activities(AppActivityTarget::Revise, instance_id.clone())
                .await
            {
                for envelope in activities {
                    let succeeded = handle_activity(app.clone(), envelope.activity)
                        .await
                        .is_ok();
                    let _ = client
                        .ack_app_activity(envelope.id, instance_id.clone(), succeeded)
                        .await;
                }
            }
            tokio::time::sleep(std::time::Duration::from_millis(300)).await;
        }
    });
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let (client, configured_settings, config_error) = match app_config::ProductivityConfig::load() {
        Ok(config) => {
            let settings = config.service_settings();
            let client = DataClient::new(
                &config.data_service.socket_path,
                config.data_service.max_request_bytes,
            );
            (Some(client), Some(settings), None)
        }
        Err(error) => (None, None, Some(error.to_string())),
    };
    let arguments: Vec<String> = std::env::args().collect();
    let notebook_id = argument(&arguments, "--notebook-id");
    let workflow_session_id = argument(&arguments, "--workflow-session-id");
    let activity_host = arguments.iter().any(|value| value == "--activity-host");
    let legacy_activity = workflow_session_id
        .as_ref()
        .map(|session_id| AppActivity::ReviseReviewSession {
            session_id: session_id.clone(),
        })
        .or_else(|| {
            notebook_id
                .as_ref()
                .map(|notebook_id| AppActivity::ReviseNotebookReview {
                    notebook_id: notebook_id.clone(),
                })
        });
    let managed_client = client.clone();
    let mut builder = tauri::Builder::default();
    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            dispatch_activity_urls(app, args);
        }));
    }
    builder
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            client,
            configured_settings,
            config_error,
            initial_target: Mutex::new(InitialRevisionTarget {
                notebook_id,
                workflow_session_id,
                goal: None,
            }),
            pending_standalone_session_id: Mutex::new(None),
        })
        .setup(move |app| {
            let handle = app.handle().clone();
            let mut handled = legacy_activity
                .clone()
                .is_some_and(|activity| dispatch_activity_urls(&handle, [activity.url()]));
            if let Some(urls) = app.deep_link().get_current()? {
                handled |=
                    dispatch_activity_urls(&handle, urls.into_iter().map(|url| url.to_string()));
            }
            let event_handle = handle.clone();
            app.deep_link().on_open_url(move |event| {
                dispatch_activity_urls(&event_handle, event.urls().iter().map(ToString::to_string));
            });
            if activity_host {
                if let Some(client) = managed_client.clone() {
                    start_development_activity_host(handle, client);
                }
            } else if !handled {
                show_main_window(&handle).map_err(std::io::Error::other)?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            data_service_status,
            initial_revision_target,
            take_pending_standalone_session,
            list_revision_decks,
            list_revision_cards,
            get_revision_dashboard,
            review_revision_card,
            review_revision_session_card,
            get_revision_session,
            get_revision_session_run,
            get_active_standalone_revision_session,
            start_standalone_revision_session,
            initialize_revision_session,
            set_revision_session_status,
            save_revision_session,
            open_notes_source
        ])
        .run(tauri::generate_context!())
        .expect("error while running Revise");
}

fn argument(arguments: &[String], key: &str) -> Option<String> {
    arguments
        .iter()
        .position(|value| value == key)
        .and_then(|index| arguments.get(index + 1))
        .cloned()
}
