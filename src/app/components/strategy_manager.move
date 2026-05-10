/// Модуль `strategy_manager` предоставляет функции для автоматизированного управления
/// портфелем фонда AV8 Capital через ИИ-агента.
/// Он позволяет выполнять операции ребалансировки и обмена активами,
/// обеспечивая при этом безопасность и контроль над средствами фонда.
module av8_capital::strategy_manager {
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::coin::{Self, Coin};
    use sui::transfer;
    use sui::bag::{Self, Bag}; // Необходимо для portfolio::Basket
    use sui::balance::{Self, Balance}; // Необходимо для portfolio::Basket
    use std::type_name::{Self, TypeName}; // Необходимо для portfolio::update_asset_in_bag
    use av8_capital::events;
    
    use av8_capital::assets_registry;
    use av8_capital::portfolio::{Self, Basket, ManagerCap as PortfolioManagerCap}; // Алиас для избежания конфликта имен
    // Ошибки системы
    const ENotAuthorized: u64 = 0;
    const EInvalidTradingPair: u64 = 1;
    const ESlippageTooHigh: u64 = 2;
    const ESwapFailed: u64 = 3; // Новая ошибка для неудачного обмена

    /// Объект-ключ (Capability), который хранится на сервере ИИ-агента.
    /// Позволяет вызывать функции ребалансировки, но не функции вывода средств владельца.

    /// Основная функция "Автопилота" для маневров внутри корзины.
    /// В MVP она принимает монеты и возвращает результат обмена для записи в Basket.
    ///
    /// Параметры:
    /// - `_cap`: ManagerCap, подтверждающий авторизацию ИИ-агента.
    /// - `portfolio_manager_cap`: ManagerCap из модуля portfolio, необходимый для вызова функций portfolio.
    /// - `basket`: Мутабельная ссылка на объект Basket фонда.
    /// - `coin_in`: Монета типа X, которую ИИ-агент хочет продать.
    /// - `registry`: Объект реестра активов для проверки белого списка.
    /// - `drift_bps`: Отклонение от целевого курса до маневра (в базисных пунктах).
    /// - `min_amount_out`: Минимальное количество монеты типа Y, которое ИИ-агент ожидает получить.
    /// - `ctx`: Контекст транзакции.
    public entry fun rebalance<X: store, Y: store>(
        _cap: &ManagerCap, // Проверка наличия прав "пилота" для strategy_manager
        portfolio_manager_cap: &PortfolioManagerCap, // Права для взаимодействия с portfolio
        basket: &mut Basket,
        coin_in: Coin&lt;X&gt;,
        registry: &Registry, // Добавляем объект реестра для проверки
        drift_bps: u64, // Отклонение от целевого курса до маневра (в базисных пунктах).
        min_amount_out: u64,
        ctx: &mut TxContext
    ) {
        // 1. Безопасный эшелон: Проверка активов через реестр
        assets_registry::assert_is_safe_asset<X>(registry);
        assets_registry::assert_is_safe_asset<Y>(registry);

        let amount_in = coin::value(&coin_in);
        assert!(amount_in > 0, EInvalidAmount);
        
        // 2. Логика взаимодействия с DEX (например, DeepBook или Cetus)
        // Здесь вызывается внешняя функция обмена из SDK выбранного протокола.
        // Для MVP мы симулируем обмен, возвращая некоторое количество монеты Y.
        // В реальной реализации это будет вызов другого модуля.
        // Например: `let coin_out = deepbook::swap(coin_in, ...);`
        let simulated_amount_out = amount_in; // Простая симуляция: 1:1 обмен
        let coin_out = coin::mint_for_testing<Y>(simulated_amount_out, ctx); // Создаем монету Y для симуляции
        
        // 3. Защита от турбулентности (Slippage Check)
        // Если результат обмена меньше min_amount_out, транзакция должна прерваться.
        assert!(coin::value(&coin_out) >= min_amount_out, ESlippageTooHigh);

        // 4. Запись результата обмена обратно в Basket
        // Используем функцию из модуля portfolio для обновления активов фонда.
        portfolio::update_asset_in_bag(registry, portfolio_manager_cap, basket, coin_out);

        // 5. Уничтожаем coin_in, так как она была "продана"
        coin::destroy_zero(coin_in);

        // 6. Эмитируем событие для "AI Flight Log"
        let asset_in_str = type_name::into_string(type_name::get<X>());
        let asset_out_str = type_name::into_string(type_name::get<Y>());
        let ts = tx_context::epoch_timestamp_ms(ctx);
        events::emit_rebalance(
            tx_context::sender(ctx),
            asset_in_str,
            asset_out_str,
            amount_in,
            simulated_amount_out, // В реальной жизни это будет coin::value(&coin_out)
            drift_bps, // Это значение должно быть рассчитано и передано извне
            ts
        );
    }

    /// Функция для отзыва прав у ИИ-агента (экстренное приземление)
        public fun revoke_manager_cap(cap: ManagerCap) {
            let ManagerCap { id } = cap;
            object::delete(id);
        }
}