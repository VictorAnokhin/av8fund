/// Модуль `events` определяет структуры событий, которые эмитируются смарт-контрактами
/// AV8 Capital для информирования внешних приложений (например, React-фронтенда)
/// об изменениях состояния фонда.
module av8_capital::events {
    use sui::object::ID;
    use std::ascii::String;
    use sui::event;

    /// Событие пополнения фонда пользователем.
    /// Эмитируется при успешном внесении средств в фонд.
    struct DepositEvent has copy, drop {
        sender: address,        // Адрес отправителя, который внес средства
        amount: u64,            // Сумма внесенных средств (в базовых единицах)
        asset_type: String,     // Тип актива, который был внесен (например, "USDC")
        shares_issued: u64,     // Количество долей фонда, выпущенных пользователю
        timestamp: u64,         // Временная метка транзакции
    }

    /// Событие вывода средств пользователем из фонда.
    /// Эмитируется при успешном выводе средств из фонда.
    struct WithdrawEvent has copy, drop {
        sender: address,        // Адрес отправителя, который вывел средства
        amount: u64,            // Сумма выведенных средств (в базовых единицах USDC)
        asset_type: String,     // Тип актива, который был выведен (например, "USDC")
        shares_burned: u64,     // Количество долей фонда, сожженных пользователем
        timestamp: u64,         // Временная метка транзакции
    }


    /// Событие успешной ребалансировки портфеля.
    /// Эмитируется после выполнения маневра ребалансировки ИИ-агентом.
    struct PortfolioRebalanced has copy, drop {
        manager: address,       // Адрес менеджера (ИИ-аагента), инициировавшего ребалансировку
        asset_in: String,       // Тип актива, который был продан
        asset_out: String,      // Тип актива, который был куплен
        amount_in: u64,         // Количество проданного актива
        amount_out: u64,        // Количество купленного актива
        drift_bps: u64,         // Отклонение от целевого курса до маневра (в базисных пунктах)
        timestamp: u64,         // Временная метка транзакции
    }

    /// Событие экстренной остановки операций фонда.
    /// Эмитируется в случае критической ситуации, требующей приостановки работы фонда.
    struct EmergencyStop has copy, drop {
        admin: address,         // Адрес администратора, инициировавшего остановку
        reason: String,         // Причина экстренной остановки
        timestamp: u64,         // Временная метка остановки
    }

    /// Функции для вызова из основных модулей (Internal)
    /// Эти функции являются `public(friend)`, что означает, что они могут быть вызваны
    /// только из модулей, объявленных "друзьями" этого модуля.

    public(friend) fun emit_deposit(sender: address, amount: u64, asset_type: String, shares: u64, ts: u64) {
        event::emit(DepositEvent { sender, amount, asset_type, shares_issued: shares, timestamp: ts });
    }

    public(friend) fun emit_rebalance(manager: address, in_type: String, out_type: String, in_amt: u64, out_amt: u64, drift: u64, ts: u64) {
        event::emit(PortfolioRebalanced { manager, asset_in: in_type, asset_out: out_type, amount_in: in_amt, amount_out: out_amt, drift_bps: drift, timestamp: ts });
    }

    public(friend) fun emit_emergency(admin: address, reason: String, ts: u64) {
        event::emit(EmergencyStop { admin, reason, timestamp: ts });
    }

    public(friend) fun emit_withdraw(sender: address, amount: u64, asset_type: String, shares: u64, ts: u64) {
        event::emit(WithdrawEvent { sender, amount, asset_type, shares_burned: shares, timestamp: ts });
    }
}