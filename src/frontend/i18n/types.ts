export interface TranslationSchema {
  common: {
    appName: string;
    cancel: string;
    save: string;
    confirm: string;
    delete: string;
    edit: string;
    close: string;
    back: string;
    loading: string;
    error: string;
    success: string;
    retry: string;
    search: string;
    optional: string;
    required: string;
    done: string;
    ok: string;
    remove: string;
    yes: string;
    no: string;
    warning: string;
    version: string;
  };
  navigation: {
    home: string;
    scanner: string;
    search: string;
    profile: string;
    settings: string;
    map: string;
    history: string;
    registerProduct: string;
    customProduct: string;
    login: string;
    register: string;
    menu: string;
    closeMenu: string;
    products: string;
    help: string;
    about: string;
  };
  auth: {
    loginTitle: string;
    loginSubtitle: string;
    registerTitle: string;
    registerSubtitle: string;
    email: string;
    password: string;
    confirmPassword: string;
    name: string;
    loginButton: string;
    registerButton: string;
    noAccount: string;
    hasAccount: string;
    signIn: string;
    signUp: string;
    forgotPassword: string;
    logout: string;
    logoutConfirm: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmNewPassword: string;
    passwordChangedSuccess: string;
    deleteAccount: string;
    deleteAccountConfirm: string;
    deleteAccountWarning: string;
    invalidEmail: string;
    passwordTooShort: string;
    passwordsDoNotMatch: string;
    nameRequired: string;
  };
  settings: {
    title: string;
    appearance: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeSystem: string;
    monetColors: string;
    monetSubtitle: string;
    amoledDark: string;
    amoledSubtitle: string;
    language: string;
    languageSubtitle: string;
    selectLanguage: string;
    notifications: string;
    notificationsSubtitle: string;
    emailNotifications: string;
    emailNotificationsSubtitle: string;
    haptics: string;
    hapticsSubtitle: string;
    scannerHaptics: string;
    scannerHapticsSubtitle: string;
    autoConfirmScan: string;
    autoConfirmScanSubtitle: string;
    privacy: string;
    privacySubtitle: string;
    twoFactor: string;
    twoFactorSubtitle: string;
    dataCollection: string;
    dataCollectionSubtitle: string;
    backupExport: string;
    backupExportSubtitle: string;
    importSettings: string;
    importSettingsSubtitle: string;
    clearCache: string;
    clearCacheSubtitle: string;
    cacheCleared: string;
    accountSecurity: string;
    databaseStatus: string;
    backendStatus: string;
    connected: string;
    connecting: string;
    offline: string;
    resetSettings: string;
    resetConfirm: string;
    exportCodeModalTitle: string;
    exportCodeSubtitle: string;
    copyCode: string;
    codeCopied: string;
    shareCode: string;
    importModalTitle: string;
    importPlaceholder: string;
    importButton: string;
    importSuccess: string;
    importInvalidCode: string;
  };
  scanner: {
    title: string;
    scanBarcode: string;
    alignBarcode: string;
    flashlight: string;
    flashlightOn: string;
    flashlightOff: string;
    searchingProduct: string;
    productFound: string;
    productNotFound: string;
    manualEntry: string;
    rescan: string;
    confirmProduct: string;
    confirmProductSubtitle: string;
    productName: string;
    barcode: string;
    category: string;
    lastReportedPrice: string;
    continueToPrice: string;
    permissionRequired: string;
    grantPermission: string;
  };
  products: {
    title: string;
    registerPrice: string;
    enterPrice: string;
    pricePlaceholder: string;
    selectMarket: string;
    nearbyMarkets: string;
    submitPrice: string;
    submitting: string;
    priceSubmittedSuccess: string;
    customProductTitle: string;
    customProductSubtitle: string;
    description: string;
    categoryPlaceholder: string;
    registerCustomButton: string;
  };
  profile: {
    title: string;
    points: string;
    level: string;
    badges: string;
    rank: string;
    contributionStats: string;
    scannedProducts: string;
    reportedPrices: string;
    reputation: string;
    editProfile: string;
    memberSince: string;
  };
  map: {
    title: string;
    searchMarkets: string;
    nearbyMarketsTitle: string;
    distanceKm: string;
    viewPrices: string;
    noMarketsFound: string;
    locationPermissionDenied: string;
    recenter: string;
  };
  help: {
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    faqSectionTitle: string;
    faq1Question: string;
    faq1Answer: string;
    faq2Question: string;
    faq2Answer: string;
    faq3Question: string;
    faq3Answer: string;
    faq4Question: string;
    faq4Answer: string;
    faq5Question: string;
    faq5Answer: string;
    supportSectionTitle: string;
    contactSupport: string;
    supportEmailText: string;
    communityGuidelines: string;
  };
  about: {
    title: string;
    subtitle: string;
    tagline: string;
    missionTitle: string;
    missionDescription: string;
    howItWorksTitle: string;
    howItWorksDescription: string;
    openDataTitle: string;
    openDataDescription: string;
    versionInfo: string;
    buildInfo: string;
    privacyPolicy: string;
    termsOfService: string;
    creditsTitle: string;
    creditsDescription: string;
  };
  errors: {
    networkError: string;
    timeoutError: string;
    serverError: string;
    unauthorized: string;
    notFound: string;
    tryAgainLater: string;
    genericError: string;
  };
}

export type SupportedLanguage = "pt-BR" | "en-US" | "es-ES" | "de-DE" | "ru-RU" | "zh-CN" | "ja-JP";

export interface LanguageInfo {
  code: SupportedLanguage;
  nativeName: string;
  englishName: string;
  flag: string;
}

export type TranslationKey =
  | `common.${keyof TranslationSchema["common"]}`
  | `navigation.${keyof TranslationSchema["navigation"]}`
  | `auth.${keyof TranslationSchema["auth"]}`
  | `settings.${keyof TranslationSchema["settings"]}`
  | `scanner.${keyof TranslationSchema["scanner"]}`
  | `products.${keyof TranslationSchema["products"]}`
  | `profile.${keyof TranslationSchema["profile"]}`
  | `map.${keyof TranslationSchema["map"]}`
  | `help.${keyof TranslationSchema["help"]}`
  | `about.${keyof TranslationSchema["about"]}`
  | `errors.${keyof TranslationSchema["errors"]}`;
