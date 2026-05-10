module av8_capital::portfolio;

use std::type_name;

use sui::balance::{Self as balance, Balance};
use sui::coin::{Self as coin, Coin};
use sui::sui::SUI;

use av8_capital::assets_registry::{Self as assets_registry, Registry};
use av8_capital::events;

const E_PAUSED: u64 = 1;
const E_INVALID_AMOUNT: u64 = 2;
const E_ZERO_SHARES: u64 = 3;
const E_NOT_POSITION_OWNER: u64 = 4;
const E_INSUFFICIENT_SHARES: u64 = 5;
const E_INSUFFICIENT_LIQUIDITY: u64 = 6;
const E_WRONG_MANAGER: u64 = 7;
const MANAGER_CAP_RECIPIENT: address = @0xc5aec8def93d6583faca1f8823b5dc8edb7cfe573633e4a4a9cd600a712a7f27;

public struct Basket has key {
    id: sui::object::UID,
    creator: address,
    paused: bool,
    total_shares: u64,
    nav_sui: u64,
    last_rebalance_ts_ms: u64,
    sui_vault: Balance<SUI>,
}

public struct Position has key, store {
    id: sui::object::UID,
    owner: address,
    shares: u64,
}

public struct ManagerCap has key, store {
    id: sui::object::UID,
    basket_id: sui::object::ID,
}

fun init(ctx: &mut sui::tx_context::TxContext) {
    let creator = sui::tx_context::sender(ctx);
    let basket = Basket {
        id: sui::object::new(ctx),
        creator,
        paused: false,
        total_shares: 0,
        nav_sui: 0,
        last_rebalance_ts_ms: 0,
        sui_vault: balance::zero<SUI>(),
    };

    let manager = ManagerCap {
        id: sui::object::new(ctx),
        basket_id: sui::object::id(&basket),
    };

    sui::transfer::share_object(basket);
    sui::transfer::public_transfer(manager, MANAGER_CAP_RECIPIENT);
}

entry fun open_position(ctx: &mut sui::tx_context::TxContext) {
    let sender = sui::tx_context::sender(ctx);
    let position = Position {
        id: sui::object::new(ctx),
        owner: sender,
        shares: 0,
    };

    sui::transfer::public_transfer(position, sender);
}

entry fun deposit(
    registry: &Registry,
    basket: &mut Basket,
    position: &mut Position,
    payment: Coin<SUI>,
    ctx: &sui::tx_context::TxContext,
) {
    assert_live(basket);
    assert_position_owner(position, sui::tx_context::sender(ctx));
    assets_registry::assert_is_safe_asset<SUI>(registry);

    let amount = coin::value(&payment);
    assert!(amount > 0, E_INVALID_AMOUNT);

    let minted_shares = preview_deposit_shares(basket, amount);
    assert!(minted_shares > 0, E_ZERO_SHARES);

    basket.total_shares = basket.total_shares + minted_shares;
    position.shares = position.shares + minted_shares;
    coin::put(&mut basket.sui_vault, payment);
    basket.nav_sui = balance::value(&basket.sui_vault);

    events::emit_deposit(
        sui::object::id(basket),
        position.owner,
        amount,
        type_name::into_string(type_name::with_defining_ids<SUI>()),
        minted_shares,
    );
}

entry fun redeem(
    basket: &mut Basket,
    position: &mut Position,
    shares: u64,
    ctx: &mut sui::tx_context::TxContext,
) {
    assert_live(basket);
    assert_position_owner(position, sui::tx_context::sender(ctx));
    assert!(shares > 0, E_ZERO_SHARES);
    assert!(position.shares >= shares, E_INSUFFICIENT_SHARES);

    let payout = preview_redeem_sui(basket, shares);
    assert!(balance::value(&basket.sui_vault) >= payout, E_INSUFFICIENT_LIQUIDITY);

    position.shares = position.shares - shares;
    basket.total_shares = basket.total_shares - shares;

    let payout_balance = balance::split(&mut basket.sui_vault, payout);
    let payout_coin = coin::from_balance(payout_balance, ctx);
    basket.nav_sui = balance::value(&basket.sui_vault);

    sui::transfer::public_transfer(payout_coin, position.owner);
    events::emit_withdraw(
        sui::object::id(basket),
        position.owner,
        payout,
        type_name::into_string(type_name::with_defining_ids<SUI>()),
        shares,
    );
}

public fun preview_deposit_shares(basket: &Basket, amount_sui: u64): u64 {
    if (basket.total_shares == 0 || basket.nav_sui == 0) {
        amount_sui
    } else {
        amount_sui * basket.total_shares / basket.nav_sui
    }
}

public fun preview_redeem_sui(basket: &Basket, shares: u64): u64 {
    assert!(basket.total_shares > 0, E_ZERO_SHARES);
    shares * basket.nav_sui / basket.total_shares
}

public fun basket_id(basket: &Basket): sui::object::ID {
    sui::object::id(basket)
}

public fun current_nav_sui(basket: &Basket): u64 {
    basket.nav_sui
}

public(package) fun assert_live(basket: &Basket) {
    assert!(!basket.paused, E_PAUSED);
}

public(package) fun assert_manager(manager: &ManagerCap, basket: &Basket) {
    assert!(manager.basket_id == sui::object::id(basket), E_WRONG_MANAGER);
}

public(package) fun note_rebalance(basket: &mut Basket, nav_sui: u64, timestamp_ms: u64) {
    basket.nav_sui = nav_sui;
    basket.last_rebalance_ts_ms = timestamp_ms;
}

entry fun set_paused(manager: &ManagerCap, basket: &mut Basket, paused: bool) {
    assert_manager(manager, basket);
    basket.paused = paused;
}

fun assert_position_owner(position: &Position, sender: address) {
    assert!(position.owner == sender, E_NOT_POSITION_OWNER);
}
