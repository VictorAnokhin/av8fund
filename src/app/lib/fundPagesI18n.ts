export type FundBasketCopy = {
  breadcrumb: string;
  heroBadge: string;
  title: string;
  subtitle: string;
  managerWallet: string;
  notConnected: string;
  refresh: string;
  noticeRecorded: string;
  txPrefix: string;
  nav: string;
  liquidSui: string;
  managedValue: string;
  suiSuffix: string;
  loadingEllipsis: string;
  vaultsTitle: string;
  vaultsSubtitle: string;
  vaultsCount: string;
  colToken: string;
  colVault: string;
  colKind: string;
  colBalance: string;
  colValue: string;
  colAction: string;
  vaultsEmpty: string;
  use: string;
  managedActionTitle: string;
  whitelistedToken: string;
  vaultObjectId: string;
  amount: string;
  valueInSui: string;
  positionKind: string;
  recipientWithdraw: string;
  createVault: string;
  setValue: string;
  deposit: string;
  withdraw: string;
  placeholderAmount: string;
  placeholderValueSui: string;
  placeholderPositionKind: string;
  placeholderVaultId: string;
  placeholderRecipient: string;
  externalTitle: string;
  colPosition: string;
  colProtocol: string;
  colAsset: string;
  colAmount: string;
  colValueShort: string;
  colStatus: string;
  externalEmpty: string;
  statusActive: string;
  statusClosed: string;
  placeholderPositionId: string;
  placeholderLp: string;
  placeholderProtocol: string;
  placeholderPrimaryAsset: string;
  placeholderWorkingToken: string;
  placeholderExternalObjectId: string;
  placeholderRawAmount: string;
  placeholderPrincipalSui: string;
  placeholderCurrentSui: string;
  activePosition: string;
  savePosition: string;
  close: string;
  selectToken: string;
  notAvailableShort: string;
  errors: {
    u64Integer: string;
    missingDigest: string;
    connectManagerWallet: string;
    envConfigMissing: string;
    pickTokenConnect: string;
    vaultIdRequired: string;
    fillAmountValueSui: string;
    pickTokenVault: string;
    recipientRequired: string;
    valueSuiRequired: string;
  };
};

export type FundAccountsCopy = {
  breadcrumb: string;
  heroBadge: string;
  title: string;
  subtitle: string;
  contracts: string;
  basketShareLine: string;
  refresh: string;
  errorNotConfigured: string;
  statLiquidSui: string;
  statLiquidNote: string;
  statNav: string;
  statNavNote: string;
  statAv8Circulating: string;
  statAv8Note: string;
  statNetInvestor: string;
  statNetInvestorNote: string;
  loading: string;
  zeroSui: string;
  zeroAv8: string;
  investorLedger: string;
  ledgerSubtitle: string;
  addressesCount: string;
  colInvestor: string;
  colDeposited: string;
  colWithdrawn: string;
  colAv8Minted: string;
  colAv8Burned: string;
  colNetAv8: string;
  colOps: string;
  loadingInvestorEvents: string;
  noDepositWithdrawYet: string;
  opsInOut: string;
  fundState: string;
  labelBasket: string;
  labelAv8MintRedeem: string;
  labelRedeemBurn: string;
  labelMaxAv8: string;
  labelTreasurySupply: string;
  paused: string;
  live: string;
  recentOperations: string;
  loadingEvents: string;
  noEventsYet: string;
  deposit: string;
  withdraw: string;
  burnedSuffix: string;
  pendingTimestamp: string;
  notAvailableShort: string;
};

const fb = (s: FundBasketCopy): FundBasketCopy => s;
const fa = (s: FundAccountsCopy): FundAccountsCopy => s;

