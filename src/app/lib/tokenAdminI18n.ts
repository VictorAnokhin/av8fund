export type TokenAdminField = { label: string; help: string };

export type TokenAdminCopy = {
  breadcrumbCurrent: string;
  heroBadge: string;
  title: string;
  subtitle: string;
  admin: {
    title: string;
    body: string;
    walletPrefix: string;
    capPrefix: string;
    notConnected: string;
    notMatched: string;
    shortNotSet: string;
    capsButton: string;
  };
  table: {
    savedTitle: string;
    targetWeightPrefix: string;
    refresh: string;
    colToken: string;
    colCoinType: string;
    colWeights: string;
    colStatus: string;
    colActions: string;
    loading: string;
    empty: string;
    decimalsWord: string;
    targetPrefix: string;
    rangeJoin: string;
    enabled: string;
    disabled: string;
    edit: string;
    deleteAria: string;
  };
  tokenPanel: {
    editTitle: string;
    newTitle: string;
    packagePrefix: string;
    enabled: string;
    saveApi: string;
    saving: string;
    whitelist: string;
    signing: string;
    fields: {
      network: TokenAdminField;
      decimals: TokenAdminField;
      packageId: TokenAdminField;
      coinType: TokenAdminField;
      symbol: TokenAdminField;
      name: TokenAdminField;
      targetBps: TokenAdminField;
      minBps: TokenAdminField;
      maxBps: TokenAdminField;
      priceFeedId: TokenAdminField;
      logoUrl: TokenAdminField;
      notes: TokenAdminField;
    };
  };
  sharePanel: {
    title: string;
    blurb: string;
    refreshAria: string;
    pricingNavPerShare: string;
    pricingManualFloor: string;
    pricingBondingCurve: string;
    pauseMint: string;
    pauseRedeem: string;
    savePolicy: string;
    applyOnChain: string;
    saving: string;
    signing: string;
    fields: {
      network: TokenAdminField;
      pricingModel: TokenAdminField;
      packageId: TokenAdminField;
      shareConfigId: TokenAdminField;
      shareAdminCap: TokenAdminField;
      treasuryCap: TokenAdminField;
      mintFeeBps: TokenAdminField;
      redeemFeeBps: TokenAdminField;
      redeemBurnBps: TokenAdminField;
      priceImpactBps: TokenAdminField;
      minPriceMist: TokenAdminField;
      basePriceMist: TokenAdminField;
      maxSupply: TokenAdminField;
      dailyMintCap: TokenAdminField;
      notes: TokenAdminField;
    };
  };
  rebalance: {
    title: string;
    blurb: string;
    sign: string;
    signing: string;
    fields: {
      assetIn: TokenAdminField;
      assetOut: TokenAdminField;
      amountIn: TokenAdminField;
      navAfterSui: TokenAdminField;
      expectedOut: TokenAdminField;
      actualOut: TokenAdminField;
      tradeBps: TokenAdminField;
      oracleAgeMs: TokenAdminField;
    };
  };
  deployed: {
    title: string;
    registry: string;
    ownerCap: string;
    basket: string;
    managerCap: string;
    strategy: string;
  };
  errors: {
    connectWallet: string;
    notRegisteredAdmin: string;
    fundOwnerCap: string;
    shareSettings: string;
    basketConfig: string;
    missingDigest: string;
    fieldInteger: string;
  };
  notices: {
    assetRegistered: string;
    tokenSaved: string;
    tokenDeleted: string;
    emissionSaved: string;
    shareApplied: string;
    rebalanceRecorded: string;
  };
  txDigestPrefix: string;
  cancelEditAria: string;
};

const field = (label: string, help: string): TokenAdminField => ({ label, help });

