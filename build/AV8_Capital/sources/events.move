module av8_capital::events;

use std::ascii::String;

use sui::event;

public struct DepositEvent has copy, drop {
    basket_id: sui::object::ID,
    sender: address,
    amount: u64,
    asset_type: String,
    shares_issued: u64,
}

public struct WithdrawEvent has copy, drop {
    basket_id: sui::object::ID,
    sender: address,
    amount: u64,
    asset_type: String,
    shares_burned: u64,
}

public struct PortfolioRebalancedEvent has copy, drop {
    basket_id: sui::object::ID,
    manager: address,
    asset_in: String,
    asset_out: String,
    amount_in: u64,
    amount_out: u64,
    nav_after: u64,
    timestamp_ms: u64,
}

public(package) fun emit_deposit(
    basket_id: sui::object::ID,
    sender: address,
    amount: u64,
    asset_type: String,
    shares_issued: u64,
) {
    event::emit(DepositEvent {
        basket_id,
        sender,
        amount,
        asset_type,
        shares_issued,
    });
}

public(package) fun emit_withdraw(
    basket_id: sui::object::ID,
    sender: address,
    amount: u64,
    asset_type: String,
    shares_burned: u64,
) {
    event::emit(WithdrawEvent {
        basket_id,
        sender,
        amount,
        asset_type,
        shares_burned,
    });
}

public(package) fun emit_rebalance(
    basket_id: sui::object::ID,
    manager: address,
    asset_in: String,
    asset_out: String,
    amount_in: u64,
    amount_out: u64,
    nav_after: u64,
    timestamp_ms: u64,
) {
    event::emit(PortfolioRebalancedEvent {
        basket_id,
        manager,
        asset_in,
        asset_out,
        amount_in,
        amount_out,
        nav_after,
        timestamp_ms,
    });
}