export const fundBasketEn: FundBasketCopy = fb({
  breadcrumb: 'Fund basket',
  heroBadge: 'Portfolio operations',
  title: 'Fund basket',
  subtitle:
    'Admin view for adding whitelisted tokens to the portfolio, managing vaults, and recording external LP / working-token positions.',
  managerWallet: 'Manager wallet',
  notConnected: 'Not connected',
  refresh: 'Refresh',
  noticeRecorded: 'Operation recorded on-chain.',
  txPrefix: 'tx:',
  nav: 'NAV',
  liquidSui: 'Liquid SUI',
  managedValue: 'Managed value',
  suiSuffix: ' SUI',
  loadingEllipsis: '...',
  vaultsTitle: 'Vaults',
  vaultsSubtitle: 'Live portfolio vaults for whitelisted tokens.',
  vaultsCount: '{count} vaults',
  colToken: 'Token',
  colVault: 'Vault',
  colKind: 'Kind',
  colBalance: 'Balance',
  colValue: 'Value',
  colAction: 'Action',
  vaultsEmpty: 'No vaults yet.',
  use: 'Use',
  managedActionTitle: 'Managed token action',
  whitelistedToken: 'Whitelisted token',
  vaultObjectId: 'Vault object ID',
  amount: 'Amount',
  valueInSui: 'Value in SUI',
  positionKind: 'Position kind',
  recipientWithdraw: 'Recipient for withdraw',
  createVault: 'Create vault',
  setValue: 'Set value',
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  placeholderAmount: '10.5',
  placeholderValueSui: '10.5',
  placeholderPositionKind: 'coin / lp / lending',
  placeholderVaultId: '0x...',
  placeholderRecipient: '0x...',
  externalTitle: 'External / LP positions',
  colPosition: 'Position',
  colProtocol: 'Protocol',
  colAsset: 'Asset',
  colAmount: 'Amount',
  colValueShort: 'Value',
  colStatus: 'Status',
  externalEmpty: 'No external positions tracked yet.',
  statusActive: 'Active',
  statusClosed: 'Closed',
  placeholderPositionId: 'position id, e.g. cetus-sui-usdc-1',
  placeholderLp: 'lp',
  placeholderProtocol: 'Cetus / Turbos',
  placeholderPrimaryAsset: 'primary whitelisted asset type',
  placeholderWorkingToken: 'LP / working token type',
  placeholderExternalObjectId: 'external protocol object id',
  placeholderRawAmount: 'raw amount',
  placeholderPrincipalSui: 'principal SUI',
  placeholderCurrentSui: 'current SUI',
  activePosition: 'Active position',
  savePosition: 'Save position',
  close: 'Close',
  selectToken: 'Select token',
  notAvailableShort: 'n/a',
  errors: {
    u64Integer: '{label}: enter a whole number in the smallest token units.',
    missingDigest: 'Transaction finished without digest.',
    connectManagerWallet: 'Connect the manager Sui wallet.',
    envConfigMissing: '.env must include packageId, managerCapId, registryId, and basketId.',
    pickTokenConnect: 'Select a token and connect your wallet.',
    vaultIdRequired: 'Enter the vault object ID.',
    fillAmountValueSui: 'Fill in amount and value in SUI.',
    pickTokenVault: 'Select a token and vault.',
    recipientRequired: 'Enter recipient.',
    valueSuiRequired: 'Enter value in SUI.',
  },
});

