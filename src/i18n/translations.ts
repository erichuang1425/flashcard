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
  'nav.reading': 'Reading',
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

  // Article reading
  'reading.title': 'Reading',
  'reading.subtitle': 'Import articles, read without distractions, and save useful words.',
  'reading.tabs.library': 'Articles',
  'reading.tabs.import': 'Import',
  'reading.tabs.manage': 'Manage',
  'reading.library.search': 'Search articles',
  'reading.library.empty': 'No articles yet',
  'reading.library.emptyHint': 'Import a ZIP article package to start reading.',
  'reading.library.metadata': '{words} words · {minutes} min',
  'reading.library.loadFailed': 'Failed to load articles.',
  'reading.library.contentMissing': 'This article has no readable content.',
  'reading.sort.recent': 'Recently read',
  'reading.sort.title': 'Title',
  'reading.sort.readTime': 'Reading time',
  'reading.sort.progress': 'Progress',
  'reading.sort.random': 'Random',
  'reading.import.title': 'Drop ZIP article packages here',
  'reading.import.description': 'Each ZIP needs details.json and content.txt. A cover image is optional.',
  'reading.import.choose': 'Choose ZIP files',
  'reading.import.failed': 'Import failed',
  'reading.import.status.processing': 'Processing',
  'reading.import.status.complete': 'Imported',
  'reading.import.status.error': 'Failed',
  'reading.manage.selected': '{count} selected',
  'reading.manage.delete': 'Delete selected',
  'reading.manage.cover': 'Upload cover',
  'reading.manage.removeCover': 'Remove cover',
  'reading.settings.title': 'Reading settings',
  'reading.settings.fontFamily': 'Font',
  'reading.settings.fontSize': 'Font size',
  'reading.settings.lineHeight': 'Line spacing',
  'reading.settings.themeLight': 'Light',
  'reading.settings.themeDark': 'Dark',
  'reading.settings.themeSepia': 'Sepia',
  'reading.settings.tts': 'Enable text to speech',
  'reading.notes.title': 'Reading notes',
  'reading.notes.note': 'Note',
  'reading.notes.category': 'Category',
  'reading.dictionary.notFound': 'No definition was found.',
  'reading.dictionary.failed': 'Dictionary lookup failed.',
  'reading.dictionary.duplicate': 'This word is already in your flashcards.',
  'reading.dictionary.categories': 'Flashcard categories',
  'reading.dictionary.categoriesHint': 'Separate categories with commas.',
  'reading.dictionary.add': 'Add to flashcards',
  'reading.reader.back': 'Back to articles',
  'reading.reader.dictionary': 'Look up selected word',
  'reading.reader.notes': 'Add note from selected text',
  'reading.reader.speak': 'Read article aloud',
  'reading.reader.random': 'Open a random article',
  'reading.reader.fullscreen': 'Toggle fullscreen',
  'reading.reader.settings': 'Reading settings',
  'reading.reader.complete': 'Mark complete',
  'reading.reader.selectWord': 'Select one word before opening the dictionary.',
  'reading.reader.selectText': 'Select article text before adding a note.',
  'reading.reader.enableTts': 'Enable text to speech in Reading settings first.',
  'common.cancel': 'Cancel',
  'common.save': 'Save',

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
  'authError.linkEmailMismatch': 'Use the same email from the Google sign-in to connect this account.',

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
  'home.readArticles': 'Read Articles',
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
  'nav.reading': '閱讀',
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

  // Article reading
  'reading.title': '閱讀',
  'reading.subtitle': '匯入文章、專注閱讀，並將實用單字加入字卡。',
  'reading.tabs.library': '文章',
  'reading.tabs.import': '匯入',
  'reading.tabs.manage': '管理',
  'reading.library.search': '搜尋文章',
  'reading.library.empty': '尚無文章',
  'reading.library.emptyHint': '匯入 ZIP 文章套件即可開始閱讀。',
  'reading.library.metadata': '{words} 字 · {minutes} 分鐘',
  'reading.library.loadFailed': '無法載入文章。',
  'reading.library.contentMissing': '這篇文章沒有可閱讀的內容。',
  'reading.sort.recent': '最近閱讀',
  'reading.sort.title': '標題',
  'reading.sort.readTime': '閱讀時間',
  'reading.sort.progress': '進度',
  'reading.sort.random': '隨機',
  'reading.import.title': '將 ZIP 文章套件拖放到這裡',
  'reading.import.description': '每個 ZIP 需包含 details.json 與 content.txt，封面圖片為選填。',
  'reading.import.choose': '選擇 ZIP 檔案',
  'reading.import.failed': '匯入失敗',
  'reading.import.status.processing': '處理中',
  'reading.import.status.complete': '已匯入',
  'reading.import.status.error': '失敗',
  'reading.manage.selected': '已選取 {count} 篇',
  'reading.manage.delete': '刪除所選文章',
  'reading.manage.cover': '上傳封面',
  'reading.manage.removeCover': '移除封面',
  'reading.settings.title': '閱讀設定',
  'reading.settings.fontFamily': '字型',
  'reading.settings.fontSize': '字體大小',
  'reading.settings.lineHeight': '行距',
  'reading.settings.themeLight': '淺色',
  'reading.settings.themeDark': '深色',
  'reading.settings.themeSepia': '復古紙張',
  'reading.settings.tts': '啟用文字朗讀',
  'reading.notes.title': '閱讀筆記',
  'reading.notes.note': '筆記',
  'reading.notes.category': '分類',
  'reading.dictionary.notFound': '找不到這個單字的定義。',
  'reading.dictionary.failed': '字典查詢失敗。',
  'reading.dictionary.duplicate': '這個單字已存在於字卡中。',
  'reading.dictionary.categories': '字卡分類',
  'reading.dictionary.categoriesHint': '請用逗號分隔多個分類。',
  'reading.dictionary.add': '加入字卡',
  'reading.reader.back': '返回文章列表',
  'reading.reader.dictionary': '查詢選取的單字',
  'reading.reader.notes': '將選取文字加入筆記',
  'reading.reader.speak': '朗讀文章',
  'reading.reader.random': '開啟隨機文章',
  'reading.reader.fullscreen': '切換全螢幕',
  'reading.reader.settings': '閱讀設定',
  'reading.reader.complete': '標記為已完成',
  'reading.reader.selectWord': '請先選取一個單字再開啟字典。',
  'reading.reader.selectText': '請先選取文章文字再新增筆記。',
  'reading.reader.enableTts': '請先在閱讀設定中啟用文字朗讀。',
  'common.cancel': '取消',
  'common.save': '儲存',

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
  'authError.linkEmailMismatch': '請使用 Google 登入時相同的電子郵件來連結此帳號。',

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
  'home.readArticles': '閱讀文章',
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
