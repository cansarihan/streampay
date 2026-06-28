#![no_std]
//! StreamPay — real-time payment streaming and vesting on Soroban.
//!
//! A sender escrows a `deposit` of any Stellar Asset Contract token. The amount vests linearly
//! from `start_time` to `end_time`; nothing is withdrawable before `cliff_time`, at which point the
//! amount accrued since `start_time` unlocks. The recipient withdraws what has accrued at any time;
//! the sender can cancel a cancelable stream to reclaim the not-yet-streamed remainder.

mod events;
mod types;

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, panic_with_error, token, vec, Address, Env, Vec};

use events::{PausedSet, StreamCanceled, StreamCreated, Withdrawn};
use types::{Config, DataKey, Error, Stream, StreamStatus};

const BPS_DENOMINATOR: i128 = 10_000;
/// Hard cap on the protocol fee: 10%.
const MAX_FEE_BPS: u32 = 1_000;

// ~5s ledgers → 17,280 per day. Persistent entries are kept alive for ~30 days per touch.
const DAY_IN_LEDGERS: u32 = 17_280;
const BUMP_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const BUMP_THRESHOLD: u32 = BUMP_AMOUNT - DAY_IN_LEDGERS;

// --- storage helpers -------------------------------------------------------------------------

fn load_config(env: &Env) -> Config {
    env.storage()
        .instance()
        .get(&DataKey::Config)
        .unwrap_or_else(|| panic_with_error!(env, Error::NotInitialized))
}

fn save_config(env: &Env, cfg: &Config) {
    env.storage().instance().set(&DataKey::Config, cfg);
}

fn bump_instance(env: &Env) {
    env.storage()
        .instance()
        .extend_ttl(BUMP_THRESHOLD, BUMP_AMOUNT);
}

fn load_stream(env: &Env, id: u64) -> Stream {
    env.storage()
        .persistent()
        .get(&DataKey::Stream(id))
        .unwrap_or_else(|| panic_with_error!(env, Error::StreamNotFound))
}

