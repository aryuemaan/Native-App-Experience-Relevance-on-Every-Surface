use serde_json::Value;

const DARK_PATTERNS: [&str; 14] = [
    "last chance",
    "don't miss",
    "dont miss",
    "hurry",
    "act now",
    "now or never",
    "before it's gone",
    "before its gone",
    "final call",
    "claim before",
    "chase your loss",
    "win it back",
    "deposit now",
    "!!!",
];

const SENSITIVE_KEYS: [&str; 6] = [
    "loss",
    "spend",
    "balance",
    "deposit",
    "netPosition",
    "lifetimeSpend",
];

pub struct ToneResult {
    pub ok: bool,
    pub matched: Option<String>,
}

pub fn check_tone(title: &str, body: &str) -> ToneResult {
    let haystack = format!("{} {}", title, body).to_lowercase();
    for pattern in DARK_PATTERNS.iter() {
        if haystack.contains(pattern) {
            return ToneResult { ok: false, matched: Some((*pattern).to_string()) };
        }
    }
    ToneResult { ok: true, matched: None }
}

pub fn strip_sensitive_financials(data: &Value) -> (Value, bool) {
    match data {
        Value::Object(map) => {
            let mut cleaned = map.clone();
            let mut stripped = false;
            for key in SENSITIVE_KEYS.iter() {
                if cleaned.remove(*key).is_some() {
                    stripped = true;
                }
            }
            (Value::Object(cleaned), stripped)
        }
        other => (other.clone(), false),
    }
}
