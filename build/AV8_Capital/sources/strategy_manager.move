module av8_capital::strategy_manager;

use std::ascii::String;

use sui::clock::{Self as clock, Clock};

use av8_capital::events;
use av8_capital::portfolio::{Self as portfolio, Basket, ManagerCap};

const E_MANAGER_INACTIVE: u64 = 100;
const E_SLIPPAGE_TOO_HIGH: u64 = 101;
const E_TRADE_TOO_LARGE: u64 = 102;
const E_STALE_PRICE: u64 = 103;
const E_WRONG_STRATEGY: u64 = 104;

const MAX_BPS: u64 = 10_000;

public struct StrategyConfig has key, store {
    id: sui::object::UID,
    basket_id: sui::object::ID,
    max_price_age_ms: u64,
    max_slippage_bps: u64,
    max_trade_bps: u64,
    active: bool,
}

entry fun init_strategy(
    manager: &ManagerCap,
    basket: &Basket,
    max_price_age_ms: u64,
    max_slippage_bps: u64,
    max_trade_bps: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    portfolio::assert_manager(manager, basket);
    assert!(max_slippage_bps <= MAX_BPS, E_SLIPPAGE_TOO_HIGH);
    assert!(max_trade_bps <= MAX_BPS, E_TRADE_TOO_LARGE);

    let config = StrategyConfig {
        id: sui::object::new(ctx),
        basket_id: portfolio::basket_id(basket),
        max_price_age_ms,
        max_slippage_bps,
        max_trade_bps,
        active: true,
    };

    sui::transfer::public_transfer(config, sui::tx_context::sender(ctx));
}

entry fun set_strategy_active(
    manager: &ManagerCap,
    basket: &Basket,
    config: &mut StrategyConfig,
    active: bool,
) {
    portfolio::assert_manager(manager, basket);
    assert_strategy_for_basket(config, basket);
    config.active = active;
}

/// Accounting-only MVP hook for the first testnet deployment.
/// Real swap routing should be added after deployable package validation.
entry fun rebalance_stub(
    manager: &ManagerCap,
    basket: &mut Basket,
    config: &StrategyConfig,
    asset_in: String,
    asset_out: String,
    amount_in: u64,
    expected_out: u64,
    actual_out: u64,
    trade_bps: u64,
    oracle_age_ms: u64,
    nav_after_sui: u64,
    clk: &Clock,
    ctx: &sui::tx_context::TxContext,
) {
    portfolio::assert_live(basket);
    portfolio::assert_manager(manager, basket);
    assert_strategy_for_basket(config, basket);
    assert!(config.active, E_MANAGER_INACTIVE);
    assert!(trade_bps <= config.max_trade_bps, E_TRADE_TOO_LARGE);
    assert!(oracle_age_ms <= config.max_price_age_ms, E_STALE_PRICE);

    let min_out = expected_out * (MAX_BPS - config.max_slippage_bps) / MAX_BPS;
    assert!(actual_out >= min_out, E_SLIPPAGE_TOO_HIGH);

    portfolio::note_rebalance(basket, nav_after_sui, clock::timestamp_ms(clk));
    events::emit_rebalance(
        portfolio::basket_id(basket),
        sui::tx_context::sender(ctx),
        asset_in,
        asset_out,
        amount_in,
        actual_out,
        nav_after_sui,
        clock::timestamp_ms(clk),
    );
}

fun assert_strategy_for_basket(config: &StrategyConfig, basket: &Basket) {
    assert!(config.basket_id == portfolio::basket_id(basket), E_WRONG_STRATEGY);
}
