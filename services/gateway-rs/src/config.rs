use std::env;

#[derive(Debug, Clone)]
pub struct Config {
    pub host: String,
    pub port: u16,
    pub care_gate_enabled: bool,
    pub quiet_hours_start: String,
    pub quiet_hours_end: String,
    pub frequency_cap_per_hour: u32,
    pub frequency_cap_per_day: u32,
    pub eleven_laps_url: String,
    pub eleven_laps_api_key: String,
    pub eleven_laps_timeout_ms: u64,
    pub eleven_laps_live: bool,
    pub consent_tcf_version: String,
    pub rg_self_exclude_flag: bool,
    pub rg_deposit_limit_flag: bool,
}

fn var(key: &str, default: &str) -> String {
    env::var(key).unwrap_or_else(|_| default.to_string())
}

fn var_u32(key: &str, default: u32) -> u32 {
    env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn var_u64(key: &str, default: u64) -> u64 {
    env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn var_u16(key: &str, default: u16) -> u16 {
    env::var(key).ok().and_then(|v| v.parse().ok()).unwrap_or(default)
}

fn var_bool(key: &str, default: bool) -> bool {
    env::var(key)
        .ok()
        .map(|v| matches!(v.to_lowercase().as_str(), "1" | "true" | "yes" | "on"))
        .unwrap_or(default)
}

impl Config {
    pub fn from_env() -> Self {
        Config {
            host: var("HOST", "0.0.0.0"),
            port: var_u16("PORT", 8080),
            care_gate_enabled: var_bool("CARE_GATE_ENABLED", true),
            quiet_hours_start: var("QUIET_HOURS_START", "23:00"),
            quiet_hours_end: var("QUIET_HOURS_END", "08:00"),
            frequency_cap_per_hour: var_u32("FREQUENCY_CAP_PER_HOUR", 2),
            frequency_cap_per_day: var_u32("FREQUENCY_CAP_PER_DAY", 6),
            eleven_laps_url: var("ELEVEN_LAPS_URL", "https://api.11-laps.example/v1"),
            eleven_laps_api_key: var("ELEVEN_LAPS_API_KEY", ""),
            eleven_laps_timeout_ms: var_u64("ELEVEN_LAPS_TIMEOUT_MS", 4000),
            eleven_laps_live: var_bool("ELEVEN_LAPS_LIVE", false),
            consent_tcf_version: var("CONSENT_TCF_VERSION", "2.2"),
            rg_self_exclude_flag: var_bool("RG_SELF_EXCLUDE_FLAG", true),
            rg_deposit_limit_flag: var_bool("RG_DEPOSIT_LIMIT_FLAG", true),
        }
    }
}

impl Default for Config {
    fn default() -> Self {
        Config {
            host: "0.0.0.0".to_string(),
            port: 8080,
            care_gate_enabled: true,
            quiet_hours_start: "23:00".to_string(),
            quiet_hours_end: "08:00".to_string(),
            frequency_cap_per_hour: 2,
            frequency_cap_per_day: 6,
            eleven_laps_url: "https://api.11-laps.example/v1".to_string(),
            eleven_laps_api_key: String::new(),
            eleven_laps_timeout_ms: 4000,
            eleven_laps_live: false,
            consent_tcf_version: "2.2".to_string(),
            rg_self_exclude_flag: true,
            rg_deposit_limit_flag: true,
        }
    }
}
