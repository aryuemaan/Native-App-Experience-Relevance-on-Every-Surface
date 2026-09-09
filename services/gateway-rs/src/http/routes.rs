use axum::extract::ws::{Message, WebSocket, WebSocketUpgrade};
use axum::extract::{Path, Query, State};
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::routing::{get, post, put};
use axum::{Json, Router};
use chrono::Utc;
use futures_util::{SinkExt, StreamExt};
use serde::Deserialize;
use serde_json::{json, Value};
use std::sync::Arc;
use uuid::Uuid;

use crate::domain::pipeline::process;
use crate::domain::types::{EventKind, RawEvent};
use crate::feed::scenario;
use crate::graph::knowledge_graph::{eligible_surfaces, inducements_blocked};
use crate::graph::store::{AccountPatch, ConsentPatch, RgPatch};
use crate::state::AppState;

type Shared = State<Arc<AppState>>;

pub fn app(state: Arc<AppState>) -> Router {
    let cors = tower_http::cors::CorsLayer::permissive();
    Router::new()
        .route("/health", get(health))
        .route("/api/matches", get(matches))
        .route("/api/gaming/catalog", get(gaming_catalog))
        .route("/api/users", get(users))
        .route("/api/users/:id", get(user_detail))
        .route("/api/users/:id/graph", get(user_graph))
        .route("/api/users/:id/audit", get(user_audit))
        .route("/api/users/:id/slip", get(user_slip))
        .route("/api/users/:id/consent", put(update_consent))
        .route("/api/users/:id/rg", put(update_rg))
        .route("/api/users/:id/account", put(update_account))
        .route("/api/users/:id/cashout", post(cashout))
        .route("/api/users/:id/repeat-bet", post(repeat_bet))
        .route("/api/users/:id/context/location", post(context_location))
        .route("/api/demo/:id/scenario", post(demo_scenario))
        .route("/api/demo/:id/gaming", post(demo_gaming))
        .route("/api/demo/:id/boost", post(demo_boost))
        .route("/api/demo/:id/bonus", post(demo_bonus))
        .route("/api/demo/:id/pushy-promo", post(demo_pushy))
        .route("/api/graph", get(graph_export))
        .route("/stream", get(stream))
        .layer(cors)
        .with_state(state)
}

async fn health(State(state): Shared) -> impl IntoResponse {
    Json(json!({
        "status": "ok",
        "service": "feg-pulse-gateway",
        "runtime": "rust",
        "careGateEnabled": state.config.care_gate_enabled,
        "quietHours": { "start": state.config.quiet_hours_start, "end": state.config.quiet_hours_end },
        "frequencyCaps": { "perHour": state.config.frequency_cap_per_hour, "perDay": state.config.frequency_cap_per_day },
        "consentTcfVersion": state.config.consent_tcf_version,
        "rgSelfExcludeFlag": state.config.rg_self_exclude_flag,
        "rgDepositLimitFlag": state.config.rg_deposit_limit_flag,
        "elevenLaps": { "feed": state.feed.name(), "live": state.feed.is_live() }
    }))
}

async fn matches(State(state): Shared) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    let fixtures: Vec<Value> = store.fixtures.values().map(|f| serde_json::to_value(f).unwrap()).collect();
    Json(json!({ "matches": fixtures }))
}

async fn gaming_catalog(State(state): Shared) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    let slots: Vec<Value> = store.slots.values().map(|s| serde_json::to_value(s).unwrap()).collect();
    let tournaments: Vec<Value> = store.tournaments.values().map(|s| serde_json::to_value(s).unwrap()).collect();
    let tables: Vec<Value> = store.tables.values().map(|s| serde_json::to_value(s).unwrap()).collect();
    let bonuses: Vec<Value> = store.bonuses.values().map(|s| serde_json::to_value(s).unwrap()).collect();
    Json(json!({ "slots": slots, "tournaments": tournaments, "tables": tables, "bonuses": bonuses }))
}

async fn users(State(state): Shared) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    let users: Vec<Value> = store.users.values().map(|u| serde_json::to_value(u).unwrap()).collect();
    Json(json!({ "users": users }))
}

async fn user_detail(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    match store.get_user(&id) {
        Some(u) => Json(serde_json::to_value(u).unwrap()).into_response(),
        None => not_found(),
    }
}

