module sui_hybrid_index_fund::strategy;

use std::ascii::String;

use sui::clock::{Self as clock, Clock};
use sui::event;
use sui::object::{Self as object, ID, UID};
use sui::tx_context::{Self as tx_context, TxContext};
use sui::transfer;

use sui_hybrid_index_fund::basket::{Self as basket, AdminCap, Basket};

const E_WRONG_MANAGER: u64 = 100;
const E_MANAGER_INACTIVE: u64 = 101;
const E_SLIPPAGE_TOO_HIGH: u64 = 102;
const E_TRADE_TOO_LARGE: u64 = 103;
const E_STALE_PRICE: u64 = 104;
const E_WRONG_STRATEGY: u64 = 105;
const E_INVALID_TARGET_WEIGHT: u64 = 106;

const MAX_BPS: u64 = 10_000;

public struct ManagerCap has key, store {
    id: UID,
    basket_id: ID,
    max_slippage_bps: u64,
    max_trade_bps: u64,
    active: bool,
}

public struct StrategyConfig has key, store {
    id: UID,
    basket_id: ID,
    cetus_router: address,
    navi_pool: address,
    scallop_pool: address,
    max_price_age_ms: u64,
}

public struct ManagerIssuedEvent has copy, drop {
    basket_id: ID,
    manager: address,
    max_slippage_bps: u64,
    max_trade_bps: u64,
}

public struct ManagerStatusChangedEvent has copy, drop {
    basket_id: ID,
    active: bool,
}

public struct RebalanceEvent has drop {
    basket_id: ID,
    manager: address,
    from_asset: String,
    to_asset: String,
    trade_bps: u64,
    expected_out: u64,
    actual_out: u64,
    nav_after_usdc: u64,
    timestamp_ms: u64,
}

public entry fun init_strategy(
    admin: &AdminCap,
    basket_ref: &Basket,
    cetus_router: address,
    navi_pool: address,
    scallop_pool: address,
    max_price_age_ms: u64,
    ctx: &mut TxContext,
) {
    basket::assert_admin(admin, basket_ref);

    let config = StrategyConfig {
        id: object::new(ctx),
        basket_id: basket::basket_id(basket_ref),
        cetus_router,
        navi_pool,
        scallop_pool,
        max_price_age_ms,
    };

    transfer::public_transfer(config, tx_context::sender(ctx));
}

public entry fun grant_manager(
    admin: &AdminCap,
    basket_ref: &Basket,
    max_slippage_bps: u64,
    max_trade_bps: u64,
    ctx: &mut TxContext,
) {
    basket::assert_admin(admin, basket_ref);
    assert!(max_slippage_bps <= MAX_BPS, E_SLIPPAGE_TOO_HIGH);
    assert!(max_trade_bps <= MAX_BPS, E_TRADE_TOO_LARGE);

    let sender = tx_context::sender(ctx);
    let manager_cap = ManagerCap {
        id: object::new(ctx),
        basket_id: basket::basket_id(basket_ref),
        max_slippage_bps,
        max_trade_bps,
        active: true,
    };

    event::emit(ManagerIssuedEvent {
        basket_id: basket::basket_id(basket_ref),
        manager: sender,
        max_slippage_bps,
        max_trade_bps,
    });

    transfer::public_transfer(manager_cap, sender);
}

public entry fun set_manager_active(
    admin: &AdminCap,
    basket_ref: &Basket,
    manager: &mut ManagerCap,
    active: bool,
) {
    basket::assert_admin(admin, basket_ref);
    assert!(manager.basket_id == basket::basket_id(basket_ref), E_WRONG_MANAGER);

    manager.active = active;
    event::emit(ManagerStatusChangedEvent {
        basket_id: basket::basket_id(basket_ref),
        active,
    });
}

public entry fun set_pause(
    admin: &AdminCap,
    basket_ref: &mut Basket,
    paused: bool,
    clk: &Clock,
) {
    basket::assert_admin(admin, basket_ref);
    basket::set_paused(basket_ref, paused, clk);
}

public entry fun set_target_weight(
    admin: &AdminCap,
    basket_ref: &mut Basket,
    asset: String,
    target_bps: u64,
) {
    basket::assert_admin(admin, basket_ref);
    assert!(target_bps <= MAX_BPS, E_INVALID_TARGET_WEIGHT);

    basket::upsert_target_weight(basket_ref, asset, target_bps);
    basket::emit_target_weight_updated(basket_ref, target_bps);
}

/// Accounting-only MVP hook.
/// The real version should validate Pyth objects and execute a whitelisted swap adapter.
public entry fun rebalance_stub(
    basket_ref: &mut Basket,
    manager: &ManagerCap,
    strategy: &StrategyConfig,
    from_asset: String,
    to_asset: String,
    trade_bps: u64,
    oracle_age_ms: u64,
    expected_out: u64,
    actual_out: u64,
    nav_after_usdc: u64,
    clk: &Clock,
    ctx: &TxContext,
) {
    basket::assert_live(basket_ref);
    assert_manager_for_basket(manager, basket_ref);
    assert_strategy_for_basket(strategy, basket_ref);
    assert!(manager.active, E_MANAGER_INACTIVE);
    assert!(trade_bps <= manager.max_trade_bps, E_TRADE_TOO_LARGE);
    assert!(oracle_age_ms <= strategy.max_price_age_ms, E_STALE_PRICE);
    assert_min_output(manager, expected_out, actual_out);

    basket::note_rebalance(basket_ref, nav_after_usdc, clk);

    event::emit(RebalanceEvent {
        basket_id: basket::basket_id(basket_ref),
        manager: tx_context::sender(ctx),
        from_asset,
        to_asset,
        trade_bps,
        expected_out,
        actual_out,
        nav_after_usdc,
        timestamp_ms: clock::timestamp_ms(clk),
    });
}

fun assert_manager_for_basket(manager: &ManagerCap, basket_ref: &Basket) {
    assert!(manager.basket_id == basket::basket_id(basket_ref), E_WRONG_MANAGER);
}

fun assert_strategy_for_basket(strategy: &StrategyConfig, basket_ref: &Basket) {
    assert!(strategy.basket_id == basket::basket_id(basket_ref), E_WRONG_STRATEGY);
}

fun assert_min_output(manager: &ManagerCap, expected_out: u64, actual_out: u64) {
    let min_out = expected_out * (MAX_BPS - manager.max_slippage_bps) / MAX_BPS;
    assert!(actual_out >= min_out, E_SLIPPAGE_TOO_HIGH);
}
