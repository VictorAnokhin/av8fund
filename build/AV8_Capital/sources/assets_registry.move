module av8_capital::assets_registry;

use std::type_name;

use sui::sui::SUI;

const E_ASSET_NOT_AUTHORIZED: u64 = 401;
const OWNER_CAP_RECIPIENT: address = @0x3d5767f427b38669fa1a62674912e3dc8573b607c9ceb6676dc216398bf75fda;

/// MVP whitelist for testnet launch.
/// The first deploy only accepts SUI until real bridged assets are wired in.
public struct Registry has key {
    id: sui::object::UID,
    sui_enabled: bool,
}

public struct OwnerCap has key, store {
    id: sui::object::UID,
}

fun init(ctx: &mut sui::tx_context::TxContext) {
    let registry = Registry {
        id: sui::object::new(ctx),
        sui_enabled: true,
    };

    let owner_cap = OwnerCap {
        id: sui::object::new(ctx),
    };

    sui::transfer::share_object(registry);
    sui::transfer::public_transfer(owner_cap, OWNER_CAP_RECIPIENT);
}

entry fun set_sui_enabled(_cap: &OwnerCap, registry: &mut Registry, enabled: bool) {
    registry.sui_enabled = enabled;
}

public fun assert_is_safe_asset<T>(registry: &Registry) {
    assert!(is_safe_asset<T>(registry), E_ASSET_NOT_AUTHORIZED);
}

public fun is_safe_asset<T>(registry: &Registry): bool {
    registry.sui_enabled && type_name::with_defining_ids<T>() == type_name::with_defining_ids<SUI>()
}