export const tokenAdminEn: TokenAdminCopy = {
  breadcrumbCurrent: 'Token administration',
  heroBadge: 'Signed fund admin',
  title: 'Token administration',
  subtitle:
    'Whitelist fund assets, maintain Laravel configuration, and sign strategy operations from an RWA admin wallet.',
  admin: {
    title: 'Admin access',
    body:
      'Access is granted when the connected Sui wallet matches an owner_address saved in rwa_admin_caps. On-chain whitelist and rebalance calls still require the wallet to own the corresponding Move capability object.',
    walletPrefix: 'Wallet:',
    capPrefix: 'RWA AdminCap:',
    notConnected: 'not connected',
    notMatched: 'not matched',
    shortNotSet: 'not set',
    capsButton: 'Admin caps',
  },
  table: {
    savedTitle: 'Saved tokens',
    targetWeightPrefix: 'Active target weight:',
    refresh: 'Refresh',
    colToken: 'Token',
    colCoinType: 'Coin type',
    colWeights: 'Weights',
    colStatus: 'Status',
    colActions: 'Actions',
    loading: 'Loading tokens…',
    empty: 'No tokens saved yet.',
    decimalsWord: 'decimals',
    targetPrefix: 'Target',
    rangeJoin: '–',
    enabled: 'Enabled',
    disabled: 'Disabled',
    edit: 'Edit',
    deleteAria: 'Delete',
  },
  tokenPanel: {
    editTitle: 'Edit token',
    newTitle: 'New token',
    packagePrefix: 'Package',
    enabled: 'Enabled',
    saveApi: 'Save API',
    saving: 'Saving…',
    whitelist: 'Whitelist on-chain',
    signing: 'Signing…',
    fields: {
      network: field(
        'Network',
        'Sui network for this token configuration. It separates testnet, mainnet, and local deployments in Laravel.',
      ),
      decimals: field(
        'Decimals',
        'Token decimal precision used to parse user deposit amounts and display balances correctly.',
      ),
      packageId: field(
        'Package ID',
        'Fund package that owns the registry. Used when filtering backend config and signing whitelist calls.',
      ),
      coinType: field(
        'Coin type',
        'Full Sui coin type, for example 0x2::sui::SUI. This is the canonical asset key for whitelist, balances, and deposits.',
      ),
      symbol: field('Symbol', 'Short ticker shown in admin tables and client deposit selector.'),
      name: field('Name', 'Human-readable asset name shown in admin and portfolio interfaces.'),
      targetBps: field(
        'Target bps',
        'Desired portfolio weight in basis points. 10000 bps equals 100 percent. Used by rebalance logic as the ideal allocation.',
      ),
      minBps: field('Min bps', 'Lowest acceptable allocation before the asset is considered underweight.'),
      maxBps: field('Max bps', 'Highest acceptable allocation before the asset is considered overweight.'),
      priceFeedId: field(
        'Price feed ID',
        'Oracle or price-feed identifier needed to value this asset in NAV and calculate fair AV8 issuance.',
      ),
      logoUrl: field('Logo URL', 'Icon URL used by frontend tables, selectors, and portfolio displays.'),
      notes: field('Notes', 'Operational notes for admins and AI agents. Does not affect on-chain execution.'),
    },
  },
  sharePanel: {
    title: 'AV8 emission policy',
    blurb:
      'Controls backend mint policy. On-chain apply updates redeem burn and global fund_share pause when ShareConfig IDs are set.',
    refreshAria: 'Refresh AV8 settings',
    pricingNavPerShare: 'NAV / supply',
    pricingManualFloor: 'Manual floor',
    pricingBondingCurve: 'Bonding curve',
    pauseMint: 'Pause mint',
    pauseRedeem: 'Pause redeem',
    savePolicy: 'Save policy',
    applyOnChain: 'Apply on-chain',
    saving: 'Saving…',
    signing: 'Signing…',
    fields: {
      network: field(
        'Network',
        'Sui network for AV8 emission policy. Keeps testnet and mainnet rules separate in Laravel.',
      ),
      pricingModel: field(
        'Pricing model',
        'Pricing rule used by backend/admin flows. NAV / supply is the normal fund-share model; other modes are policy placeholders until wired on-chain.',
      ),
      packageId: field(
        'Package ID',
        'Package containing the AV8 fund_share coin and ShareConfig. Needed for signed on-chain settings calls.',
      ),
      shareConfigId: field(
        'ShareConfig ID',
        'Shared on-chain object that stores AV8 emission state, burn settings, pause state, and supply counters.',
      ),
      shareAdminCap: field(
        'ShareAdminCap',
        'Capability object that authorizes the connected admin wallet to change fund_share settings.',
      ),
      treasuryCap: field(
        'TreasuryCap',
        'Treasury capability for minting and burning AV8. Stored here for mint-flow wiring; this form does not expose it to users.',
      ),
      mintFeeBps: field(
        'Mint fee bps',
        'Fee taken from deposits before calculating AV8 issuance. Backend policy until portfolio::deposit mints AV8 directly.',
      ),
      redeemFeeBps: field(
        'Redeem fee bps',
        'Fee applied when AV8 is redeemed. Backend policy for payout calculations and future on-chain redeem flow.',
      ),
      redeemBurnBps: field(
        'Redeem burn bps',
        'Share of redeemed AV8 that is permanently burned. Apply on-chain writes this to fund_share::ShareConfig.',
      ),
      priceImpactBps: field(
        'Price impact bps',
        'Optional issuance haircut for large deposits. It can make bigger mint orders receive fewer AV8 per unit.',
      ),
      minPriceMist: field(
        'Min price MIST',
        'Lowest allowed AV8 mint price in MIST. Prevents issuing too many shares if NAV data is stale or too low.',
      ),
      basePriceMist: field(
        'Base price MIST',
        'Manual reference price in MIST for manual-floor or bonding-curve policies. NAV / supply can ignore it.',
      ),
      maxSupply: field(
        'Max supply',
        'Backend policy cap for total AV8 supply. The hard on-chain max supply is fixed inside fund_share at deployment.',
      ),
      dailyMintCap: field(
        'Daily mint cap',
        'Maximum AV8 that admins or automated flows may mint per day. Used as an operational risk limit.',
      ),
      notes: field(
        'Notes',
        'Emission policy notes for admins and AI agents. Does not change contract behavior by itself.',
      ),
    },
  },
  rebalance: {
    title: 'Record rebalance',
    blurb:
      'This signs strategy_manager::rebalance_stub. It records accounting and NAV events only; real multi-token swaps require the next portfolio/swap-router contract step.',
    sign: 'Sign rebalance',
    signing: 'Signing…',
    fields: {
      assetIn: field(
        'Asset in',
        'Coin type or asset key being sold or reduced during rebalance. Used in the emitted rebalance accounting event.',
      ),
      assetOut: field(
        'Asset out',
        'Coin type or asset key being bought or increased during rebalance. Used in the emitted rebalance accounting event.',
      ),
      amountIn: field(
        'Amount in',
        'Input amount in the smallest unit of the asset. It records how much was used for this rebalance step.',
      ),
      navAfterSui: field(
        'NAV after SUI',
        'Portfolio NAV after rebalance, denominated in MIST/SUI units. It affects future AV8 price calculations.',
      ),
      expectedOut: field(
        'Expected out',
        'Expected output amount from the quote before execution. Used to audit slippage.',
      ),
      actualOut: field(
        'Actual out',
        'Actual received amount after execution. Difference from expected out shows slippage or routing loss.',
      ),
      tradeBps: field(
        'Trade bps',
        'Trade size or slippage metric in basis points, depending on the rebalance policy. 100 bps equals 1 percent.',
      ),
      oracleAgeMs: field(
        'Oracle age ms',
        'Age of the price data used for the rebalance quote. Higher values mean staler pricing.',
      ),
    },
  },
  deployed: {
    title: 'Deployed contract context',
    registry: 'Registry:',
    ownerCap: 'OwnerCap:',
    basket: 'Basket:',
    managerCap: 'ManagerCap:',
    strategy: 'Strategy:',
  },
  errors: {
    connectWallet: 'Connect the Sui admin wallet first.',
    notRegisteredAdmin: 'This wallet is not registered as an RWA AdminCap owner in Laravel.',
    fundOwnerCap: 'Fund package, registry, or assets_registry OwnerCap is not configured.',
    shareSettings: 'Fund package, ShareConfig, or ShareAdminCap is not configured.',
    basketConfig: 'Basket, ManagerCap, or StrategyConfig is not configured.',
    missingDigest: 'Missing transaction digest in wallet response.',
    fieldInteger: '{label} must be an integer.',
  },
  notices: {
    assetRegistered: 'Asset registered on-chain and saved to Laravel API.',
    tokenSaved: 'Token saved to Laravel API.',
    tokenDeleted: '{symbol} deleted from Laravel API.',
    emissionSaved: 'AV8 emission settings saved to Laravel API.',
    shareApplied:
      'AV8 redeem burn and pause state applied on-chain, then saved to Laravel API.',
    rebalanceRecorded: 'Rebalance event recorded on-chain.',
  },
  txDigestPrefix: 'tx:',
  cancelEditAria: 'Cancel editing',
};

