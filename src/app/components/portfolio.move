/// Модуль `portfolio` определяет основную логику фонда AV8 Capital в сети Sui.
/// Он управляет структурой корзины активов, выпуском и погашением долей фонда,
/// а также базовыми операциями по внесению и выводу капитала.
module av8_capital::portfolio {
    use sui::bag::{Self, Bag};
    use sui::object::{Self, UID};
    use sui::tx_context::{Self, TxContext};
    use sui::transfer;
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::balance::{Self, Balance};
    use sui::clock::{Self, Clock}; // Для проверки актуальности цены оракула
    use av8_capital::pyth_mock::{Self, Pyth}; // Используем мок-оракул Pyth
    use sui::bcs; // Для price_id Pyth
    use av8_capital::assets_registry::{Self, Registry};
    use av8_capital::events;
    use std::type_name::{Self, TypeName};
    use sui::sui::SUI;

    /// Коды ошибок для операций фонда.
    const ENotManager: u64 = 0;             // Вызывающий не является менеджером
    const EInvalidAmount: u64 = 1;          // Недопустимая сумма (например, ноль)
    const EInsufficientShares: u64 = 2;     // Недостаточно долей для вывода
    const EInsufficientFunds: u64 = 3;      // Недостаточно средств в фонде для вывода
    const EZeroShares: u64 = 4;             // Попытка вывода при нулевом количестве долей
    const EZeroNAV: u64 = 5;                // Попытка операции, требующей NAV, когда NAV равен нулю
    const EOraclePriceStale: u64 = 6;       // Цена оракула устарела
    const EOraclePriceUnreliable: u64 = 7;  // Цена оракула имеет слишком большой интервал доверия

    /// Тип монеты, представляющей долю в фонде.
    /// `drop` позволяет уничтожать эти монеты, что необходимо при погашении долей.
    struct SHARE has drop {}

    /// Основной объект корзины фонда.
    /// Хранит все активы фонда и управляет его долями.
    struct Basket has key, store {
        id: UID,                                // Уникальный идентификатор объекта корзины
        assets: Bag,                            // Хранилище для различных типов активов (кроме USDC)
        usdc_balance: Balance<sui::usdc::USDC>, // Выделенный баланс для ликвидных USDC
        total_shares: Balance<SHARE>,           // Общее количество выпущенных долей фонда
        share_cap: TreasuryCap<SHARE>,          // TreasuryCap для эмиссии/сжигания SHARE монет
    }

    /// Права доступа для менеджера фонда (например, AI-агента).
    /// Только владелец этого объекта может вызывать определенные функции управления.
    struct ManagerCap has key, store {
        id: UID
    }

    /// Функция инициализации модуля.
    /// Вызывается один раз при развертывании модуля для создания начальных объектов фонда.
    fun init(ctx: &mut TxContext) {
        // Создаем TreasuryCap для монеты SHARE.
        // Это позволяет модулю выпускать и сжигать доли фонда.
        let share_cap = coin::create_currency(SHARE {}, 6, b"AV8Share", b"AV8 Fund Share", ctx);

        // Создаем объект корзины фонда.
        let basket = Basket {
            id: object::new(ctx),
            assets: bag::new(ctx),
            usdc_balance: balance::zero(), // Изначально USDC нет
            total_shares: balance::zero(), // Изначально долей нет
            share_cap: share_cap,
        };

        // Создаем ManagerCap и передаем его отправителю транзакции.
        // Отправитель становится менеджером фонда.
        let manager_cap = ManagerCap {
            id: object::new(ctx),
        };

        // Делаем объект корзины общедоступным (shared), чтобы с ним могли взаимодействовать.
        transfer::public_share_object(basket);
        // Передаем ManagerCap отправителю.
        transfer::public_transfer(manager_cap, tx_context::sender(ctx));
    }

