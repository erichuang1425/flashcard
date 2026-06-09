// Lightweight in-app translation dictionaries.
//
// The app intentionally avoids a heavyweight i18n library: the surface that
// needs translating (first-run guide, auth screens, navigation, home, settings)
// is small and well-defined. Keys are flat, dot-namespaced strings and values
// may contain `{placeholder}` tokens that `t()` interpolates.
//
// Supported languages:
//   en  – English
//   zh  – Traditional Chinese (繁體中文)

export type Language = 'en' | 'zh';

export const SUPPORTED_LANGUAGES: Language[] = ['en', 'zh'];

/** Human-readable name of each language, shown in its own script. */
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  zh: '繁體中文',
};

type Dict = Record<string, string>;

const en: Dict = {
  // Navigation
  'nav.home': 'Home',
  'nav.library': 'Library',
  'nav.study': 'Study',
  'nav.worksheets': 'Worksheets',
  'nav.import': 'Import',
  'nav.diary': 'Diary',
  'nav.settings': 'Settings',
  'nav.profile': 'Profile',
  'nav.logout': 'Logout',
  'nav.toggleTheme': 'Toggle light / dark',
  'nav.level': 'Level {level}',
  'nav.openProgress': 'Open progress & timer',
  'nav.goHome': 'Go to home',

  // Library
  'library.title': 'Library',
  'library.gridView': 'Grid View',
  'library.categories': 'Categories',
  'library.backToCategories': 'Back to Categories',
  'library.wordCount': '{count} words',

  // Login
  'login.title': 'Login',
  'login.email': 'Email Address',
  'login.password': 'Password',
  'login.signIn': 'Sign In',
  'login.or': 'or',
  'login.google': 'Sign in with Google',
  'login.rememberMe': 'Keep me signed in',
  'login.linkPrompt': 'You already have an account with this email. Sign in with your password below and your Google account will be connected automatically.',
  'login.noAccount': "Don't have an account?",
  'login.registerHere': 'Register here',
  'login.errorEmpty': 'Please enter your email and password',
  'login.errorFail': 'Failed to sign in. Please check your email and password.',
  'login.errorGoogle': 'Failed to sign in with Google',

  // Register
  'register.title': 'Register',
  'register.email': 'Email Address',
  'register.password': 'Password',
  'register.confirmPassword': 'Confirm Password',
  'register.signUp': 'Sign Up',
  'register.or': 'or',
  'register.google': 'Sign up with Google',
  'register.rememberMe': 'Keep me signed in',
  'register.linkPrompt': 'This email is already registered. Please log in instead — your Google sign-in will be connected automatically.',
  'register.haveAccount': 'Already have an account?',
  'register.loginHere': 'Login here',
  'register.errorEmail': 'Please enter your email address',
  'register.errorPasswordShort': 'Password must be at least 6 characters',
  'register.errorMismatch': 'Passwords do not match',
  'register.errorFail': 'Failed to create an account',
  'register.errorGoogle': 'Failed to sign up with Google',

  // Auth errors (shared by login & register)
  'authError.invalidEmail': 'That email address looks invalid.',
  'authError.userDisabled': 'This account has been disabled.',
  'authError.invalidCredentials': 'Incorrect email or password.',
  'authError.tooManyRequests': 'Too many attempts. Please wait a moment and try again.',
  'authError.network': 'Network error. Check your connection and try again.',
  'authError.emailInUse': 'This email is already registered. Try signing in instead.',
  'authError.weakPassword': 'Password must be at least 6 characters.',
  'authError.popupBlocked': 'The sign-in popup was blocked. Please allow popups and try again.',
  'authError.needsPasswordLink': 'You already have an account with this email. Sign in with your password to connect Google.',

  // Home
  'home.welcome': 'Welcome back, {name}!',
  'home.student': 'Student',
  'home.totalCards': 'Total cards: {total} ({remaining} remaining to study)',
  'home.dueToday': 'Due Today',
  'home.mastered': 'Mastered',
  'home.totalStudied': 'Total Studied',
  'home.dayStreak': 'Day Streak',
  'home.startReview': 'Start Review ({count} cards)',
  'home.addCards': 'Add New Cards',
  'home.progressOverview': 'Progress Overview',
  'home.masteryProgress': 'Mastery Progress',
  'home.masteredOf': '{mastered} of {total} cards mastered',
  'home.weeklyGoal': 'Weekly Study Goal ({minutes} minutes)',
  'home.minutesCompleted': '{progress} of {goal} minutes completed',
  'home.studyTime': 'Study Time',
  'home.totalMinutes': 'Total Minutes',

  // Settings
  'settings.title': 'Settings',
  'settings.studySettings': 'Study Settings',
  'settings.appPreferences': 'App Preferences',
  'settings.theme': 'Theme',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.themeSystem': 'System Default',
  'settings.language': 'Language',
  'settings.dailyGoal': 'Daily Study Goal (minutes)',
  'settings.sessionLength': 'Study Session Length (minutes)',
  'settings.notifications': 'Enable Notifications',
  'settings.audio': 'Enable Audio',
  'settings.pronunciation': 'Pronunciation',
  'settings.pomodoro': 'Pomodoro Settings',
  'settings.save': 'Save Settings',
  'settings.saved': 'Settings saved successfully',
  'settings.saveFail': 'Failed to save settings',
  'settings.guide': 'Guide & Tips',
  'settings.showGuide': 'Replay welcome',
  'settings.guideDesc': 'Control how the app guides you as you learn.',
  'settings.tipsToggle': 'Show tips as I use the app',
  'settings.tipsDesc':
    'Small hints appear in place the first time you reach each feature.',
  'settings.replayTips': 'Show all tips again',

  // Language names (used in selectors)
  'language.en': 'English',
  'language.zh': '繁體中文',

  // Onboarding — language picker
  'onboarding.chooseLanguage.title': 'Choose your language',
  'onboarding.chooseLanguage.subtitle':
    'Please pick the language you would like to use. You can change it later in Settings.',
  'onboarding.langContinue': 'Continue',

  // Onboarding — controls
  'onboarding.next': 'Next',
  'onboarding.back': 'Back',
  'onboarding.skip': 'Skip',
  'onboarding.finish': 'Start using the app',
  'onboarding.finishWithTips': 'Guide me as I go',
  'onboarding.finishExplore': "I'll explore on my own",
  'onboarding.stepOf': 'Step {current} of {total}',
  'onboarding.tip': 'Tip',

  // Onboarding — short welcome (the rest is taught in-context as you explore)
  'onboarding.welcome.title': 'Welcome to FlashCards AI',
  'onboarding.welcome.body':
    'This app helps you learn and remember new words, one small card at a time. No need to memorise anything now — here are just the basics.',
  'onboarding.flashcards.title': 'How learning works',
  'onboarding.flashcards.body':
    'Each card shows a word. Try to recall its meaning, then tap the card to flip it and check. Rate how well you knew it, and the app decides when to show it again — so you review the tricky words more and the easy ones less.',
  'onboarding.learnAsYouGo.title': 'Learn each part as you go',
  'onboarding.learnAsYouGo.body':
    "That's all you need to start. As you move around the app, small tips will point things out right where they happen — so there's nothing to remember up front. You can turn them off any time in Settings.",

  // Contextual coach-mark tips (shown in place as the user explores)
  'guide.gotIt': 'Got it',
  'guide.turnOff': 'Turn off tips',
  'guide.homeStart.title': 'Start here',
  'guide.homeStart.body':
    'When words are due, this button begins your review. The app picks the cards you need to practise today and walks you through them.',
  'guide.studyCard.title': 'Tap the card',
  'guide.studyCard.body':
    'Try to recall the meaning, then tap the card to flip it. Tap the speaker to hear the word, and rate how well you knew it to schedule the next review.',
  'guide.import.title': 'Add your words',
  'guide.import.body':
    'Type your own words, upload a CSV file, or pick a ready-made pack. New cards show up in your reviews straight away.',

  // Flashcard
  'flashcard.tapToReveal': 'Tap to reveal meaning',
  'flashcard.flipAria': 'Flip the card for {word} to see or hide its meaning',

  // Study controls
  'study.showAnswer': 'Reveal meaning',
  'study.showWord': 'Hide meaning',

  // Multiple choice
  'study.mc.continue': 'Continue',
  'study.mc.wordToMeaning': 'Word → Meaning',
  'study.mc.meaningToWord': 'Meaning → Word',
};

