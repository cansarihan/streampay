use soroban_sdk::{contracterror, contracttype, Address};

/// Protocol-level configuration, stored once in instance storage.
#[derive(Clone)]
#[contracttype]
pub struct Config {
    pub admin: Address,
    /// Protocol fee in basis points (1/100th of a percent) taken on amounts paid to recipients.
    pub fee_bps: u32,
    pub fee_collector: Address,
    pub paused: bool,
}

/// Lifecycle status of a stream.
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[contracttype]
pub enum StreamStatus {
    /// Funds are still streaming or available to withdraw.
    Active = 0,
    /// The sender canceled; remainder refunded, vested portion paid out.
    Canceled = 1,
    /// Everything streamed has been withdrawn.
    Depleted = 2,
}

/// A single payment stream: a sender escrows `deposit` that vests linearly to `recipient`
/// between `start_time` and `end_time`, with nothing withdrawable before `cliff_time`.
#[derive(Clone)]
#[contracttype]
pub struct Stream {
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    /// Stellar Asset Contract address of the streamed token.
    pub token: Address,
    /// Total amount escrowed for the recipient.
    pub deposit: i128,
    /// Amount already paid out to the recipient (gross, before protocol fee).
    pub withdrawn: i128,
    pub start_time: u64,
    pub cliff_time: u64,
    pub end_time: u64,
    pub cancelable: bool,
    pub status: StreamStatus,
    pub created_at: u64,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotInitialized = 1,
    AlreadyInitialized = 2,
    Paused = 3,
    StreamNotFound = 4,
    InvalidAmount = 5,
    InvalidTimeRange = 6,
    InvalidCliff = 7,
    StreamEnded = 8,
    NotCancelable = 9,
    StreamNotActive = 10,
    NothingToWithdraw = 11,
    InsufficientStreamed = 12,
    InvalidFee = 13,
}

#[contracttype]
pub enum DataKey {
    Config,
    StreamCount,
    Stream(u64),
    BySender(Address),
    ByRecipient(Address),
}