fn save_stream(env: &Env, s: &Stream) {
    let key = DataKey::Stream(s.id);
    env.storage().persistent().set(&key, s);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

/// Append a stream id to an address index list (BySender / ByRecipient).
fn push_index(env: &Env, key: DataKey, id: u64) {
    let mut list: Vec<u64> = env.storage().persistent().get(&key).unwrap_or(vec![env]);
    list.push_back(id);
    env.storage().persistent().set(&key, &list);
    env.storage()
        .persistent()
        .extend_ttl(&key, BUMP_THRESHOLD, BUMP_AMOUNT);
}

// --- vesting math ----------------------------------------------------------------------------

/// Amount vested at `now`: linear from start→end, gated by the cliff, clamped to the deposit.
fn vested_amount(s: &Stream, now: u64) -> i128 {
    if now < s.cliff_time {
        return 0;
    }
    if now >= s.end_time {
        return s.deposit;
    }
    let elapsed = (now - s.start_time) as i128;
    let duration = (s.end_time - s.start_time) as i128;
    s.deposit * elapsed / duration
}

/// Amount currently withdrawable: vested minus what's already been paid out.
fn withdrawable_of(s: &Stream, now: u64) -> i128 {
    let vested = vested_amount(s, now);
    if vested > s.withdrawn {
        vested - s.withdrawn
    } else {
        0
    }
}

fn fee_on(cfg: &Config, amount: i128) -> i128 {
    amount * (cfg.fee_bps as i128) / BPS_DENOMINATOR
}

// --- contract --------------------------------------------------------------------------------

#[contract]
pub struct StreamPay;

#[contractimpl]
impl StreamPay {
    /// One-time setup of protocol config. Fails if already initialized.
    pub fn initialize(env: Env, admin: Address, fee_bps: u32, fee_collector: Address) {
        if env.storage().instance().has(&DataKey::Config) {
            panic_with_error!(&env, Error::AlreadyInitialized);
        }
        if fee_bps > MAX_FEE_BPS {
            panic_with_error!(&env, Error::InvalidFee);
        }
        save_config(
            &env,
            &Config {
                admin,
                fee_bps,
                fee_collector,
                paused: false,
            },
        );
        env.storage().instance().set(&DataKey::StreamCount, &0u64);
        bump_instance(&env);
    }

    /// Open a stream: escrow `deposit` from `sender` and start vesting to `recipient`.
    /// Returns the new stream id.
    pub fn create_stream(
        env: Env,
        sender: Address,
        recipient: Address,
        token: Address,
        deposit: i128,
        start_time: u64,
        cliff_time: u64,
        end_time: u64,
        cancelable: bool,
    ) -> u64 {
        sender.require_auth();

        let cfg = load_config(&env);
        if cfg.paused {
            panic_with_error!(&env, Error::Paused);
        }
        if deposit <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        if end_time <= start_time {
            panic_with_error!(&env, Error::InvalidTimeRange);
        }
        if cliff_time < start_time || cliff_time > end_time {
            panic_with_error!(&env, Error::InvalidCliff);
        }
        let now = env.ledger().timestamp();
        if end_time <= now {
            panic_with_error!(&env, Error::StreamEnded);
        }

        // Escrow the funds in the contract.
        token::TokenClient::new(&env, &token).transfer(
            &sender,
            &env.current_contract_address(),
            &deposit,
        );

        let id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::StreamCount)
            .unwrap_or(0);

        let stream = Stream {
            id,
            sender: sender.clone(),
            recipient: recipient.clone(),
            token,
            deposit,
            withdrawn: 0,
            start_time,
            cliff_time,
            end_time,
            cancelable,
            status: StreamStatus::Active,
            created_at: now,
        };
        save_stream(&env, &stream);
        env.storage()
            .instance()
            .set(&DataKey::StreamCount, &(id + 1));
        push_index(&env, DataKey::BySender(sender.clone()), id);
        push_index(&env, DataKey::ByRecipient(recipient.clone()), id);
        bump_instance(&env);

        StreamCreated {
            id,
            sender,
            recipient,
            deposit,
            start_time,
            end_time,
        }
        .publish(&env);
        id
    }

    /// Withdraw `amount` of the accrued balance to the recipient (minus protocol fee).
    /// Returns the net amount received by the recipient.
    pub fn withdraw(env: Env, stream_id: u64, amount: i128) -> i128 {
        let mut s = load_stream(&env, stream_id);
        s.recipient.require_auth();

        if s.status != StreamStatus::Active {
            panic_with_error!(&env, Error::StreamNotActive);
        }
        if amount <= 0 {
            panic_with_error!(&env, Error::InvalidAmount);
        }
        let now = env.ledger().timestamp();
        let available = withdrawable_of(&s, now);
        if available <= 0 {
            panic_with_error!(&env, Error::NothingToWithdraw);
        }
        if amount > available {
            panic_with_error!(&env, Error::InsufficientStreamed);
        }

        let cfg = load_config(&env);
        let fee = fee_on(&cfg, amount);
        let net = amount - fee;
        let contract = env.current_contract_address();
        let tok = token::TokenClient::new(&env, &s.token);
        tok.transfer(&contract, &s.recipient, &net);
        if fee > 0 {
            tok.transfer(&contract, &cfg.fee_collector, &fee);
        }

        s.withdrawn += amount;
        if s.withdrawn >= s.deposit {
            s.status = StreamStatus::Depleted;
        }
        save_stream(&env, &s);
        bump_instance(&env);

        Withdrawn {
            id: stream_id,
            recipient: s.recipient.clone(),
            amount,
            fee,
        }
        .publish(&env);
        net
    }

    /// Withdraw the entire currently-available balance.
    pub fn withdraw_max(env: Env, stream_id: u64) -> i128 {
        let s = load_stream(&env, stream_id);
        let available = withdrawable_of(&s, env.ledger().timestamp());
        if available <= 0 {
            panic_with_error!(&env, Error::NothingToWithdraw);
        }
        Self::withdraw(env, stream_id, available)
    }

    /// Cancel a cancelable stream: pay the recipient what has vested (minus fee) and refund the
    /// not-yet-streamed remainder to the sender. Returns `(recipient_net, sender_refund)`.
    pub fn cancel(env: Env, stream_id: u64) -> (i128, i128) {
        let mut s = load_stream(&env, stream_id);
        s.sender.require_auth();

        if !s.cancelable {
            panic_with_error!(&env, Error::NotCancelable);
        }
        if s.status != StreamStatus::Active {
            panic_with_error!(&env, Error::StreamNotActive);
        }

        let now = env.ledger().timestamp();
        let recipient_amount = withdrawable_of(&s, now);
        let refund = s.deposit - s.withdrawn - recipient_amount;

        let cfg = load_config(&env);
        let contract = env.current_contract_address();
        let tok = token::TokenClient::new(&env, &s.token);

        let mut recipient_net = 0i128;
        if recipient_amount > 0 {
            let fee = fee_on(&cfg, recipient_amount);
            recipient_net = recipient_amount - fee;
            tok.transfer(&contract, &s.recipient, &recipient_net);
            if fee > 0 {
                tok.transfer(&contract, &cfg.fee_collector, &fee);
            }
            s.withdrawn += recipient_amount;
        }
        if refund > 0 {
            tok.transfer(&contract, &s.sender, &refund);
        }

        s.status = StreamStatus::Canceled;
        save_stream(&env, &s);
        bump_instance(&env);

        StreamCanceled {
            id: stream_id,
            sender: s.sender.clone(),
            recipient: s.recipient.clone(),
            recipient_amount: recipient_net,
            refund,
        }
        .publish(&env);
        (recipient_net, refund)
    }

    // --- views -------------------------------------------------------------------------------

    pub fn get_stream(env: Env, stream_id: u64) -> Stream {
        load_stream(&env, stream_id)
    }

    /// Total amount vested at the current ledger time.
    pub fn streamed_amount(env: Env, stream_id: u64) -> i128 {
        let s = load_stream(&env, stream_id);
        vested_amount(&s, env.ledger().timestamp())
    }

    /// Amount the recipient can withdraw right now.
    pub fn withdrawable_amount(env: Env, stream_id: u64) -> i128 {
        let s = load_stream(&env, stream_id);
        withdrawable_of(&s, env.ledger().timestamp())
    }

    pub fn get_streams_by_sender(env: Env, who: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::BySender(who))
            .unwrap_or(vec![&env])
    }

    pub fn get_streams_by_recipient(env: Env, who: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::ByRecipient(who))
            .unwrap_or(vec![&env])
    }

    pub fn total_streams(env: Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::StreamCount)
            .unwrap_or(0)
    }

    pub fn get_config(env: Env) -> Config {
        load_config(&env)
    }

    // --- admin -------------------------------------------------------------------------------

    pub fn set_fee(env: Env, fee_bps: u32, fee_collector: Address) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        if fee_bps > MAX_FEE_BPS {
            panic_with_error!(&env, Error::InvalidFee);
        }
        cfg.fee_bps = fee_bps;
        cfg.fee_collector = fee_collector;
        save_config(&env, &cfg);
        bump_instance(&env);
    }

    pub fn set_admin(env: Env, new_admin: Address) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        cfg.admin = new_admin;
        save_config(&env, &cfg);
        bump_instance(&env);
    }

    pub fn set_paused(env: Env, paused: bool) {
        let mut cfg = load_config(&env);
        cfg.admin.require_auth();
        cfg.paused = paused;
        save_config(&env, &cfg);
        bump_instance(&env);
        PausedSet { paused }.publish(&env);
    }
}