export const fundBasketUa: FundBasketCopy = fb({
  breadcrumb: 'Кошик фонду',
  heroBadge: 'Операції портфеля',
  title: 'Кошик фонду',
  subtitle:
    'Адмінський екран для додавання токенів з whitelist у portfolio, керування vault та обліку зовнішніх LP/working-token позицій.',
  managerWallet: 'Гаманець менеджера',
  notConnected: 'Не підключено',
  refresh: 'Оновити',
  noticeRecorded: 'Операцію записано on-chain.',
  txPrefix: 'tx:',
  nav: 'NAV',
  liquidSui: 'Ліквідний SUI',
  managedValue: 'Керована вартість',
  suiSuffix: ' SUI',
  loadingEllipsis: '...',
  vaultsTitle: 'Vault',
  vaultsSubtitle: 'Фактичні контейнери portfolio для токенів з whitelist.',
  vaultsCount: '{count} vaults',
  colToken: 'Токен',
  colVault: 'Vault',
  colKind: 'Тип',
  colBalance: 'Баланс',
  colValue: 'Вартість',
  colAction: 'Дія',
  vaultsEmpty: 'Vault ще не створені.',
  use: 'Обрати',
  managedActionTitle: 'Дія з керованим токеном',
  whitelistedToken: 'Токен з whitelist',
  vaultObjectId: 'Object ID vault',
  amount: 'Сума',
  valueInSui: 'Вартість у SUI',
  positionKind: 'Тип позиції',
  recipientWithdraw: 'Отримувач для виводу',
  createVault: 'Створити vault',
  setValue: 'Задати вартість',
  deposit: 'Депозит',
  withdraw: 'Вивід',
  placeholderAmount: '10.5',
  placeholderValueSui: '10.5',
  placeholderPositionKind: 'coin / lp / lending',
  placeholderVaultId: '0x...',
  placeholderRecipient: '0x...',
  externalTitle: 'Зовнішні / LP позиції',
  colPosition: 'Позиція',
  colProtocol: 'Протокол',
  colAsset: 'Актив',
  colAmount: 'Кількість',
  colValueShort: 'Вартість',
  colStatus: 'Статус',
  externalEmpty: 'Зовнішні позиції ще не відстежуються.',
  statusActive: 'Активна',
  statusClosed: 'Закрита',
  placeholderPositionId: 'id позиції, напр. cetus-sui-usdc-1',
  placeholderLp: 'lp',
  placeholderProtocol: 'Cetus / Turbos',
  placeholderPrimaryAsset: 'основний тип активу з whitelist',
  placeholderWorkingToken: 'тип LP / робочого токена',
  placeholderExternalObjectId: 'id об’єкта в протоколі',
  placeholderRawAmount: 'сума в найменших одиницях',
  placeholderPrincipalSui: 'principal SUI',
  placeholderCurrentSui: 'поточний SUI',
  activePosition: 'Активна позиція',
  savePosition: 'Зберегти позицію',
  close: 'Закрити',
  selectToken: 'Оберіть токен',
  notAvailableShort: 'н/д',
  errors: {
    u64Integer: '{label}: потрібне ціле число в мінімальних одиницях токена.',
    missingDigest: 'Транзакція завершилася без digest.',
    connectManagerWallet: 'Підключіть Sui-гаманець менеджера.',
    envConfigMissing: 'У .env мають бути packageId, managerCapId, registryId та basketId.',
    pickTokenConnect: 'Оберіть токен і підключіть гаманець.',
    vaultIdRequired: 'Вкажіть object ID vault.',
    fillAmountValueSui: 'Заповніть amount та value in SUI.',
    pickTokenVault: 'Оберіть токен і vault.',
    recipientRequired: 'Вкажіть отримувача.',
    valueSuiRequired: 'Вкажіть value in SUI.',
  },
});

export const fundBasketRu: FundBasketCopy = fb({
  breadcrumb: 'Корзина фонда',
  heroBadge: 'Операции портфеля',
  title: 'Корзина фонда',
  subtitle:
    'Админский экран для добавления токенов из whitelist в portfolio, управления vault и учёта внешних LP/working-token позиций.',
  managerWallet: 'Кошелёк менеджера',
  notConnected: 'Не подключён',
  refresh: 'Обновить',
  noticeRecorded: 'Операция записана on-chain.',
  txPrefix: 'tx:',
  nav: 'NAV',
  liquidSui: 'Ликвидный SUI',
  managedValue: 'Управляемая стоимость',
  suiSuffix: ' SUI',
  loadingEllipsis: '...',
  vaultsTitle: 'Vault',
  vaultsSubtitle: 'Фактические контейнеры portfolio для токенов из whitelist.',
  vaultsCount: '{count} vaults',
  colToken: 'Токен',
  colVault: 'Vault',
  colKind: 'Тип',
  colBalance: 'Баланс',
  colValue: 'Стоимость',
  colAction: 'Действие',
  vaultsEmpty: 'Vault ещё не созданы.',
  use: 'Выбрать',
  managedActionTitle: 'Действие с управляемым токеном',
  whitelistedToken: 'Токен из whitelist',
  vaultObjectId: 'Object ID vault',
  amount: 'Сумма',
  valueInSui: 'Стоимость в SUI',
  positionKind: 'Тип позиции',
  recipientWithdraw: 'Получатель для вывода',
  createVault: 'Создать vault',
  setValue: 'Задать стоимость',
  deposit: 'Депозит',
  withdraw: 'Вывод',
  placeholderAmount: '10.5',
  placeholderValueSui: '10.5',
  placeholderPositionKind: 'coin / lp / lending',
  placeholderVaultId: '0x...',
  placeholderRecipient: '0x...',
  externalTitle: 'Внешние / LP позиции',
  colPosition: 'Позиция',
  colProtocol: 'Протокол',
  colAsset: 'Актив',
  colAmount: 'Количество',
  colValueShort: 'Стоимость',
  colStatus: 'Статус',
  externalEmpty: 'Внешние позиции пока не отслеживаются.',
  statusActive: 'Активна',
  statusClosed: 'Закрыта',
  placeholderPositionId: 'id позиции, напр. cetus-sui-usdc-1',
  placeholderLp: 'lp',
  placeholderProtocol: 'Cetus / Turbos',
  placeholderPrimaryAsset: 'основной тип актива из whitelist',
  placeholderWorkingToken: 'тип LP / рабочего токена',
  placeholderExternalObjectId: 'id объекта в протоколе',
  placeholderRawAmount: 'сырое количество',
  placeholderPrincipalSui: 'principal SUI',
  placeholderCurrentSui: 'текущий SUI',
  activePosition: 'Активная позиция',
  savePosition: 'Сохранить позицию',
  close: 'Закрыть',
  selectToken: 'Выберите токен',
  notAvailableShort: 'н/д',
  errors: {
    u64Integer: '{label}: нужно целое число в минимальных единицах токена.',
    missingDigest: 'Транзакция завершилась без digest.',
    connectManagerWallet: 'Подключите Sui-кошелёк менеджера.',
    envConfigMissing: 'В .env должны быть packageId, managerCapId, registryId и basketId.',
    pickTokenConnect: 'Выберите токен и подключите кошелёк.',
    vaultIdRequired: 'Укажите vault object ID.',
    fillAmountValueSui: 'Заполните amount и value in SUI.',
    pickTokenVault: 'Выберите токен и vault.',
    recipientRequired: 'Укажите получателя.',
    valueSuiRequired: 'Укажите value in SUI.',
  },
});