    /// Вспомогательная функция для получения текущей чистой стоимости активов (NAV) в USDC.
    /// В MVP мы проверяем наличие известных активов (SUI) и суммируем их стоимость с помощью заглушек.
    fun get_nav_usdc(basket: &Basket): u64 {
        let total_nav = balance::value(&basket.usdc_balance);
        
        // Оценка SUI (Заглушка: 1 SUI = 2 USDC)
        let sui_key = type_name::get<SUI>();
        if (bag::contains(&basket.assets, sui_key)) {
            let sui_balance = bag::borrow<TypeName, Balance<SUI>>(&basket.assets, sui_key);
            let sui_amount = balance::value(sui_balance);
            
            // Конвертация десятичных знаков:
            // SUI имеет 9 знаков, USDC — 6. 
            // Формула: (SuiAmount / 10^9) * Price * 10^6 => (SuiAmount * Price) / 1000
            let sui_value_in_usdc = (sui_amount * 2) / 1000;
            total_nav = total_nav + sui_value_in_usdc;
        };

        // Здесь можно добавить аналогичные блоки для других токенов из Registry (USDT, etc.)
        // total_nav = total_nav + (balance::value(borrow<USDT>) * 1);

        total_nav
    }

    /// Внесение USDC в фонд и получение долей фонда.
    public entry fun deposit(
        registry: &Registry, // Добавляем объект реестра для проверки
        basket: &mut Basket,
        usdc_coin: Coin<sui::usdc::USDC>, // Монета USDC, которую пользователь вносит
        ctx: &mut TxContext
    ) {
        assets_registry::assert_is_safe_asset<sui::usdc::USDC>(registry); // Проверяем, что USDC в белом списке
        let deposit_amount = coin::value(&usdc_coin);
        assert!(deposit_amount > 0, EInvalidAmount);

        let current_nav_usdc = get_nav_usdc(basket);
        let total_shares_value = balance::value(&basket.total_shares);

        let shares_to_mint = if (total_shares_value == 0) {
            // Если это первый депозит, устанавливаем начальную цену доли: 1 USDC = 1 SHARE.
            deposit_amount
        } else {
            // Рассчитываем количество долей на основе текущей NAV на долю.
            // shares_to_mint = (deposit_amount * total_shares_value) / current_nav_usdc
            assert!(current_nav_usdc > 0, EZeroNAV); // NAV не может быть нулевым для расчета
            (deposit_amount * total_shares_value) / current_nav_usdc
        };

        // Добавляем USDC на баланс фонда.
        balance::join(&mut basket.usdc_balance, coin::into_balance(usdc_coin));

        // Выпускаем новые доли и передаем их отправителю транзакции.
        let minted_shares = coin::mint(&mut basket.share_cap, shares_to_mint, ctx);
        balance::increase(&mut basket.total_shares, shares_to_mint);
        transfer::public_transfer(minted_shares, tx_context::sender(ctx));

        // Эмитируем событие о пополнении фонда
        let asset_type_str = type_name::into_string(type_name::get<sui::usdc::USDC>());
        av8_capital::events::emit_deposit(tx_context::sender(ctx), deposit_amount, asset_type_str, shares_to_mint, tx_context::epoch_timestamp_ms(ctx));
    }

    /// Вывод USDC из фонда путем сжигания долей.
    public entry fun withdraw(
        basket: &mut Basket,
        shares_to_burn_coin: Coin<SHARE>, // Монеты долей, которые пользователь сжигает
        ctx: &mut TxContext
    ) {
        let burned_shares_amount = coin::value(&shares_to_burn_coin);
        assert!(burned_shares_amount > 0, EInvalidAmount);
        assert!(balance::value(&basket.total_shares) >= burned_shares_amount, EInsufficientShares);

        let current_nav_usdc = get_nav_usdc(basket);
        let total_shares_value = balance::value(&basket.total_shares);
        assert!(total_shares_value > 0, EZeroShares); // Нельзя вывести, если долей нет
        assert!(current_nav_usdc > 0, EZeroNAV); // Нельзя вывести, если NAV равен нулю

        // Рассчитываем количество USDC для возврата на основе текущей NAV на долю.
        let usdc_to_return = (burned_shares_amount * current_nav_usdc) / total_shares_value;
        assert!(balance::value(&basket.usdc_balance) >= usdc_to_return, EInsufficientFunds);

        // Уменьшаем общее количество долей и сжигаем доли пользователя.
        balance::decrease(&mut basket.total_shares, burned_shares_amount);
        coin::burn(&mut basket.share_cap, shares_to_burn_coin);

        // Выделяем USDC из баланса фонда и передаем их отправителю.
        let usdc_to_send = coin::from_balance(balance::split(&mut basket.usdc_balance, usdc_to_return, ctx), ctx);
        transfer::public_transfer(usdc_to_send, tx_context::sender(ctx));

        // Эмитируем событие о выводе средств из фонда
        let asset_type_str = type_name::into_string(type_name::get<sui::usdc::USDC>());
        events::emit_withdraw(tx_context::sender(ctx), usdc_to_return, asset_type_str, burned_shares_amount, tx_context::epoch_timestamp_ms(ctx));
    }

