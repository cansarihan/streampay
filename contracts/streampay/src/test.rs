#![cfg(test)]

use crate::{types::Error, types::StreamStatus, StreamPay, StreamPayClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger as _},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

struct Setup<'a> {
    env: Env,
    client: StreamPayClient<'a>,
    token: Address,
    sender: Address,
    recipient: Address,
    admin: Address,
    fee_collector: Address,
}

fn set_time(env: &Env, t: u64) {
    env.ledger().with_mut(|li| li.timestamp = t);
}

fn setup(fee_bps: u32) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();
    set_time(&env, 1_000);

    let admin = Address::generate(&env);
    let fee_collector = Address::generate(&env);
    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    // A test token (Stellar Asset Contract).
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let token = sac.address();
    StellarAssetClient::new(&env, &token).mint(&sender, &1_000_000);

    let contract_id = env.register(StreamPay, ());
    let client = StreamPayClient::new(&env, &contract_id);
    client.initialize(&admin, &fee_bps, &fee_collector);

    Setup {
        env,
        client,
        token,
        sender,
        recipient,
        admin,
        fee_collector,
    }
}

fn token_balance(env: &Env, token: &Address, who: &Address) -> i128 {
    TokenClient::new(env, token).balance(who)
}

#[test]
fn create_escrows_funds_and_indexes() {
    let s = setup(0);
    let id = s.client.create_stream(
        &s.sender,
        &s.recipient,
        &s.token,
        &1_000,
        &1_000, // start
        &1_000, // cliff == start (no cliff)
        &2_000, // end
        &true,
    );
    assert_eq!(id, 0);
    assert_eq!(s.client.total_streams(), 1);
    assert_eq!(token_balance(&s.env, &s.token, &s.sender), 1_000_000 - 1_000);
    assert_eq!(s.client.get_streams_by_sender(&s.sender).len(), 1);
    assert_eq!(s.client.get_streams_by_recipient(&s.recipient).len(), 1);

    let stream = s.client.get_stream(&id);
    assert_eq!(stream.deposit, 1_000);
    assert_eq!(stream.status, StreamStatus::Active);
}

#[test]
fn linear_vesting_and_partial_withdraw() {
    let s = setup(0);
    let id = s.client.create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_000, &2_000, &true,
    );

    // Half way through a 1000s window → 500 vested.
    set_time(&s.env, 1_500);
    assert_eq!(s.client.streamed_amount(&id), 500);
    assert_eq!(s.client.withdrawable_amount(&id), 500);

    let net = s.client.withdraw(&id, &200);
    assert_eq!(net, 200);
    assert_eq!(token_balance(&s.env, &s.token, &s.recipient), 200);
    assert_eq!(s.client.withdrawable_amount(&id), 300);

    // Past the end → everything vested, withdraw the rest.
    set_time(&s.env, 2_000);
    assert_eq!(s.client.streamed_amount(&id), 1_000);
    assert_eq!(s.client.withdrawable_amount(&id), 800);
    s.client.withdraw_max(&id);
    assert_eq!(token_balance(&s.env, &s.token, &s.recipient), 1_000);

    let stream = s.client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Depleted);
}

#[test]
fn cliff_blocks_withdrawals_until_reached() {
    let s = setup(0);
    let id = s.client.create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_500, &2_000, &true,
    );

    // Before the cliff: nothing vested even though time has passed.
    set_time(&s.env, 1_200);
    assert_eq!(s.client.streamed_amount(&id), 0);
    assert_eq!(s.client.withdrawable_amount(&id), 0);
    assert_eq!(
        s.client.try_withdraw(&id, &1),
        Err(Ok(Error::NothingToWithdraw.into()))
    );

    // At the cliff: the amount accrued since start unlocks at once.
    set_time(&s.env, 1_500);
    assert_eq!(s.client.streamed_amount(&id), 500);
    assert_eq!(s.client.withdrawable_amount(&id), 500);
}

#[test]
fn cancel_splits_vested_and_refund() {
    let s = setup(0);
    let id = s.client.create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_000, &2_000, &true,
    );

    set_time(&s.env, 1_500);
    let (recipient_net, refund) = s.client.cancel(&id);
    assert_eq!(recipient_net, 500);
    assert_eq!(refund, 500);
    assert_eq!(token_balance(&s.env, &s.token, &s.recipient), 500);
    // Sender started with 1,000,000, escrowed 1,000, got 500 back.
    assert_eq!(token_balance(&s.env, &s.token, &s.sender), 1_000_000 - 500);

    let stream = s.client.get_stream(&id);
    assert_eq!(stream.status, StreamStatus::Canceled);
}

#[test]
fn protocol_fee_is_taken_on_withdraw() {
    let s = setup(100); // 1%
    let id = s.client.create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_000, &2_000, &true,
    );
    set_time(&s.env, 2_000);
    let net = s.client.withdraw(&id, &1_000);
    assert_eq!(net, 990);
    assert_eq!(token_balance(&s.env, &s.token, &s.recipient), 990);
    assert_eq!(token_balance(&s.env, &s.token, &s.fee_collector), 10);
}

#[test]
fn non_cancelable_cannot_be_canceled() {
    let s = setup(0);
    let id = s.client.create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_000, &2_000, &false,
    );
    assert_eq!(s.client.try_cancel(&id), Err(Ok(Error::NotCancelable.into())));
}

#[test]
fn paused_blocks_new_streams() {
    let s = setup(0);
    s.client.set_paused(&true);
    let res = s.client.try_create_stream(
        &s.sender, &s.recipient, &s.token, &1_000, &1_000, &1_000, &2_000, &true,
    );
    assert_eq!(res, Err(Ok(Error::Paused.into())));
}

#[test]
fn invalid_parameters_are_rejected() {
    let s = setup(0);
    // end <= start
    assert_eq!(
        s.client.try_create_stream(
            &s.sender, &s.recipient, &s.token, &1_000, &2_000, &2_000, &1_500, &true
        ),
        Err(Ok(Error::InvalidTimeRange.into()))
    );
    // cliff outside [start, end]
    assert_eq!(
        s.client.try_create_stream(
            &s.sender, &s.recipient, &s.token, &1_000, &1_000, &2_500, &2_000, &true
        ),
        Err(Ok(Error::InvalidCliff.into()))
    );
    // zero deposit
    assert_eq!(
        s.client.try_create_stream(
            &s.sender, &s.recipient, &s.token, &0, &1_000, &1_000, &2_000, &true
        ),
        Err(Ok(Error::InvalidAmount.into()))
    );
}

#[test]
fn fee_cap_enforced_and_admin_can_update() {
    let s = setup(0);
    assert_eq!(
        s.client.try_set_fee(&2_000, &s.admin),
        Err(Ok(Error::InvalidFee.into()))
    );
    s.client.set_fee(&250, &s.fee_collector);
    assert_eq!(s.client.get_config().fee_bps, 250);
}

#[test]
fn cannot_initialize_twice() {
    let s = setup(0);
    assert_eq!(
        s.client.try_initialize(&s.admin, &0, &s.fee_collector),
        Err(Ok(Error::AlreadyInitialized.into()))
    );
}