async fn user_graph(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    let Some(u) = store.get_user(&id) else { return not_found() };
    let surfaces: Vec<String> = eligible_surfaces(u)
        .into_iter()
        .map(|s| serde_json::to_value(s).unwrap().as_str().unwrap().to_string())
        .collect();
    Json(json!({
        "id": u.id,
        "displayName": u.display_name,
        "follows": u.follows,
        "tickets": u.tickets,
        "favoriteSlots": u.favorite_slots,
        "followedTournaments": u.followed_tournaments,
        "liveDealerTables": u.live_dealer_tables,
        "boosts": u.boosts,
        "rewards": u.rewards,
        "eligibleSurfaces": surfaces,
        "inducementsBlocked": inducements_blocked(u),
        "consent": u.consent,
        "rg": u.rg,
        "account": u.account
    }))
    .into_response()
}

async fn user_audit(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    Json(json!({ "audit": state.audit_for(&id) }))
}

async fn user_slip(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let store = state.store.read().expect("store");
    match store.get_user(&id) {
        Some(u) => Json(json!({ "tickets": u.tickets })).into_response(),
        None => not_found(),
    }
}

async fn update_consent(State(state): Shared, Path(id): Path<String>, Json(patch): Json<ConsentPatch>) -> impl IntoResponse {
    let ok = { state.store.write().expect("store").update_consent(&id, patch) };
    respond_user(&state, &id, ok)
}

async fn update_rg(State(state): Shared, Path(id): Path<String>, Json(patch): Json<RgPatch>) -> impl IntoResponse {
    let ok = { state.store.write().expect("store").update_rg(&id, patch) };
    respond_user(&state, &id, ok)
}