const zh: Dict = {
  // Navigation
  'nav.home': '首頁',
  'nav.library': '圖書館',
  'nav.study': '學習',
  'nav.worksheets': '練習卷',
  'nav.import': '匯入',
  'nav.diary': '日記',
  'nav.settings': '設定',
  'nav.profile': '個人檔案',
  'nav.logout': '登出',
  'nav.toggleTheme': '切換淺色／深色',
  'nav.level': '等級 {level}',
  'nav.openProgress': '開啟進度與計時器',
  'nav.goHome': '回到首頁',

  // Library
  'library.title': '圖書館',
  'library.gridView': '網格檢視',
  'library.categories': '分類',
  'library.backToCategories': '返回分類',
  'library.wordCount': '{count} 個單字',

  // Login
  'login.title': '登入',
  'login.email': '電子郵件',
  'login.password': '密碼',
  'login.signIn': '登入',
  'login.or': '或',
  'login.google': '使用 Google 登入',
  'login.rememberMe': '保持登入狀態',
  'login.linkPrompt': '此電子郵件已有帳號。請在下方使用密碼登入，系統會自動連結你的 Google 帳號。',
  'login.noAccount': '還沒有帳號嗎？',
  'login.registerHere': '在此註冊',
  'login.errorEmpty': '請輸入電子郵件和密碼',
  'login.errorFail': '登入失敗，請檢查你的電子郵件和密碼。',
  'login.errorGoogle': '使用 Google 登入失敗',

  // Register
  'register.title': '註冊',
  'register.email': '電子郵件',
  'register.password': '密碼',
  'register.confirmPassword': '確認密碼',
  'register.signUp': '註冊',
  'register.or': '或',
  'register.google': '使用 Google 註冊',
  'register.rememberMe': '保持登入狀態',
  'register.linkPrompt': '此電子郵件已經註冊過。請改用登入，系統會自動連結你的 Google 帳號。',
  'register.haveAccount': '已經有帳號了嗎？',
  'register.loginHere': '在此登入',
  'register.errorEmail': '請輸入你的電子郵件',
  'register.errorPasswordShort': '密碼長度至少需要 6 個字元',
  'register.errorMismatch': '兩次輸入的密碼不一致',
  'register.errorFail': '建立帳號失敗',
  'register.errorGoogle': '使用 Google 註冊失敗',

  // Auth errors (shared by login & register)
  'authError.invalidEmail': '這個電子郵件地址看起來無效。',
  'authError.userDisabled': '此帳號已被停用。',
  'authError.invalidCredentials': '電子郵件或密碼不正確。',
  'authError.tooManyRequests': '嘗試次數過多，請稍候再試。',
  'authError.network': '網路錯誤，請檢查連線後再試。',
  'authError.emailInUse': '此電子郵件已經註冊過，請改用登入。',
  'authError.weakPassword': '密碼長度至少需要 6 個字元。',
  'authError.popupBlocked': '登入彈出視窗被封鎖，請允許彈出視窗後再試。',
  'authError.needsPasswordLink': '此電子郵件已有帳號。請使用密碼登入以連結 Google。',

  // Home
  'home.welcome': '歡迎回來，{name}！',
  'home.student': '同學',
  'home.totalCards': '卡片總數：{total}（還有 {remaining} 張待學習）',
  'home.dueToday': '今日待複習',
  'home.mastered': '已精通',
  'home.totalStudied': '學習總次數',
  'home.dayStreak': '連續天數',
  'home.startReview': '開始複習（{count} 張卡片）',
  'home.addCards': '新增單字卡',
  'home.progressOverview': '進度總覽',
  'home.masteryProgress': '精通進度',
  'home.masteredOf': '已精通 {total} 張中的 {mastered} 張',
  'home.weeklyGoal': '每週學習目標（{minutes} 分鐘）',
  'home.minutesCompleted': '已完成 {goal} 分鐘中的 {progress} 分鐘',
  'home.studyTime': '學習時間',
  'home.totalMinutes': '總分鐘數',

  // Settings
  'settings.title': '設定',
  'settings.studySettings': '學習設定',
  'settings.appPreferences': '應用程式偏好',
  'settings.theme': '主題',
  'settings.themeLight': '淺色',
  'settings.themeDark': '深色',
  'settings.themeSystem': '跟隨系統',
  'settings.language': '語言',
  'settings.dailyGoal': '每日學習目標（分鐘）',
  'settings.sessionLength': '每次學習時長（分鐘）',
  'settings.notifications': '啟用通知',
  'settings.audio': '啟用音效',
  'settings.pronunciation': '發音',
  'settings.pomodoro': '番茄鐘設定',
  'settings.save': '儲存設定',
  'settings.saved': '設定已成功儲存',
  'settings.saveFail': '儲存設定失敗',
  'settings.guide': '導覽與提示',
  'settings.showGuide': '再次觀看歡迎導覽',
  'settings.guideDesc': '設定應用程式在你學習時如何引導你。',
  'settings.tipsToggle': '使用應用程式時顯示提示',
  'settings.tipsDesc': '第一次使用到某個功能時，會在該處就地顯示小提示。',
  'settings.replayTips': '再次顯示所有提示',

  // Language names (used in selectors)
  'language.en': 'English',
  'language.zh': '繁體中文',

  // Onboarding — language picker
  'onboarding.chooseLanguage.title': '選擇你的語言',
  'onboarding.chooseLanguage.subtitle':
    '請選擇你想使用的語言。你之後可以在「設定」中變更。',
  'onboarding.langContinue': '繼續',

  // Onboarding — controls
  'onboarding.next': '下一步',
  'onboarding.back': '上一步',
  'onboarding.skip': '略過',
  'onboarding.finish': '開始使用',
  'onboarding.finishWithTips': '邊用邊引導我',
  'onboarding.finishExplore': '我想自己探索',
  'onboarding.stepOf': '第 {current} 步，共 {total} 步',
  'onboarding.tip': '小提示',

  // Onboarding — short welcome (the rest is taught in-context as you explore)
  'onboarding.welcome.title': '歡迎使用 FlashCards AI',
  'onboarding.welcome.body':
    '這個應用程式可以幫助你一張一張地學習並記住新單字。現在不需要記住任何東西，先了解一下基本概念就好。',
  'onboarding.flashcards.title': '學習的運作方式',
  'onboarding.flashcards.body':
    '每張卡片都會顯示一個單字。先試著回想它的意思，再點擊卡片翻面確認。為自己的熟悉程度評分後，應用程式會決定何時再次顯示它——難記的單字會更常複習，簡單的則較少出現。',
  'onboarding.learnAsYouGo.title': '邊用邊學每個部分',
  'onboarding.learnAsYouGo.body':
    '開始所需要的就是這些。當你在應用程式中四處操作時，小提示會就地在相關處出現——所以不用事先記住任何東西。你隨時可以在「設定」中關閉它們。',

  // Contextual coach-mark tips (shown in place as the user explores)
  'guide.gotIt': '知道了',
  'guide.turnOff': '關閉提示',
  'guide.homeStart.title': '從這裡開始',
  'guide.homeStart.body':
    '當有單字到了複習時間，這個按鈕就會開始複習。應用程式會挑出你今天需要練習的卡片，並帶著你逐張完成。',
  'guide.studyCard.title': '點擊卡片',
  'guide.studyCard.body':
    '先試著回想意思，再點擊卡片翻面。點擊喇叭可以聽發音，並為你的熟悉程度評分，以安排下次複習的時間。',
  'guide.import.title': '加入你的單字',
  'guide.import.body':
    '自己輸入單字、上傳 CSV 檔案，或選擇現成的單字包。新卡片會立即出現在你的複習中。',

  // Flashcard
  'flashcard.tapToReveal': '點擊以顯示意思',
  'flashcard.flipAria': '翻轉「{word}」卡片以顯示或隱藏意思',

  // Study controls
  'study.showAnswer': '顯示意思',
  'study.showWord': '隱藏意思',

  // Multiple choice
  'study.mc.continue': '繼續',
  'study.mc.wordToMeaning': '單字 → 意思',
  'study.mc.meaningToWord': '意思 → 單字',
};

export const translations: Record<Language, Dict> = { en, zh };