    /// Добавление или обновление баланса актива в корзине (только для менеджера).
    /// Используется для зачисления активов после обмена (swap) или инвестиционных маневров.
    public entry fun update_asset_in_bag<T: store>(
        registry: &Registry, // Добавляем объект реестра для проверки
        _manager_cap: &ManagerCap,
        basket: &mut Basket,
        coin_in: Coin<T>,
    ) {
        assets_registry::assert_is_safe_asset<T>(registry); // Проверяем, что актив в белом списке
        let amount = coin::value(&coin_in);
        assert!(amount > 0, EInvalidAmount);

        let type_key = type_name::get<T>();
        let new_balance = coin::into_balance(coin_in);

        if (bag::contains(&basket.assets, type_key)) {
            // Если актив уже есть в корзине, извлекаем его, объединяем балансы и кладем обратно
            let existing_balance = bag::remove<TypeName, Balance<T>>(&mut basket.assets, type_key);
            balance::join(&mut existing_balance, new_balance);
            bag::add(&mut basket.assets, type_key, existing_balance);
        } else {
            // Если актива нет, просто добавляем новый баланс с ключом его типа
            bag::add(&mut basket.assets, type_key, new_balance);
        }
    }

    /// Извлечение конкретного актива из корзины (только для менеджера).
    /// Используется для получения токенов перед проведением обменов или инвестиций.
    public entry fun withdraw_asset_from_bag<T: store>(
        _manager_cap: &ManagerCap,
        basket: &mut Basket,
        amount: u64,
        ctx: &mut TxContext
    ) {
        let type_key = type_name::get<T>();
        
        // Убеждаемся, что такой актив вообще есть в корзине
        assert!(bag::contains(&basket.assets, type_key), EInsufficientFunds);

        let asset_balance = bag::remove<TypeName, Balance<T>>(&mut basket.assets, type_key);
        
        // Проверяем, достаточно ли средств для вывода
        assert!(balance::value(&asset_balance) >= amount, EInsufficientFunds);

        let withdrawn_balance = balance::split(&mut asset_balance, amount);

        // Если после снятия что-то осталось, возвращаем баланс обратно в Bag
        if (balance::value(&asset_balance) > 0) {
            bag::add(&mut basket.assets, type_key, asset_balance);
        } else {
            balance::destroy_zero(asset_balance);
        };

        let coin_to_send = coin::from_balance(withdrawn_balance, ctx);
        transfer::public_transfer(coin_to_send, tx_context::sender(ctx));
    }

    /// Функция ребалансировки (доступна только менеджеру).
    /// Эта функция обычно корректирует распределение активов в `assets` Bag.
    public entry fun rebalance(
        _manager_cap: &ManagerCap, // ManagerCap гарантирует, что вызовы авторизованы
        _basket: &mut Basket,
        _ctx: &mut TxContext
    ) {
        // TODO: Реализовать логику ребалансировки здесь.
        // Это может включать:
        // 1. Чтение целевых весов активов.
        // 2. Расчет текущих весов активов (требует оракулов для активов, отличных от USDC).
        // 3. Обмен активов в `basket.assets` или `usdc_balance` для достижения целевых весов.
        //    Это, вероятно, потребует взаимодействия с DEX (например, DeepBook/Cetus, как упоминается в SuiFundDashboard.tsx).
    }
}