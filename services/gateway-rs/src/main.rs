use std::sync::Arc;

use feg_pulse_gateway::config::Config;
use feg_pulse_gateway::http::routes::app;
use feg_pulse_gateway::state::AppState;

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info")),
        )
        .init();

    let config = Config::from_env();

    if std::env::args().any(|a| a == "graph") {
        let state = AppState::new(config);
        let kg = state.knowledge_graph();
        println!("{}", kg.to_mermaid());
        return;
    }

    let host = config.host.clone();
    let port = config.port;
    let state = Arc::new(AppState::new(config));

    tracing::info!(
        feed = state.feed.name(),
        live = state.feed.is_live(),
        "eleven-laps feed initialised"
    );

    let router = app(state);
    let addr = format!("{}:{}", host, port);
    let listener = tokio::net::TcpListener::bind(&addr).await.expect("bind");
    tracing::info!(%addr, "FEG Pulse gateway listening");

    axum::serve(listener, router)
        .with_graceful_shutdown(shutdown_signal())
        .await
        .expect("server");
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("shutdown signal received");
}