async fn update_account(State(state): Shared, Path(id): Path<String>, Json(patch): Json<AccountPatch>) -> impl IntoResponse {
    let ok = { state.store.write().expect("store").update_account(&id, patch) };
    respond_user(&state, &id, ok)
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CashoutBody {
    ticket_id: Option<String>,
}

async fn cashout(State(state): Shared, Path(id): Path<String>, body: Option<Json<CashoutBody>>) -> impl IntoResponse {
    let target = body.and_then(|b| b.0.ticket_id).or_else(|| {
        let store = state.store.read().expect("store");
        store.open_ticket(&id).map(|t| t.id)
    });
    let Some(ticket_id) = target else { return not_found() };
    let ticket = { state.store.write().expect("store").cashout(&id, &ticket_id) };
    let Some(ticket) = ticket else { return not_found() };

    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    if let Some(_u) = user {
        let event = RawEvent {
            id: format!("evt_{}", Uuid::new_v4().simple()),
            user_id: id.clone(),
            kind: EventKind::TicketSettled,
            title: "Isplaceno".to_string(),
            body: format!("Isplata {:.2} EUR potvrdena", ticket.live_value),
            cta: None,
            data: json!({ "ticketId": ticket.id, "status": "cashed_out", "cashoutValue": ticket.live_value }),
        };
        let moment = process(&state, event, Utc::now());
        return Json(json!({ "ticket": ticket, "moment": moment })).into_response();
    }
    not_found()
}

async fn repeat_bet(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let allowed = { state.store.read().expect("store").repeat_bet_allowed(&id) };
    if allowed {
        (StatusCode::OK, Json(json!({ "allowed": true, "message": "Repeat bet permitted." }))).into_response()
    } else {
        (
            StatusCode::FORBIDDEN,
            Json(json!({ "allowed": false, "reason": "RG_GUARDRAIL", "message": "Repeat bet blocked by responsible-gaming guardrail." })),
        )
            .into_response()
    }
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct LocationBody {
    derived_proximity: Option<String>,
    venue: Option<String>,
}

async fn context_location(State(state): Shared, Path(id): Path<String>, Json(body): Json<LocationBody>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let venue = body.venue.unwrap_or_else(|| "PSK poslovnica".to_string());
    let event = RawEvent {
        id: format!("evt_{}", Uuid::new_v4().simple()),
        user_id: user.id.clone(),
        kind: EventKind::GeoShortcut,
        title: format!("Blizu si {}", venue),
        body: "Provjeri listic ili gledaj utakmicu".to_string(),
        cta: None,
        data: json!({ "venue": venue, "derivedProximity": body.derived_proximity.unwrap_or_else(|| "near_shop".to_string()) }),
    };
    let moment = process(&state, event, Utc::now());
    Json(json!({ "moment": moment })).into_response()
}

async fn demo_scenario(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let steps = scenario::derby(&user);
    let count = steps.len();
    spawn_stream(state, steps);
    (StatusCode::ACCEPTED, Json(json!({ "scenario": "derby", "steps": count }))).into_response()
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct GamingBody {
    scenario: String,
}

async fn demo_gaming(State(state): Shared, Path(id): Path<String>, Json(body): Json<GamingBody>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let steps = match body.scenario.as_str() {
        "slot" => scenario::gaming_slot(&user),
        "tournament" => scenario::gaming_tournament(&user),
        "live_dealer" => scenario::gaming_live_dealer(&user),
        _ => return (StatusCode::BAD_REQUEST, Json(json!({ "error": "unknown gaming scenario" }))).into_response(),
    };
    let count = steps.len();
    spawn_stream(state, steps);
    (StatusCode::ACCEPTED, Json(json!({ "scenario": body.scenario, "steps": count }))).into_response()
}

async fn demo_boost(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let moment = process(&state, scenario::boost_event(&user), Utc::now());
    Json(json!({ "delivered": moment.is_some(), "moment": moment })).into_response()
}

async fn demo_bonus(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let moment = process(&state, scenario::bonus_drop(&user), Utc::now());
    Json(json!({ "delivered": moment.is_some(), "moment": moment })).into_response()
}

async fn demo_pushy(State(state): Shared, Path(id): Path<String>) -> impl IntoResponse {
    let user = { state.store.read().expect("store").get_user(&id).cloned() };
    let Some(user) = user else { return not_found() };
    let moment = process(&state, scenario::pushy_promo(&user), Utc::now());
    Json(json!({ "delivered": moment.is_some(), "moment": moment })).into_response()
}

#[derive(Deserialize)]
struct GraphQuery {
    format: Option<String>,
}

async fn graph_export(State(state): Shared, Query(q): Query<GraphQuery>) -> impl IntoResponse {
    let kg = state.knowledge_graph();
    match q.format.as_deref() {
        Some("mermaid") => {
            let mut resp = kg.to_mermaid().into_response();
            resp.headers_mut().insert(
                axum::http::header::CONTENT_TYPE,
                axum::http::HeaderValue::from_static("text/plain; charset=utf-8"),
            );
            resp
        }
        _ => Json(json!({
            "nodes": kg.export().nodes,
            "edges": kg.export().edges,
            "nodeCount": kg.node_count(),
            "edgeCount": kg.edge_count()
        }))
        .into_response(),
    }
}

#[derive(Deserialize)]
struct StreamQuery {
    #[serde(rename = "userId")]
    user_id: Option<String>,
}

async fn stream(ws: WebSocketUpgrade, Query(q): Query<StreamQuery>, State(state): Shared) -> impl IntoResponse {
    let user_id = q.user_id.unwrap_or_else(|| "marek".to_string());
    ws.on_upgrade(move |socket| stream_loop(socket, state, user_id))
}

async fn stream_loop(socket: WebSocket, state: Arc<AppState>, user_id: String) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.hub.subscribe(&user_id);

    let hello = json!({ "type": "connected", "userId": user_id }).to_string();
    if sender.send(Message::Text(hello)).await.is_err() {
        return;
    }

    loop {
        tokio::select! {
            incoming = receiver.next() => {
                match incoming {
                    Some(Ok(Message::Close(_))) | None => break,
                    _ => {}
                }
            }
            broadcast = rx.recv() => {
                match broadcast {
                    Ok(moment) => {
                        let payload = json!({ "type": "moment", "moment": moment }).to_string();
                        if sender.send(Message::Text(payload)).await.is_err() {
                            break;
                        }
                    }
                    Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(tokio::sync::broadcast::error::RecvError::Closed) => break,
                }
            }
        }
    }
}

fn spawn_stream(state: Arc<AppState>, steps: Vec<scenario::ScenarioStep>) {
    tokio::spawn(async move {
        for step in steps {
            if step.delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(step.delay_ms)).await;
            }
            process(&state, step.event, Utc::now());
        }
    });
}

fn respond_user(state: &AppState, id: &str, ok: bool) -> axum::response::Response {
    if !ok {
        return not_found();
    }
    let store = state.store.read().expect("store");
    match store.get_user(id) {
        Some(u) => Json(serde_json::to_value(u).unwrap()).into_response(),
        None => not_found(),
    }
}

fn not_found() -> axum::response::Response {
    (StatusCode::NOT_FOUND, Json(json!({ "error": "not found" }))).into_response()
}