export const fundAccountsEn: FundAccountsCopy = fa({
  breadcrumb: 'Fund accounts',
  heroBadge: 'Sui accounting',
  title: 'Fund accounts',
  subtitle: 'Operations view for SUI in the fund, AV8 issuance, and investor addresses from on-chain events.',
  contracts: 'Contracts',
  basketShareLine: 'Basket {basket} · ShareConfig {share}',
  refresh: 'Refresh',
  errorNotConfigured: 'Fund package, Basket, or ShareConfig is not configured.',
  statLiquidSui: 'Liquid SUI',
  statLiquidNote: 'SUI held in Basket.sui_vault and available for redemption.',
  statNav: 'NAV',
  statNavNote: 'Current on-chain NAV on the Basket object.',
  statAv8Circulating: 'AV8 circulating',
  statAv8Note: 'Minted minus burned per ShareConfig counters.',
  statNetInvestor: 'Net investor SUI',
  statNetInvestorNote: 'Net deposits reconstructed from recent deposit/withdraw events.',
  loading: 'Loading...',
  zeroSui: '0 SUI',
  zeroAv8: '0 AV8',
  investorLedger: 'Investor ledger',
  ledgerSubtitle: 'Balances reconstructed from the latest fund events.',
  addressesCount: '{count} addresses',
  colInvestor: 'Investor',
  colDeposited: 'Deposited',
  colWithdrawn: 'Withdrawn',
  colAv8Minted: 'AV8 minted',
  colAv8Burned: 'AV8 burned',
  colNetAv8: 'Net AV8',
  colOps: 'Ops',
  loadingInvestorEvents: 'Loading investor events...',
  noDepositWithdrawYet: 'No deposit or withdraw events yet.',
  opsInOut: '{deposits} in · {withdrawals} out',
  fundState: 'Fund state',
  labelBasket: 'Basket',
  labelAv8MintRedeem: 'AV8 mint / redeem',
  labelRedeemBurn: 'Redeem burn',
  labelMaxAv8: 'Max AV8',
  labelTreasurySupply: 'Treasury supply',
  paused: 'Paused',
  live: 'Live',
  recentOperations: 'Recent operations',
  loadingEvents: 'Loading events...',
  noEventsYet: 'No events yet.',
  deposit: 'Deposit',
  withdraw: 'Withdraw',
  burnedSuffix: 'burned',
  pendingTimestamp: 'pending timestamp',
  notAvailableShort: 'n/a',
});

