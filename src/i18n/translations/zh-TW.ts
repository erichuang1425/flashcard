export const zhTW = {
  common: {
    save: '儲存',
    cancel: '取消',
    loading: '載入中...',
    error: '錯誤',
    success: '成功',
    exit: '離開',
    finish: '完成',
    next: '下一步'
  },
  settings: {
    title: '設定',
    language: '語言',
    languageHelp: '選擇您偏好的語言',
    theme: '主題模式',
    appearance: '語言和外觀',
    study: '學習設定',
    studyGoal: '每日學習目標（分鐘）',
    sessionLength: '學習時段長度（分鐘）',
    notifications: '啟用通知',
    audio: '啟用音效',
    pomodoro: '番茄鐘設定',
    workDuration: '工作時長（分鐘）',
    breakDuration: '休息時長（分鐘）',
    autoStartBreak: '自動開始休息',
    vocabLimit: '學習字彙數量限制',
    vocabLimitHelp: '每次學習階段的最大字彙數量（5-100）',
    themes: {
      light: '淺色',
      dark: '深色',
      system: '系統'
    },
    categories: {
      title: '類別進度',
      noData: '無類別資料'
    },
    achievements: {
      title: '成就',
      progress: '{{current}}/{{required}}'
    },
    preferences: {
      title: '應用程式偏好設定'
    },
    saveSuccess: '設定儲存成功',
    saveError: '設定儲存失敗'
  },
  profile: {
    level: '等級',
    xp: '經驗值',
    overview: '概覽',
    patterns: '學習模式',
    categories: '類別',
    achievements: {
      progress: '已完成 {{current}}/{{required}}',
      title: '成就',
      achievements: '成就列表', 
      xpReward: '+{{points}} 經驗值'
    },
    progress: '進度',
    xpUntilNextLevel: '距離等級 {{level}} 還需 {{xp}} 經驗值'
  },
  home: {
    welcome: '歡迎回來',
    stats: {
      totalStudied: '總學習量',
      dueToday: '今日待複習',
      mastered: '已掌握',
      streak: '連續學習天數',
      studyTime: '學習時間',
      minutes: '分鐘',
      totalCards: '總卡片數',
      remainingToStudy: '待學習',
      weeklyProgress: '本週進度',  
      weeklyGoal: '週目標',
      of: '/',
      cardsMastered: '張卡片已掌握',
      minutesCompleted: '分鐘已完成'
    },
    actions: {
      startStudying: '��始學習',
      importCards: '匯入卡片'
    },
    buttons: {
      startReview: '開始複習',
      browse: '瀏覽詞庫',
      addNewCards: '取得新卡片'
    },
    cards: '卡片',
    progressOverview: '進度概覽',
    masteryProgress: '掌握進度',
    totalMinutes: '總學習時間',
    studyTime: '學習時間概覽'
  },
  library: {
    title: '詞庫',
    views: {
      grid: '網格檢視',
      categories: '類別'
    },
    noResults: '未找到卡片',
    search: {
      placeholder: '搜尋單字...',
      noResults: '找不到結果',
      categories: '類別'
    },
    cards: {
      difficulty: '難度',
      lastReviewed: '上次複習',
      nextReview: '下次複習',
      notReviewed: '尚未複習'
    }
  },
  auth: {
    login: '登入',
    register: '註冊',
    email: '電子郵件',
    password: '密碼',
    confirmPassword: '確認密碼',
    signIn: '登入',
    signUp: '註冊',
    googleSignIn: '使用 Google 登入',
    errors: {
      failed: '登入失敗',
      googleFailed: 'Google 登入失敗',
      passwordMatch: '密碼不相符',
      createAccount: '建立帳號失敗'
    }
  },
  study: {
    title: '學習課程', 
    modes: {
      title: '學習模式', 
      flashcard: '字卡',
      multipleChoice: '選擇題',
      matching: '配對',
      fillBlanks: '填空'
    },
    controls: {
      showAnswer: '顯示答案',
      hideAnswer: '隱藏答案',
      next: '下一題',
      complete: '完成',
      saveExit: '儲存並離開'
    },
    progress: {
      cardsCompleted: '已完成卡片',
      cardsRemaining: '剩餘卡片',
      sessionComplete: '學習階段完成！',
      accuracy: '正確率',
      overall: '總體進度',
      currentStreak: '目前連續',
      cardsProgress: '進度：{{reviewed}}/{{total}} 張卡片', 
      correct: '正確',
      incorrect: '錯誤',
      cardsTotal: '總卡片數：{{total}}',
      cardsStudied: '已學習：{{count}} 張',
      cardProgress: '第 {{current}} 張，共 {{total}} 張',
      progressCount: '{{completed}}/{{total}}',
    },
    feedback: {
      correct: '正確！',
      incorrect: '再試一次',
      showAnswer: '顯示答案'
    },
    errors: {
      loadingOptions: '載入選項失敗',
      loadingCards: '載入閃卡失敗'
    },
    pomodoro: {
      focus: '計時器',
      break: '休息時間',
      start: '開始',
      pause: '暫停',
      reset: '重置',
      workTime: '{{minutes}} 分鐘工作',
      breakTime: '{{minutes}} 分鐘休息'
    },
    resume: {
      title: '是否繼續上次的學習進度？',
      continueSession: '繼續學習',
      newSession: '開始新的學習'
    }
  },
  import: {
    title: '匯入單字卡',
    steps: {
      select: '選擇檔案',
      preview: '預覽',
      import: '匯入'
    },
    preview: {
      title: '預覽匯入資料',
      rowsPerPage: '每頁顯示列數',
      validate: '驗證標題',
      import: '開始匯入',
      cancel: '取消'
    },
    progress: {
      title: '匯入進度',
      processed: '已處理',
      success: '成功',
      failed: '失敗',
      complete: '匯入完成！',
      completeWithErrors: '匯入完成但有錯誤'
    },
    manual: {
      word: '單字',
      partOfSpeech: '詞性',
      englishDefinition: '英文定義',
      chineseTranslation: '中文翻譯',
      categories: '類別',
      title: '手動匯入',
      help: {
        word: '輸入單字',
        pos: '例如：名詞、動詞、形容詞',
        definition: '輸入英文定義',
        translation: '輸入中文翻譯',
        categories: '選擇或建立類別',
        wordTooShort: '單字至少需要2個字元'
      },
      testTranslation: '測試翻譯',
      translationSuccess: '翻譯測試成功',
      translating: '翻譯中...'
    },
    fileImport: {
      title: '檔案匯入',
      selectFile: '選擇檔案',
      dragAndDrop: '將 CSV 檔案拖放至此處，或點擊選擇',
      validate: '驗證檔案'
    },
    manualEntry: {
      title: '手動輸入',
      addMore: '新增更多單字',
      saveEntry: '儲存'
    },
    actions: {
      upload: '上傳 CSV 檔案',
      back: '返回',
      startImport: '開始匯入',
      selectAll: '全選',
      clearSelection: '清除選擇',
      search: '搜尋'
    },
    errors: {
      importFailed: '匯入失敗',
      fileReadError: '無法讀取檔案',
      translationFailed: '自動翻譯失敗。請手動輸入翻譯。',
      noContent: '請先輸入英文定義',
      translationError: '翻譯失敗：{{error}}'
    },
    instructions: '上傳包含正面和背面兩欄的 CSV 檔案。',
    dropzone: {
      title: '將檔案拖曳至此處或點擊瀏覽',
      accept: '接受 .csv 檔案',
      maxSize: '檔案大小上限：5MB',
      error: {
        fileType: '無效的檔案類型。僅接受 CSV 檔案。',
        fileSize: '檔案過大。檔案大小上限為 5MB。'
      }
    },
    placeholder: {
      search: '搜尋單字...',
      manualInput: '每行輸入一個單字'
    }
  },
  worksheets: {
    title: '我的學習單',
    createNew: '建立新學習單',
    noWorksheets: '找不到習題',
    actions: {
      start: '開始',
      continue: '繼續',
      delete: '刪除',
      edit: '編輯',
      export: {
        pdf: '匯�� PDF',
        word: '匯出 Word'
      },
      viewAnswers: '查看解答',
      back: '返回習題列表',
      exit: '離開習題'
    },
    difficulty: {
      difficulty: '難度',
      easy: '簡單',
      medium: '中等',
      hard: '困難'
    },
    stats: {
      timeLimit: '時間限制',
      completed: '已完成',
      minutes: '分鐘'
    },
    answerKey: {
      title: '解答',
      question: '問題',
      navigation: {
        first: '第一題',
        prev: '上一題',
        next: '下一題',
        last: '最後一題'
      }
    },
    labels: {
      status: '狀態：{{status}}',
      lastAttempted: '上次嘗試：{{date}}',
      timeEstimate: '預估時間：{{time}} 分鐘',
      totalQuestions: '{{count}} 個問題',
      inProgress: '進行中',
      notStarted: '尚未開始',
      completed: '已完成'
    },
    errors: {
      noQuestions: '沒有可用的習題',
      loadFailed: '載入習題失敗'
    },
    question: '第 {{current}} 題，共 {{total}} 題',
    answerPlaceholder: '輸入答案',
    form: {
      title: '建立新學習單',
      inputMode: {
        database: '從資料庫',
        manual: '手動輸入'
      },
      words: '輸入單字（每行一個）',
      template: '模板',
      timeLimit: '時間限制（分鐘）',
      filterCategory: '依類別篩選',
      allWords: '所有單字',
      searchWords: '搜尋單字...',
      templateHelp: '選擇練習類型',
      categoryHelp: '依類別篩選單字',
      timeHelp: '1-120 分鐘',
      selectWords: '選擇單字',
      selectAll: '全選',
      clearSelection: '清除選擇',
      searchPlaceholder: '搜尋要加入的單字...',
      manualInputPlaceholder: '每行輸入一個單字',
      generatorTitle: '建立學習單',
      wordInput: '輸入單字'
    },
    templates: {
      comprehensivePractice: '綜合練習',
      translationMastery: '翻譯練習',
      sentenceWriting: '造句練習',
      vocabularyQuiz: '字彙測驗'
    },
    placeholder: {
      title: '輸入學習單標題...',
      search: '搜尋要包含的單字...',
      manual: '每行輸入一個單字'
    }
  },
  navigation: {
    menu: {
      profile: '個人資料',
      settings: '設定',
      logout: '登出',
      home: '首頁',
      study: '學習',
      worksheets: '習題',
      import: '匯入'
    },
    appName: '字卡 AI',
    level: '等級'
  },
  forms: {
    worksheet: {
      title: '建立學習單',
      titleLabel: '學習單標題',
      difficulty: '難度',
      timeLimit: '時間限制���分鐘）',
      categories: '類別',
      submit: '建立學習單',
      cancel: '取消',
      preview: '預覽'
    },
    import: {
      selectFile: '選擇 CSV 檔案',
      dropzone: '將檔案拖曳至此處或點擊瀏覽',
      format: '檔案格式：CSV 檔案需包含單字、定義等欄位',
      validateHeaders: '驗證標題',
      startImport: '開始匯入',
      cancel: '取消',
      preview: '預覽資料'
    }
  }
};
