use std::collections::HashMap;
use std::sync::Mutex;
use tokio::sync::broadcast;

use crate::domain::types::Moment;

pub struct StreamHub {
    channels: Mutex<HashMap<String, broadcast::Sender<Moment>>>,
    capacity: usize,
}

impl StreamHub {
    pub fn new() -> Self {
        StreamHub { channels: Mutex::new(HashMap::new()), capacity: 256 }
    }

    fn sender(&self, user_id: &str) -> broadcast::Sender<Moment> {
        let mut chans = self.channels.lock().expect("stream lock");
        chans
            .entry(user_id.to_string())
            .or_insert_with(|| broadcast::channel(self.capacity).0)
            .clone()
    }

    pub fn subscribe(&self, user_id: &str) -> broadcast::Receiver<Moment> {
        self.sender(user_id).subscribe()
    }

    pub fn publish(&self, user_id: &str, moment: Moment) -> usize {
        let tx = self.sender(user_id);
        tx.send(moment).unwrap_or(0)
    }

    pub fn subscriber_count(&self, user_id: &str) -> usize {
        let chans = self.channels.lock().expect("stream lock");
        chans.get(user_id).map(|tx| tx.receiver_count()).unwrap_or(0)
    }
}

impl Default for StreamHub {
    fn default() -> Self {
        StreamHub::new()
    }
}
