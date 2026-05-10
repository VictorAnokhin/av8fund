module sui_hybrid_index_fund::basket;

use std::ascii::String;

use sui::balance::{Self as balance, Balance};
use sui::clock::{Self as clock, Clock};
use sui::coin::{Self as coin, Coin};
use sui::event;
use sui::object::{Self as object, ID, UID};
use sui::sui::SUI;
use sui::transfer;
use sui::tx_context::{Self as tx_context, TxContext};
use sui::vec_map::{Self as vec_map, VecMap};

use sui_hybrid_index_fund::assets::{RwaAapl, RwaBond, USDCTest};

const E_PAUSED: u64 = 1;
const E_BELOW_MIN_DEPOSIT: u64 = 2;
const E_ZERO_SHARES: u64 = 3;
const E_NOT_POSITION_OWNER: u64 = 4;
const E_INSUFFICIENT_SHARES: u64 = 5;
const E_INSUFFICIENT_USDC_LIQUIDITY: u64 = 6;
const E_INVALID_NAV: u64 = 7;
const E_WRONG_ADMIN: u64 = 8;

const MIN_DEPOSIT: u64 = 1_000_000;

public struct AdminCap has key, store {
    id: UID,
    basket_id: ID,
}

public struct Basket has key {
    id: UID,
    version: u64,
    paused: bool,
    creator: address,
    total_shares: u64,
    nav_usdc: u64,
    last_rebalance_ts_ms: u64,
    usdc_vault: Balance<USDCTest>,
    sui_vault: Balance<SUI>,
    rwa_aapl_vault: Balance<RwaAapl>,
    rwa_bond_vault: Balance<RwaBond>,
    target_weights_bps: VecMap<String, u64>,
}

public struct Position has key, store {
    id: UID,
    owner: address,
    shares: u64,
}

public struct DepositEvent has copy, drop {
    basket_id: ID,
    investor: address,
    amount_usdc: u64,
    minted_shares: u64,
    nav_usdc: u64,
    timestamp_ms: u64,
}

public struct RedeemEvent has copy, drop {
    basket_id: ID,
    investor: address,
    burned_shares: u64,
    payout_usdc: u64,
    nav_usdc: u64,
    timestamp_ms: u64,
}

public struct PauseChangedEvent has copy, drop {
    basket_id: ID,
    paused: bool,
    timestamp_ms: u64,
}

public struct TargetWeightUpdatedEvent has drop {
    basket_id: ID,
    target_bps: u64,
}

public entry fun init(ctx: &mut TxContext) {
    let creator = tx_context::sender(ctx);
    let basket = Basket {
        id: object::new(ctx),
        version: 1,
        paused: false,
        creator,
        total_shares: 0,
        nav_usdc: 0,
        last_rebalance_ts_ms: 0,
        usdc_vault: balance::zero<USDCTest>(),
        sui_vault: balance::zero<SUI>(),
        rwa_aapl_vault: balance::zero<RwaAapl>(),
        rwa_bond_vault: balance::zero<RwaBond>(),
        target_weights_bps: vec_map::empty<String, u64>(),
    };

    let basket_id = object::id(&basket);
    let admin = AdminCap {
        id: object::new(ctx),
        basket_id,
    };

    transfer::share_object(basket);
    transfer::public_transfer(admin, creator);
}

public entry fun open_position(ctx: &mut TxContext) {
    let sender = tx_context::sender(ctx);
    let position = Position {
        id: object::new(ctx),
        owner: sender,
        shares: 0,
    };
    transfer::public_transfer(position, sender);
}

