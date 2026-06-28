use soroban_sdk::{contractevent, Address};

/// Emitted when a new stream is opened. `id` is indexed so the off-chain indexer can subscribe.
#[contractevent(topics = ["created"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreamCreated {
    #[topic]
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub deposit: i128,
    pub start_time: u64,
    pub end_time: u64,
}

/// Emitted when a recipient withdraws accrued funds.
#[contractevent(topics = ["withdraw"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct Withdrawn {
    #[topic]
    pub id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub fee: i128,
}

/// Emitted when a stream is canceled, splitting vested funds and the refund.
#[contractevent(topics = ["cancel"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct StreamCanceled {
    #[topic]
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    pub recipient_amount: i128,
    pub refund: i128,
}

/// Emitted when the admin pauses or unpauses the protocol.
#[contractevent(topics = ["paused"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PausedSet {
    pub paused: bool,
}
