use crate::config::Config;
use crate::domain::types::Fixture;

pub trait OddsFeed: Send + Sync {
    fn name(&self) -> &'static str;
    fn is_live(&self) -> bool;
    fn fetch_fixtures(&self) -> Vec<Fixture>;
}

pub struct ElevenLapsStub {
    fixtures: Vec<Fixture>,
    endpoint: String,
}

impl ElevenLapsStub {
    pub fn new(config: &Config, fixtures: Vec<Fixture>) -> Self {
        ElevenLapsStub { fixtures, endpoint: config.eleven_laps_url.clone() }
    }

    pub fn endpoint(&self) -> &str {
        &self.endpoint
    }
}

impl OddsFeed for ElevenLapsStub {
    fn name(&self) -> &'static str {
        "eleven_laps_stub"
    }

    fn is_live(&self) -> bool {
        false
    }

    fn fetch_fixtures(&self) -> Vec<Fixture> {
        self.fixtures.clone()
    }
}

pub struct ElevenLapsLive {
    endpoint: String,
    api_key: String,
    timeout_ms: u64,
}

impl ElevenLapsLive {
    pub fn new(config: &Config) -> Self {
        ElevenLapsLive {
            endpoint: config.eleven_laps_url.clone(),
            api_key: config.eleven_laps_api_key.clone(),
            timeout_ms: config.eleven_laps_timeout_ms,
        }
    }

    pub fn request_descriptor(&self) -> String {
        format!(
            "GET {}/fixtures?live=1 key={} timeout={}ms",
            self.endpoint,
            if self.api_key.is_empty() { "<unset>" } else { "<redacted>" },
            self.timeout_ms
        )
    }
}

impl OddsFeed for ElevenLapsLive {
    fn name(&self) -> &'static str {
        "eleven_laps_live"
    }

    fn is_live(&self) -> bool {
        true
    }

    fn fetch_fixtures(&self) -> Vec<Fixture> {
        Vec::new()
    }
}

pub fn build_feed(config: &Config, seed_fixtures: Vec<Fixture>) -> Box<dyn OddsFeed> {
    if config.eleven_laps_live && !config.eleven_laps_api_key.is_empty() {
        Box::new(ElevenLapsLive::new(config))
    } else {
        Box::new(ElevenLapsStub::new(config, seed_fixtures))
    }
}