export const tokenAdminUa: TokenAdminCopy = {
  breadcrumbCurrent: 'Адміністрування токенів',
  heroBadge: 'Підпис фондового адміна',
  title: 'Адміністрування токенів',
  subtitle:
    'Whitelist активів фонду, налаштування в Laravel і підпис операцій стратегії з гаманця RWA-адміна.',
  admin: {
    title: 'Доступ адміна',
    body:
      'Доступ надається, коли підключений Sui-гаманець збігається з owner_address у rwa_admin_caps. Ончейн-whitelist і rebalance все одно вимагають відповідного capability-об’єкта Move у гаманця.',
    walletPrefix: 'Гаманець:',
    capPrefix: 'RWA AdminCap:',
    notConnected: 'не підключено',
    notMatched: 'не знайдено',
    shortNotSet: 'не задано',
    capsButton: 'Admin caps',
  },
  table: {
    savedTitle: 'Збережені токени',
    targetWeightPrefix: 'Активна цільова вага:',
    refresh: 'Оновити',
    colToken: 'Токен',
    colCoinType: 'Тип монети',
    colWeights: 'Ваги',
    colStatus: 'Статус',
    colActions: 'Дії',
    loading: 'Завантаження токенів…',
    empty: 'Токенів ще немає.',
    decimalsWord: 'децималі',
    targetPrefix: 'Ціль',
    rangeJoin: '–',
    enabled: 'Увімкнено',
    disabled: 'Вимкнено',
    edit: 'Редагувати',
    deleteAria: 'Видалити',
  },
  tokenPanel: {
    editTitle: 'Редагувати токен',
    newTitle: 'Новий токен',
    packagePrefix: 'Пакет',
    enabled: 'Увімкнено',
    saveApi: 'Зберегти в API',
    saving: 'Збереження…',
    whitelist: 'Whitelist ончейн',
    signing: 'Підпис…',
    fields: {
      network: field(
        'Мережа',
        'Мережа Sui для цього конфігу токена. Розділяє testnet, mainnet і локальні деплої в Laravel.',
      ),
      decimals: field(
        'Децималі',
        'Точність токена для розбору сум депозиту та відображення балансів.',
      ),
      packageId: field(
        'ID пакета',
        'Пакет фонду, що володіє реєстром. Використовується для фільтрації бекенду та викликів whitelist.',
      ),
      coinType: field(
        'Тип монети (coin type)',
        'Повний Sui coin type, наприклад 0x2::sui::SUI. Канонічний ключ для whitelist, балансів і депозитів.',
      ),
      symbol: field('Символ', 'Короткий тикер у таблицях адмінки та селекторі депозиту.'),
      name: field('Назва', 'Людськочитана назва активу в адмінці та портфелі.'),
      targetBps: field(
        'Цільові bps',
        'Цільова вага портфеля в базисних пунктах. 10000 bps = 100%. Використовується логікою ребалансу.',
      ),
      minBps: field('Мін. bps', 'Найнижча прийнятна вага до статусу «недовага».'),
      maxBps: field('Макс. bps', 'Найвища прийнятна вага до статусу «перевага».'),
      priceFeedId: field(
        'ID прайс-фіду',
        'Ідентифікатор оракула/фіду для оцінки активу в NAV та справедливого випуску AV8.',
      ),
      logoUrl: field('URL логотипу', 'Іконка для таблиць, селекторів і портфеля.'),
      notes: field('Нотатки', 'Операційні нотатки для адмінів. На виконання ончейн не впливають.'),
    },
  },
  sharePanel: {
    title: 'Політика емісії AV8',
    blurb:
      'Керує бекенд-політикою карбування. Ончейн «Застосувати» оновлює redeem burn і глобальну паузу fund_share, якщо задані ShareConfig.',
    refreshAria: 'Оновити налаштування AV8',
    pricingNavPerShare: 'NAV / пропозиція',
    pricingManualFloor: 'Ручна підлога',
    pricingBondingCurve: 'Крива бондингу',
    pauseMint: 'Пауза карбування',
    pauseRedeem: 'Пауза викупу',
    savePolicy: 'Зберегти політику',
    applyOnChain: 'Застосувати ончейн',
    saving: 'Збереження…',
    signing: 'Підпис…',
    fields: {
      network: field(
        'Мережа',
        'Мережа Sui для політики емісії AV8. Розділяє правила testnet і mainnet у Laravel.',
      ),
      pricingModel: field(
        'Модель ціноутворення',
        'Правило для бекенд/адмін-потоків. NAV / supply — типова модель частки фонду; інші режими — заглушки до ончейн-інтеграції.',
      ),
      packageId: field(
        'ID пакета',
        'Пакет із AV8 fund_share і ShareConfig. Потрібен для підписаних ончейн-викликів налаштувань.',
      ),
      shareConfigId: field(
        'ShareConfig ID',
        'Спільний ончейн-об’єкт: стан емісії AV8, burn, пауза, лічильники пропозиції.',
      ),
      shareAdminCap: field(
        'ShareAdminCap',
        'Capability, що дозволяє підключеному адміну змінювати fund_share.',
      ),
      treasuryCap: field(
        'TreasuryCap',
        'Treasury для карбування/спалювання AV8. Зберігається для дротування mint-потоку; користувачам не показується.',
      ),
      mintFeeBps: field(
        'Комісія карбування (bps)',
        'Комісія з депозитів до розрахунку випуску AV8. Політика бекенду до portfolio::deposit.',
      ),
      redeemFeeBps: field(
        'Комісія викупу (bps)',
        'Комісія при викупі AV8. Бекенд для виплат і майбутнього ончейн-redeem.',
      ),
      redeemBurnBps: field(
        'Спалення при викупі (bps)',
        'Частка викупленого AV8, що спалюється назавжди. Ончейн запис у fund_share::ShareConfig.',
      ),
      priceImpactBps: field(
        'Ціновий вплив (bps)',
        'Опційна знижка випуску на великі депозити (менше AV8 на одиницю).',
      ),
      minPriceMist: field(
        'Мін. ціна MIST',
        'Найнижча дозволена ціна карбування AV8 у MIST. Захист від застарілого NAV.',
      ),
      basePriceMist: field(
        'Базова ціна MIST',
        'Опорна ціна в MIST для ручної підлоги/кривої; NAV / supply може її ігнорувати.',
      ),
      maxSupply: field(
        'Макс. пропозиція',
        'Бекенд-обмеження загального AV8. Жорсткий максимум фіксується в fund_share при деплої.',
      ),
      dailyMintCap: field(
        'Денний ліміт карбування',
        'Максимум AV8 для карбування на день. Операційний ліміт ризику.',
      ),
      notes: field(
        'Нотатки',
        'Нотатки щодо емісії. Самі по собі контракт не змінюють.',
      ),
    },
  },
  rebalance: {
    title: 'Записати ребаланс',
    blurb:
      'Підписує strategy_manager::rebalance_stub. Лише облік і події NAV; реальні свапи кількох токенів — наступний крок роутера.',
    sign: 'Підписати ребаланс',
    signing: 'Підпис…',
    fields: {
      assetIn: field(
        'Актив (вхід)',
        'Тип монети, що зменшується під час ребалансу. Для події обліку.',
      ),
      assetOut: field(
        'Актив (вихід)',
        'Тип монети, що збільшується під час ребалансу.',
      ),
      amountIn: field(
        'Сума (вхід)',
        'Вхідна сума в найменших одиницях активу для цього кроку.',
      ),
      navAfterSui: field(
        'NAV після SUI',
        'NAV портфеля після ребалансу в одиницях MIST/SUI. Впливає на майбутню ціну AV8.',
      ),
      expectedOut: field(
        'Очікуваний вихід',
        'Очікуваний обсяг за котируванням до виконання. Для аудиту проскальзування.',
      ),
      actualOut: field(
        'Фактичний вихід',
        'Фактично отримано. Різниця з очікуваним — проскальзування або втрати маршруту.',
      ),
      tradeBps: field(
        'Угода (bps)',
        'Метрика розміру угоди або проскальзування в bps. 100 bps = 1%.',
      ),
      oracleAgeMs: field(
        'Вік оракула (мс)',
        'Вік цінових даних для котирування. Більше — застаріліше.',
      ),
    },
  },
  deployed: {
    title: 'Контекст задеплоєних контрактів',
    registry: 'Реєстр:',
    ownerCap: 'OwnerCap:',
    basket: 'Кошик:',
    managerCap: 'ManagerCap:',
    strategy: 'Стратегія:',
  },
  errors: {
    connectWallet: 'Спочатку підключіть Sui-гаманець адміна.',
    notRegisteredAdmin: 'Цей гаманець не зареєстрований як власник RWA AdminCap у Laravel.',
    fundOwnerCap: 'Не налаштовано пакет фонду, реєстр або OwnerCap assets_registry.',
    shareSettings: 'Не налаштовано пакет, ShareConfig або ShareAdminCap.',
    basketConfig: 'Не налаштовано кошик, ManagerCap або StrategyConfig.',
    missingDigest: 'У відповіді гаманця немає digest транзакції.',
    fieldInteger: 'Поле «{label}» має бути цілим числом.',
  },
  notices: {
    assetRegistered: 'Актив зареєстровано ончейн і збережено в Laravel API.',
    tokenSaved: 'Токен збережено в Laravel API.',
    tokenDeleted: '{symbol} видалено з Laravel API.',
    emissionSaved: 'Налаштування емісії AV8 збережено в Laravel API.',
    shareApplied:
      'Redeem burn і паузу застосовано ончейн, потім збережено в Laravel API.',
    rebalanceRecorded: 'Подію ребалансу записано ончейн.',
  },
  txDigestPrefix: 'tx:',
  cancelEditAria: 'Скасувати редагування',
};

