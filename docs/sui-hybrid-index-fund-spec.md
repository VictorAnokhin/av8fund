# Sui Hybrid Index Fund MVP Spec

## Scope

This document turns the product brief into an implementation-oriented contract spec for the first Sui MVP.

The MVP uses:
- One shared fund object (`Basket`)
- One admin capability (`AdminCap`)
- One or more owned manager capabilities (`ManagerCap`)
- One owned investor position object (`Position`) per investor
- Explicit typed vaults for supported assets
- Off-chain execution planning with on-chain validation and accounting

## Supported MVP Assets

The first version supports a narrow, explicit asset set:
- `USDCTest`
- `SUI`
- `RwaAapl`
- `RwaBond`

`USDCTest` is a placeholder test stablecoin type inside the package. Replace it with the real bridged/testnet USDC type during integration.

## Contract Layout

Package path:
- `contracts/sui-hybrid-index-fund`

Modules:
- `assets.move`
- `basket.move`
- `strategy.move`

## Object Model

### Basket

Shared object representing the fund.

Fields:
- `id: UID`
- `version: u64`
- `paused: bool`
- `creator: address`
- `total_shares: u64`
- `nav_usdc: u64`
- `last_rebalance_ts_ms: u64`
- `usdc_vault: Balance<USDCTest>`
- `sui_vault: Balance<SUI>`
- `rwa_aapl_vault: Balance<RwaAapl>`
- `rwa_bond_vault: Balance<RwaBond>`
- `target_weights_bps: VecMap<String, u64>`

Notes:
- `nav_usdc` is the latest validated NAV snapshot used for share pricing.
- Typed vaults are used for accounting clarity. `Bag` is intentionally not used as the primary vault in MVP.

### Position

Owned object held by an investor.

Fields:
- `id: UID`
- `owner: address`
- `shares: u64`

### AdminCap

Owned capability that controls:
- pause/unpause
- manager issuance
- target weights
- strategy whitelist config
- NAV sync in emergencies

### ManagerCap

Owned capability held by the rebalancing actor.

Fields:
- `id: UID`
- `basket_id: ID`
- `max_slippage_bps: u64`
- `max_trade_bps: u64`
- `active: bool`

## Share Accounting

### Deposit Formula

If `total_shares == 0` or `nav_usdc == 0`:
- `minted_shares = deposit_amount`

Otherwise:
- `minted_shares = deposit_amount * total_shares / nav_usdc`

### Redeem Formula

If `total_shares == 0`:
- abort

Otherwise:
- `redeem_amount = shares_to_burn * nav_usdc / total_shares`

MVP constraint:
- redeem is paid from `usdc_vault`
- if liquidity is insufficient, abort
- later versions can add partial unwind logic or queued redemption

## Entry Functions

### `basket::init`

Creates:
- shared `Basket`
- owned `AdminCap`

Initial state:
- `paused = false`
- `total_shares = 0`
- `nav_usdc = 0`
- all vaults empty

### `basket::open_position`

Creates an owned `Position` for the sender.

### `basket::deposit`

Inputs:
- `&mut Basket`
- `&mut Position`
- `Coin<USDCTest>`
- `&Clock`
- `&TxContext`

Rules:
- basket must not be paused
- sender must own the position
- amount must be `>= MIN_DEPOSIT`
- minted shares must be `> 0`
- USDC goes into `usdc_vault`
- `total_shares` and `position.shares` increase
- emit `DepositEvent`

### `basket::redeem`

Inputs:
- `&mut Basket`
- `&mut Position`
- `shares: u64`
- `&Clock`
- `&mut TxContext`

Rules:
- basket must not be paused
- sender must own the position
- position must hold enough shares
- calculated USDC payout must be available in `usdc_vault`
- shares are burned from position and total supply
- emit `RedeemEvent`

### `strategy::init_strategy`

Creates owned `StrategyConfig` for a basket.

Fields:
- `basket_id`
- `cetus_router`
- `navi_pool`
- `scallop_pool`
- `max_price_age_ms`

### `strategy::grant_manager`

Admin-only.

Creates a `ManagerCap` bound to one basket.

### `strategy::set_manager_active`

Admin-only.

Allows freezing a manager without destroying the capability.

### `strategy::set_pause`

Admin-only.

Toggles emergency pause on the basket.

### `strategy::set_target_weight`

Admin-only.

Updates target weights in basis points.

Validation requirement for production:
- each asset weight `<= 10000`
- total weight across supported assets must equal `10000`

The current skeleton stores values and leaves strict aggregate validation as a TODO for the next pass.

