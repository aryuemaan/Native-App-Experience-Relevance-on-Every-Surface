use chrono::{DateTime, Utc};
use std::collections::HashMap;
use std::sync::{Mutex, RwLock};

use crate::config::Config;
use crate::domain::types::AuditRecord;
use crate::eleven_laps::{build_feed, OddsFeed};
use crate::feed::seed::build_store;
use crate::graph::knowledge_graph::KnowledgeGraph;
use crate::graph::store::Store;
use crate::stream::StreamHub;

struct AlertCounter {
    hour_key: String,
    hour_count: u32,
    day_key: String,
    day_count: u32,
}

pub struct AppState {
    pub config: Config,
    pub store: RwLock<Store>,
    pub hub: StreamHub,
    pub feed: Box<dyn OddsFeed>,
    audit: Mutex<HashMap<String, Vec<AuditRecord>>>,
    counters: Mutex<HashMap<String, AlertCounter>>,
}

impl AppState {
    pub fn new(config: Config) -> Self {
        let store = build_store();
        let fixtures = store.fixtures.values().cloned().collect();
        let feed = build_feed(&config, fixtures);
        AppState {
            config,
            store: RwLock::new(store),
            hub: StreamHub::new(),
            feed,
            audit: Mutex::new(HashMap::new()),
            counters: Mutex::new(HashMap::new()),
        }
    }

    pub fn knowledge_graph(&self) -> KnowledgeGraph {
        let store = self.store.read().expect("store read");
        KnowledgeGraph::from_store(&store)
    }

    pub fn record_audit(&self, record: AuditRecord) {
        let mut audit = self.audit.lock().expect("audit lock");
        audit.entry(record.user_id.clone()).or_default().push(record);
    }

    pub fn audit_for(&self, user_id: &str) -> Vec<AuditRecord> {
        let audit = self.audit.lock().expect("audit lock");
        audit.get(user_id).cloned().unwrap_or_default()
    }

    fn with_counter<R>(&self, user_id: &str, now: DateTime<Utc>, f: impl FnOnce(&mut AlertCounter) -> R) -> R {
        let hour_key = now.format("%Y-%m-%dT%H").to_string();
        let day_key = now.format("%Y-%m-%d").to_string();
        let mut counters = self.counters.lock().expect("counter lock");
        let entry = counters.entry(user_id.to_string()).or_insert_with(|| AlertCounter {
            hour_key: hour_key.clone(),
            hour_count: 0,
            day_key: day_key.clone(),
            day_count: 0,
        });
        if entry.hour_key != hour_key {
            entry.hour_key = hour_key;
            entry.hour_count = 0;
        }
        if entry.day_key != day_key {
            entry.day_key = day_key;
            entry.day_count = 0;
        }
        f(entry)
    }

    pub fn hourly_cap_reached(&self, user_id: &str, now: DateTime<Utc>) -> bool {
        let cap = self.config.frequency_cap_per_hour;
        self.with_counter(user_id, now, |c| c.hour_count >= cap)
    }

    pub fn daily_cap_reached(&self, user_id: &str, now: DateTime<Utc>) -> bool {
        let cap = self.config.frequency_cap_per_day;
        self.with_counter(user_id, now, |c| c.day_count >= cap)
    }

    pub fn increment_push(&self, user_id: &str, now: DateTime<Utc>) {
        self.with_counter(user_id, now, |c| {
            c.hour_count += 1;
            c.day_count += 1;
        });
    }
}
