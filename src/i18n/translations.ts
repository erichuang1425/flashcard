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

  // Login
  'login.title': 'Login',
  'login.email': 'Email Address',
  'login.password': 'Password',
  'login.signIn': 'Sign In',
  'login.or': 'or',
  'login.google': 'Sign in with Google',
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
  'register.haveAccount': 'Already have an account?',
  'register.loginHere': 'Login here',
  'register.errorEmail': 'Please enter your email address',
  'register.errorPasswordShort': 'Password must be at least 6 characters',
  'register.errorMismatch': 'Passwords do not match',
  'register.errorFail': 'Failed to create an account',

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
  'settings.guide': 'Beginner Guide',
  'settings.showGuide': 'Show the guide again',
  'settings.guideDesc': 'Replay the quick tour that explains how the app works.',

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
  'onboarding.skip': 'Skip guide',
  'onboarding.finish': 'Start using the app',
  'onboarding.stepOf': 'Step {current} of {total}',
  'onboarding.tip': 'Tip',

  // Onboarding — steps
  'onboarding.welcome.title': 'Welcome to FlashCards AI',
  'onboarding.welcome.body':
    'This app helps you learn and remember new words, one small card at a time. This short guide will show you how everything works. Tap the big button below to continue.',
  'onboarding.flashcards.title': 'What is a flashcard?',
  'onboarding.flashcards.body':
    'A flashcard shows a word on the front. When you tap the card, it flips over to reveal the meaning. Looking at the word, trying to remember it, then checking the answer is what helps it stick.',
  'onboarding.add.title': 'Add words to study',
  'onboarding.add.body':
    "Tap 'Import' (or 'Add New Cards' on the home screen) to add words. You can type your own, upload a file, or pick a ready-made pack with a single tap.",
  'onboarding.study.title': 'Practice a little every day',
  'onboarding.study.body':
    "On the home screen, tap 'Start Review'. The app chooses the cards you need to practice today and walks you through them one by one.",
  'onboarding.pronounce.title': 'Hear how words sound',
  'onboarding.pronounce.body':
    'See the speaker icon on a card? Tap it to hear the word spoken aloud. You can change the voice and the speed later in Settings.',
  'onboarding.progress.title': 'Watch yourself improve',
  'onboarding.progress.body':
    'The home screen shows your streak (how many days in a row you have studied) and how many words you have mastered. A little practice each day adds up quickly.',
  'onboarding.navigate.title': 'Finding your way around',
  'onboarding.navigate.body':
    'On a phone, tap the menu button (the three lines) in the top corner to move between screens. The gear icon opens Settings, where you can change the language or open this guide again.',
  'onboarding.done.title': "You're all set!",
  'onboarding.done.body':
    'That is everything you need to begin. You can open this guide again any time from the Settings screen. Happy learning!',
};

const zh: Dict = {
  // Navigation
  'nav.home': '首頁',
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

  // Login
  'login.title': '登入',
  'login.email': '電子郵件',
  'login.password': '密碼',
  'login.signIn': '登入',
  'login.or': '或',
  'login.google': '使用 Google 登入',
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
  'register.haveAccount': '已經有帳號了嗎？',
  'register.loginHere': '在此登入',
  'register.errorEmail': '請輸入你的電子郵件',
  'register.errorPasswordShort': '密碼長度至少需要 6 個字元',
  'register.errorMismatch': '兩次輸入的密碼不一致',
  'register.errorFail': '建立帳號失敗',

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
  'settings.guide': '新手導覽',
  'settings.showGuide': '再次查看導覽',
  'settings.guideDesc': '重新觀看說明應用程式運作方式的快速導覽。',

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
  'onboarding.skip': '略過導覽',
  'onboarding.finish': '開始使用',
  'onboarding.stepOf': '第 {current} 步，共 {total} 步',
  'onboarding.tip': '小提示',

  // Onboarding — steps
  'onboarding.welcome.title': '歡迎使用 FlashCards AI',
  'onboarding.welcome.body':
    '這個應用程式可以幫助你一張一張地學習並記住新單字。這份簡短的導覽會告訴你所有功能的用法。請點擊下方的大按鈕繼續。',
  'onboarding.flashcards.title': '什麼是單字卡？',
  'onboarding.flashcards.body':
    '單字卡的正面會顯示一個單字。當你點擊卡片時，它會翻面顯示意思。先看單字、試著回想、再確認答案，這樣才能幫助你記得更牢。',
  'onboarding.add.title': '加入要學習的單字',
  'onboarding.add.body':
    '點擊「匯入」（或在首頁點擊「新增單字卡」）即可加入單字。你可以自己輸入、上傳檔案，或一鍵選擇現成的單字包。',
  'onboarding.study.title': '每天練習一點點',
  'onboarding.study.body':
    '在首頁點擊「開始複習」。應用程式會挑出你今天需要練習的卡片，並一張一張帶著你完成。',
  'onboarding.pronounce.title': '聆聽單字發音',
  'onboarding.pronounce.body':
    '看到卡片上的喇叭圖示了嗎？點一下就能聽到單字的發音。你之後可以在「設定」中變更語音與速度。',
  'onboarding.progress.title': '看見自己的進步',
  'onboarding.progress.body':
    '首頁會顯示你的連續天數（你連續學習了幾天）以及你已經精通了多少單字。每天練習一點點，很快就會累積出成果。',
  'onboarding.navigate.title': '如何在各畫面之間切換',
  'onboarding.navigate.body':
    '在手機上，點擊右上角的選單按鈕（三條橫線）就能切換不同畫面。齒輪圖示可以打開「設定」，你可以在那裡變更語言或再次打開這份導覽。',
  'onboarding.done.title': '一切準備就緒！',
  'onboarding.done.body':
    '開始學習所需要的就是這些了。你隨時可以從「設定」畫面再次打開這份導覽。祝你學習愉快！',
};

export const translations: Record<Language, Dict> = { en, zh };