### `strategy::rebalance_stub`

Manager-only.

This is the MVP accounting hook that validates an intended rebalance and records it on-chain. It does not yet execute a real Cetus swap.

Inputs:
- `&mut Basket`
- `&ManagerCap`
- `&StrategyConfig`
- `from_asset`
- `to_asset`
- `trade_bps`
- `oracle_age_ms`
- `expected_out`
- `actual_out`
- `nav_after_usdc`
- `&Clock`
- `&TxContext`

Checks:
- basket not paused
- `manager.active == true`
- `manager.basket_id == basket.id`
- `strategy.basket_id == basket.id`
- `trade_bps <= manager.max_trade_bps`
- `oracle_age_ms <= strategy.max_price_age_ms`
- realized output is within manager slippage tolerance

Effects:
- updates `basket.nav_usdc`
- updates `basket.last_rebalance_ts_ms`
- emits `RebalanceEvent`

Production extension:
- call whitelisted Cetus/Navi/Scallop adapters
- compare realized output to oracle fair value
- mutate typed vault balances

## Abort Codes

`basket.move`
- `E_PAUSED = 1`
- `E_BELOW_MIN_DEPOSIT = 2`
- `E_ZERO_SHARES = 3`
- `E_NOT_POSITION_OWNER = 4`
- `E_INSUFFICIENT_SHARES = 5`
- `E_INSUFFICIENT_USDC_LIQUIDITY = 6`
- `E_INVALID_NAV = 7`
- `E_WRONG_ADMIN = 8`

`strategy.move`
- `E_WRONG_MANAGER = 100`
- `E_MANAGER_INACTIVE = 101`
- `E_SLIPPAGE_TOO_HIGH = 102`
- `E_TRADE_TOO_LARGE = 103`
- `E_STALE_PRICE = 104`
- `E_WRONG_STRATEGY = 105`
- `E_INVALID_TARGET_WEIGHT = 106`

## Events

### `DepositEvent`
- `basket_id`
- `investor`
- `amount_usdc`
- `minted_shares`
- `nav_usdc`
- `timestamp_ms`

### `RedeemEvent`
- `basket_id`
- `investor`
- `burned_shares`
- `payout_usdc`
- `nav_usdc`
- `timestamp_ms`

### `PauseChangedEvent`
- `basket_id`
- `paused`
- `timestamp_ms`

### `TargetWeightUpdatedEvent`
- `basket_id`
- `target_bps`

Current skeleton note:
- the emitted event is intentionally minimal and does not yet include the asset label
- if the team wants the asset symbol on-chain in the event payload, add a dedicated string-copy strategy in the next pass

### `ManagerIssuedEvent`
- `basket_id`
- `manager`
- `max_slippage_bps`
- `max_trade_bps`

### `ManagerStatusChangedEvent`
- `basket_id`
- `active`

### `RebalanceEvent`
- `basket_id`
- `manager`
- `from_asset`
- `to_asset`
- `trade_bps`
- `expected_out`
- `actual_out`
- `nav_after_usdc`
- `timestamp_ms`

## Security Rules

### Shared vs Owned

- `Basket` is shared
- `Position` is owned
- `AdminCap` is owned
- `ManagerCap` is owned
- `StrategyConfig` is owned by admin/operator

### Emergency Pause

When `paused = true`:
- `deposit` aborts
- `redeem` aborts
- `rebalance` aborts

### Whitelist Model

MVP stores approved router/pool addresses in `StrategyConfig`.

Production extension:
- separate whitelist registry
- explicit supported route IDs
- package-level adapter isolation per protocol

## Move Prover Invariants

The next prover pass should encode:
- `basket.total_shares >= 0`
- `position.shares >= 0`
- `nav_usdc == 0` iff initial or explicitly reset state
- no entry function mints negative or zero-effective shares
- redeem never burns more shares than the position owns
- rebalance never executes when paused
- manager can only act on its bound basket

## Known MVP Tradeoffs

- `rebalance_stub` records and validates a rebalance plan but does not yet perform DEX swaps
- `target_weights_bps` aggregate validation is not yet strict in code
- `nav_usdc` is updated from validated execution inputs rather than recomputed from full oracle graph inside the contract
- USDC liquidity is required for redemption

## Recommended Next Steps

1. Replace `USDCTest` with the real testnet USDC type.
2. Add protocol adapter modules for Cetus and Navi.
3. Add real oracle object verification for Pyth.
4. Tighten weight-sum validation to exactly `10000`.
5. Add integration tests for deposit, redeem, pause, manager auth, and stale-price rejection.