public entry fun deposit(
    basket: &mut Basket,
    position: &mut Position,
    payment: Coin<USDCTest>,
    clk: &Clock,
    ctx: &TxContext,
) {
    assert_live(basket);
    assert_position_owner(position, tx_context::sender(ctx));

    let amount = coin::value(&payment);
    assert!(amount >= MIN_DEPOSIT, E_BELOW_MIN_DEPOSIT);

    let minted_shares = preview_deposit_shares(basket, amount);
    assert!(minted_shares > 0, E_ZERO_SHARES);

    basket.total_shares = basket.total_shares + minted_shares;
    position.shares = position.shares + minted_shares;
    coin::put(&mut basket.usdc_vault, payment);

    event::emit(DepositEvent {
        basket_id: object::id(basket),
        investor: position.owner,
        amount_usdc: amount,
        minted_shares,
        nav_usdc: basket.nav_usdc,
        timestamp_ms: clock::timestamp_ms(clk),
    });
}

public entry fun redeem(
    basket: &mut Basket,
    position: &mut Position,
    shares: u64,
    clk: &Clock,
    ctx: &mut TxContext,
) {
    assert_live(basket);
    assert_position_owner(position, tx_context::sender(ctx));
    assert!(shares > 0, E_ZERO_SHARES);
    assert!(position.shares >= shares, E_INSUFFICIENT_SHARES);

    let payout = preview_redeem_usdc(basket, shares);
    assert!(balance::value(&basket.usdc_vault) >= payout, E_INSUFFICIENT_USDC_LIQUIDITY);

    position.shares = position.shares - shares;
    basket.total_shares = basket.total_shares - shares;

    let payout_balance = balance::split(&mut basket.usdc_vault, payout);
    let payout_coin = coin::from_balance(payout_balance, ctx);
    transfer::public_transfer(payout_coin, position.owner);

    event::emit(RedeemEvent {
        basket_id: object::id(basket),
        investor: position.owner,
        burned_shares: shares,
        payout_usdc: payout,
        nav_usdc: basket.nav_usdc,
        timestamp_ms: clock::timestamp_ms(clk),
    });
}

public fun preview_deposit_shares(basket: &Basket, amount_usdc: u64): u64 {
    if (basket.total_shares == 0 || basket.nav_usdc == 0) {
        amount_usdc
    } else {
        amount_usdc * basket.total_shares / basket.nav_usdc
    }
}

public fun preview_redeem_usdc(basket: &Basket, shares: u64): u64 {
    assert!(basket.total_shares > 0, E_INVALID_NAV);
    shares * basket.nav_usdc / basket.total_shares
}

public fun basket_id(basket: &Basket): ID {
    object::id(basket)
}

public fun paused(basket: &Basket): bool {
    basket.paused
}

public(package) fun assert_live(basket: &Basket) {
    assert!(!basket.paused, E_PAUSED);
}

public(package) fun assert_admin(admin: &AdminCap, basket: &Basket) {
    assert!(admin.basket_id == object::id(basket), E_WRONG_ADMIN);
}

public(package) fun set_paused(basket: &mut Basket, paused: bool, clk: &Clock) {
    basket.paused = paused;
    event::emit(PauseChangedEvent {
        basket_id: object::id(basket),
        paused,
        timestamp_ms: clock::timestamp_ms(clk),
    });
}

public(package) fun set_nav_snapshot(basket: &mut Basket, nav_usdc: u64) {
    basket.nav_usdc = nav_usdc;
}

public(package) fun note_rebalance(basket: &mut Basket, nav_usdc: u64, clk: &Clock) {
    basket.nav_usdc = nav_usdc;
    basket.last_rebalance_ts_ms = clock::timestamp_ms(clk);
}

public(package) fun upsert_target_weight(basket: &mut Basket, asset: String, target_bps: u64) {
    if (vec_map::contains(&basket.target_weights_bps, &asset)) {
        let _ = vec_map::remove(&mut basket.target_weights_bps, &asset);
    };
    vec_map::insert(&mut basket.target_weights_bps, asset, target_bps);
}

public(package) fun emit_target_weight_updated(basket: &Basket, target_bps: u64) {
    event::emit(TargetWeightUpdatedEvent {
        basket_id: object::id(basket),
        target_bps,
    });
}

fun assert_position_owner(position: &Position, sender: address) {
    assert!(position.owner == sender, E_NOT_POSITION_OWNER);
}