export const tokenAdminRu: TokenAdminCopy = {
  breadcrumbCurrent: 'Администрирование токенов',
  heroBadge: 'Подпись фондового админа',
  title: 'Администрирование токенов',
  subtitle:
    'Whitelist активов фонда, настройки в Laravel и подпись операций стратегии с кошелька RWA-админа.',
  admin: {
    title: 'Доступ админа',
    body:
      'Доступ выдаётся, когда подключённый Sui-кошелёк совпадает с owner_address в rwa_admin_caps. Ончейн-whitelist и rebalance всё равно требуют соответствующего capability-объекта Move у кошелька.',
    walletPrefix: 'Кошелёк:',
    capPrefix: 'RWA AdminCap:',
    notConnected: 'не подключён',
    notMatched: 'не найден',
    shortNotSet: 'не задано',
    capsButton: 'Admin caps',
  },
  table: {
    savedTitle: 'Сохранённые токены',
    targetWeightPrefix: 'Активная целевая доля:',
    refresh: 'Обновить',
    colToken: 'Токен',
    colCoinType: 'Тип монеты',
    colWeights: 'Веса',
    colStatus: 'Статус',
    colActions: 'Действия',
    loading: 'Загрузка токенов…',
    empty: 'Токенов пока нет.',
    decimalsWord: 'десятичные',
    targetPrefix: 'Цель',
    rangeJoin: '–',
    enabled: 'Включён',
    disabled: 'Выключен',
    edit: 'Изменить',
    deleteAria: 'Удалить',
  },
  tokenPanel: {
    editTitle: 'Редактировать токен',
    newTitle: 'Новый токен',
    packagePrefix: 'Пакет',
    enabled: 'Включено',
    saveApi: 'Сохранить в API',
    saving: 'Сохранение…',
    whitelist: 'Whitelist ончейн',
    signing: 'Подпись…',
    fields: {
      network: field(
        'Сеть',
        'Сеть Sui для этой конфигурации токена. Разделяет testnet, mainnet и локальные деплои в Laravel.',
      ),
      decimals: field(
        'Десятичные',
        'Точность токена для разбора сумм депозита и отображения балансов.',
      ),
      packageId: field(
        'ID пакета',
        'Пакет фонда, владеющий реестром. Используется для фильтрации бэкенда и вызовов whitelist.',
      ),
      coinType: field(
        'Тип монеты',
        'Полный Sui coin type, например 0x2::sui::SUI. Канонический ключ для whitelist, балансов и депозитов.',
      ),
      symbol: field('Символ', 'Короткий тикер в таблицах админки и селекторе депозита.'),
      name: field('Название', 'Человекочитаемое имя актива в админке и портфеле.'),
      targetBps: field(
        'Целевые bps',
        'Желаемая доля портфеля в базисных пунктах. 10000 bps = 100%. Используется логикой ребаланса.',
      ),
      minBps: field('Мин. bps', 'Нижняя допустимая доля до статуса «недовес».'),
      maxBps: field('Макс. bps', 'Верхняя допустимая доля до статуса «перевес».'),
      priceFeedId: field(
        'ID прайс-фида',
        'Идентификатор оракула/фида для оценки актива в NAV и справедливого выпуска AV8.',
      ),
      logoUrl: field('URL логотипа', 'Иконка для таблиц, селекторов и портфеля.'),
      notes: field('Заметки', 'Операционные заметки для админов. На ончейн-выполнение не влияют.'),
    },
  },
  sharePanel: {
    title: 'Политика эмиссии AV8',
    blurb:
      'Управляет бэкенд-политикой чеканки. Ончейн «Применить» обновляет redeem burn и глобальную паузу fund_share при заданных ShareConfig.',
    refreshAria: 'Обновить настройки AV8',
    pricingNavPerShare: 'NAV / предложение',
    pricingManualFloor: 'Ручной пол',
    pricingBondingCurve: 'Кривая бондинга',
    pauseMint: 'Пауза чеканки',
    pauseRedeem: 'Пауза выкупа',
    savePolicy: 'Сохранить политику',
    applyOnChain: 'Применить ончейн',
    saving: 'Сохранение…',
    signing: 'Подпись…',
    fields: {
      network: field(
        'Сеть',
        'Сеть Sui для политики эмиссии AV8. Разделяет правила testnet и mainnet в Laravel.',
      ),
      pricingModel: field(
        'Модель ценообразования',
        'Правило для бэкенд/админ-потоков. NAV / supply — типовая модель доли фонда; другие режимы — заглушки до ончейн-интеграции.',
      ),
      packageId: field(
        'ID пакета',
        'Пакет с AV8 fund_share и ShareConfig. Нужен для подписанных ончейн-вызовов настроек.',
      ),
      shareConfigId: field(
        'ShareConfig ID',
        'Общий ончейн-объект: состояние эмиссии AV8, burn, пауза, счётчики предложения.',
      ),
      shareAdminCap: field(
        'ShareAdminCap',
        'Capability, позволяющее подключённому админу менять fund_share.',
      ),
      treasuryCap: field(
        'TreasuryCap',
        'Treasury для чеканки/сжигания AV8. Хранится для подключения mint-потока; пользователям не показывается.',
      ),
      mintFeeBps: field(
        'Комиссия чеканки (bps)',
        'Комиссия с депозитов до расчёта выпуска AV8. Политика бэкенда до portfolio::deposit.',
      ),
      redeemFeeBps: field(
        'Комиссия выкупа (bps)',
        'Комиссия при выкупе AV8. Бэкенд для выплат и будущего ончейн-redeem.',
      ),
      redeemBurnBps: field(
        'Сжигание при выкупе (bps)',
        'Доля выкупленного AV8, сжигаемая навсегда. Ончейн-запись в fund_share::ShareConfig.',
      ),
      priceImpactBps: field(
        'Ценовое влияние (bps)',
        'Опциональная скидка выпуска на крупные депозиты (меньше AV8 на единицу).',
      ),
      minPriceMist: field(
        'Мин. цена MIST',
        'Нижняя допустимая цена чеканки AV8 в MIST. Защита от устаревшего NAV.',
      ),
      basePriceMist: field(
        'Базовая цена MIST',
        'Опорная цена в MIST для ручного пола/кривой; NAV / supply может её игнорировать.',
      ),
      maxSupply: field(
        'Макс. предложение',
        'Бэкенд-лимит общего AV8. Жёсткий максимум фиксируется в fund_share при деплое.',
      ),
      dailyMintCap: field(
        'Дневной лимит чеканки',
        'Максимум AV8 для чеканки в день. Операционный лимит риска.',
      ),
      notes: field(
        'Заметки',
        'Заметки по эмиссии. Сами по себе контракт не меняют.',
      ),
    },
  },
  rebalance: {
    title: 'Записать ребаланс',
    blurb:
      'Подписывает strategy_manager::rebalance_stub. Только учёт и события NAV; реальные свопы нескольких токенов — следующий шаг роутера.',
    sign: 'Подписать ребаланс',
    signing: 'Подпись…',
    fields: {
      assetIn: field(
        'Актив (вход)',
        'Тип монеты, уменьшаемый при ребалансе. Для события учёта.',
      ),
      assetOut: field(
        'Актив (выход)',
        'Тип монеты, увеличиваемый при ребалансе.',
      ),
      amountIn: field(
        'Сумма (вход)',
        'Входная сумма в наименьших единицах актива для этого шага.',
      ),
      navAfterSui: field(
        'NAV после SUI',
        'NAV портфеля после ребаланса в единицах MIST/SUI. Влияет на будущую цену AV8.',
      ),
      expectedOut: field(
        'Ожидаемый выход',
        'Ожидаемый объём по котировке до исполнения. Для аудита проскальзывания.',
      ),
      actualOut: field(
        'Фактический выход',
        'Фактически получено. Разница с ожидаемым — проскальзывание или потери маршрута.',
      ),
      tradeBps: field(
        'Сделка (bps)',
        'Метрика размера сделки или проскальзывания в bps. 100 bps = 1%.',
      ),
      oracleAgeMs: field(
        'Возраст оракула (мс)',
        'Возраст ценовых данных для котировки. Больше — старее.',
      ),
    },
  },
  deployed: {
    title: 'Контекст задеплоенных контрактов',
    registry: 'Реестр:',
    ownerCap: 'OwnerCap:',
    basket: 'Корзина:',
    managerCap: 'ManagerCap:',
    strategy: 'Стратегия:',
  },
  errors: {
    connectWallet: 'Сначала подключите Sui-кошелёк админа.',
    notRegisteredAdmin: 'Этот кошелёк не зарегистрирован как владелец RWA AdminCap в Laravel.',
    fundOwnerCap: 'Не настроены пакет фонда, реестр или OwnerCap assets_registry.',
    shareSettings: 'Не настроены пакет, ShareConfig или ShareAdminCap.',
    basketConfig: 'Не настроены корзина, ManagerCap или StrategyConfig.',
    missingDigest: 'В ответе кошелька нет digest транзакции.',
    fieldInteger: 'Поле «{label}» должно быть целым числом.',
  },
  notices: {
    assetRegistered: 'Актив зарегистрирован ончейн и сохранён в Laravel API.',
    tokenSaved: 'Токен сохранён в Laravel API.',
    tokenDeleted: '{symbol} удалён из Laravel API.',
    emissionSaved: 'Настройки эмиссии AV8 сохранены в Laravel API.',
    shareApplied:
      'Redeem burn и паузу применили ончейн, затем сохранили в Laravel API.',
    rebalanceRecorded: 'Событие ребаланса записано ончейн.',
  },
  txDigestPrefix: 'tx:',
  cancelEditAria: 'Отменить редактирование',
};
