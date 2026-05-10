/// Модуль `assets_registry` является фильтром безопасности для AV8.capital.
/// Он определяет список разрешенных активов и предоставляет функции для проверки
/// соответствия токенов стандартам безопасности фонда.
module av8_capital::assets_registry {
    use std::type_name::{Self, TypeName};
    use std::ascii;
    use sui::sui::SUI;
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::bag::{Self, Bag};

    // --- Ошибки безопасности ---
    const EAssetNotAuthorized: u64 = 401;
    const EAssetAlreadyWhitelisted: u64 = 402;
    const EAssetNotWhitelisted: u64 = 403;

    /// Объект реестра, содержащий белый список активов.
    struct Registry has key, store {
        id: UID,
        whitelisted_assets: Bag, // Bag<TypeName, u8> - u8 is a placeholder, presence means whitelisted
    }

    /// Права доступа для владельца реестра.
    /// Только владелец этого объекта может добавлять/удалять активы из белого списка.
    struct OwnerCap has key, store {
        id: UID
    }

    /// Функция инициализации модуля.
    /// Создает и инициализирует реестр активов и права доступа владельца.
    fun init(ctx: &mut TxContext) {
        let registry = Registry {
            id: object::new(ctx),
            whitelisted_assets: bag::new(ctx),
        };

        // Добавляем начальные активы в белый список
        // Используем type_name::get<T>() для известных типов и ascii::string для внешних,
        // чьи модули не импортированы напрямую, но чьи TypeName известны.
        bag::add(&mut registry.whitelisted_assets, type_name::get<SUI>(), 1);
        bag::add(&mut registry.whitelisted_assets, ascii::string(b"5dcdb5cda286590bc93d74546377d4a367e91d573041d8e137f7119041a79851::usdc::USDC"), 1);
        bag::add(&mut registry.whitelisted_assets, ascii::string(b"c060006111016b8a020ad5b31534945722b28376d3f421f3d3c61b27dfb36382::usdt::USDT"), 1);

        let owner_cap = OwnerCap {
            id: object::new(ctx),
        };

        transfer::public_share_object(registry);
        transfer::public_transfer(owner_cap, tx_context::sender(ctx));
    }

    /// Добавляет новый актив в белый список.
    /// Только владелец `OwnerCap` может вызывать эту функцию.
    public entry fun add_whitelisted_asset<T: store>(
        _cap: &OwnerCap,
        registry: &mut Registry,
    ) {
        let asset_type = type_name::get<T>();
        assert!(!bag::contains(&registry.whitelisted_assets, asset_type), EAssetAlreadyWhitelisted);
        bag::add(&mut registry.whitelisted_assets, asset_type, 1); // Добавляем с плейсхолдером
    }

    /// Удаляет актив из белого списка.
    /// Только владелец `OwnerCap` может вызывать эту функцию.
    public entry fun remove_whitelisted_asset<T: store>(
        _cap: &OwnerCap,
        registry: &mut Registry,
    ) {
        let asset_type = type_name::get<T>();
        assert!(bag::contains(&registry.whitelisted_assets, asset_type), EAssetNotWhitelisted);
        bag::remove<TypeName, u8>(&mut registry.whitelisted_assets, asset_type);
    }

    /// Функция-гвард: Проверяет, является ли токен разрешенным для консервативного фонда.
    /// Если токен не входит в белый список, выполнение транзакции прерывается.
    public fun assert_is_safe_asset<T>(registry: &Registry) {
        let asset_type = type_name::get<T>();
        assert!(is_whitelisted(registry, asset_type), EAssetNotAuthorized);
    }

    /// Внутренняя логика проверки по белому списку.
    /// Сравнивает TypeName актива с жестко заданными разрешенными типами.
    public fun is_whitelisted(registry: &Registry, type_name: TypeName): bool {
        bag::contains(&registry.whitelisted_assets, type_name)
    }

    /// Вспомогательная функция для сравнения ascii строки типа с байтовым вектором.
    fun is_type_str(type_str: ascii::String, expected: vector<u8>): bool {
        ascii::into_bytes(type_str) == expected
    }
}