export const fundAccountsUa: FundAccountsCopy = fa({
  breadcrumb: 'Рахунки фонду',
  heroBadge: 'Облік Sui',
  title: 'Рахунки фонду',
  subtitle: 'Операційний екран для контролю SUI у фонді, емісії AV8 та адрес інвесторів за on-chain подіями.',
  contracts: 'Контракти',
  basketShareLine: 'Basket {basket} · ShareConfig {share}',
  refresh: 'Оновити',
  errorNotConfigured: 'Не налаштовано пакет фонду, Basket або ShareConfig.',
  statLiquidSui: 'Ліквідний SUI',
  statLiquidNote: 'SUI в Basket.sui_vault, доступний для викупу.',
  statNav: 'NAV',
  statNavNote: 'Поточний on-chain NAV на об’єкті Basket.',
  statAv8Circulating: 'AV8 в обігу',
  statAv8Note: 'Змінта мінус спалення за лічильниками ShareConfig.',
  statNetInvestor: 'Чистий SUI інвесторів',
  statNetInvestorNote: 'Чисті депозити відновлені з останніх подій deposit/withdraw.',
  loading: 'Завантаження...',
  zeroSui: '0 SUI',
  zeroAv8: '0 AV8',
  investorLedger: 'Книга інвесторів',
  ledgerSubtitle: 'Баланси відновлені з останніх подій фонду.',
  addressesCount: '{count} адрес',
  colInvestor: 'Інвестор',
  colDeposited: 'Депозит',
  colWithdrawn: 'Вивід',
  colAv8Minted: 'AV8 змінтено',
  colAv8Burned: 'AV8 спалено',
  colNetAv8: 'Чистий AV8',
  colOps: 'Оп.',
  loadingInvestorEvents: 'Завантаження подій інвесторів...',
  noDepositWithdrawYet: 'Подій депозиту чи виводу ще немає.',
  opsInOut: '{deposits} у · {withdrawals} з',
  fundState: 'Стан фонду',
  labelBasket: 'Basket',
  labelAv8MintRedeem: 'AV8 мінт / викуп',
  labelRedeemBurn: 'Спалення при викупі',
  labelMaxAv8: 'Макс. AV8',
  labelTreasurySupply: 'Пропозиція в treasury',
  paused: 'На паузі',
  live: 'Активний',
  recentOperations: 'Останні операції',
  loadingEvents: 'Завантаження подій...',
  noEventsYet: 'Подій ще немає.',
  deposit: 'Депозит',
  withdraw: 'Вивід',
  burnedSuffix: 'спалено',
  pendingTimestamp: 'час очікується',
  notAvailableShort: 'н/д',
});

export const fundAccountsRu: FundAccountsCopy = fa({
  breadcrumb: 'Счета фонда',
  heroBadge: 'Учёт Sui',
  title: 'Счета фонда',
  subtitle: 'Операционный экран для контроля SUI в фонде, эмиссии AV8 и адресов инвесторов по on-chain событиям.',
  contracts: 'Контракты',
  basketShareLine: 'Basket {basket} · ShareConfig {share}',
  refresh: 'Обновить',
  errorNotConfigured: 'Не настроены пакет фонда, Basket или ShareConfig.',
  statLiquidSui: 'Ликвидный SUI',
  statLiquidNote: 'SUI в Basket.sui_vault, доступный для выкупа.',
  statNav: 'NAV',
  statNavNote: 'Текущий on-chain NAV на объекте Basket.',
  statAv8Circulating: 'AV8 в обращении',
  statAv8Note: 'Минт минус сжигание по счётчикам ShareConfig.',
  statNetInvestor: 'Чистый SUI инвесторов',
  statNetInvestorNote: 'Чистые депозиты восстановлены по последним событиям deposit/withdraw.',
  loading: 'Загрузка...',
  zeroSui: '0 SUI',
  zeroAv8: '0 AV8',
  investorLedger: 'Книга инвесторов',
  ledgerSubtitle: 'Балансы восстановлены из последних событий фонда.',
  addressesCount: '{count} адрес',
  colInvestor: 'Инвестор',
  colDeposited: 'Депозит',
  colWithdrawn: 'Вывод',
  colAv8Minted: 'AV8 выпущено',
  colAv8Burned: 'AV8 сожжено',
  colNetAv8: 'Чистый AV8',
  colOps: 'Оп.',
  loadingInvestorEvents: 'Загрузка событий инвесторов...',
  noDepositWithdrawYet: 'Событий депозита или вывода пока нет.',
  opsInOut: '{deposits} в · {withdrawals} из',
  fundState: 'Состояние фонда',
  labelBasket: 'Basket',
  labelAv8MintRedeem: 'AV8 минт / выкуп',
  labelRedeemBurn: 'Сжигание при выкупе',
  labelMaxAv8: 'Макс. AV8',
  labelTreasurySupply: 'Предложение в treasury',
  paused: 'Пауза',
  live: 'Активен',
  recentOperations: 'Последние операции',
  loadingEvents: 'Загрузка событий...',
  noEventsYet: 'Событий пока нет.',
  deposit: 'Депозит',
  withdraw: 'Вывод',
  burnedSuffix: 'сожжено',
  pendingTimestamp: 'время ожидается',
  notAvailableShort: 'н/д',
});
