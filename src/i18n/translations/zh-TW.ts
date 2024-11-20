import { title } from "process";

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
    saveError: '設定儲存失敗',
    appMode: '應用程式模式',
    selectMode: '選擇模式',
    modeHelp: '在字卡和閱讀模式之間切換',
    modes: {
      flashcards: '字卡模式',
      reading: '閱讀模式'
    },
    readingPreferences: '閱讀偏好設定',
    fontSize: '字體大小',
    focusMode: '專注模式'
  },
  studyMode:{
    selected: '已選擇'
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
    xpUntilNextLevel: '距離等級 {{level}} 還需 {{xp}} 經驗值',
    dropdown: {
      profile: '個人資料',
      settings: '設定',
      logout: '登出'
    },
    details: {
      joined: '加入時間',
      lastActive: '最後活動時間',
      studyStreak: '連續學習天數',
      totalStudyTime: '總學習時間',
      studySessions: '學習階段數',
      cardsLearned: '已學習卡片',
      cardsMastered: '已掌握卡片',
      averageAccuracy: '平均正確率'
    },
    graphs: {
      studyTime: '學習時間分布',
      weeklyActivity: '每週活動',
      masteryProgress: '掌握進度',
      categoryProgress: '類別進度',
      hourlyActivity: '每日時段活動',
      learningCurve: '學習曲線',
      minutes: '分鐘',
      cards: '卡片',
      accuracy: '正確率',
      today: '今天',
      thisWeek: '本週',
      thisMonth: '本月',
      allTime: '總計',
      noData: '暫無資料',
      earnedOn: '獲得時間：{{date}}'
    },
    stats: {
      dailyGoal: '每日目標',
      weeklyGoal: '週目標',
      monthlyGoal: '月目標',
      achieved: '已達成',
      remaining: '剩餘',
      averagePerDay: '每日平均',
      bestStreak: '最佳連續天數',
      totalDays: '總學習天數'
    }
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
      startStudying: '開始學習',
      importCards: '匯入卡片'
    },
    buttons: {
      startReview: '開始複習',
      startReading: '開始閱讀',
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
      passwordMatch: '密碼不一致',
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
      complete: '完成進度',
      completed: '已完成',
      remaining: '剩餘',
      streak: '連續正確',
    },
    fillInBlanks: {
      placeholder: '在此輸入答案...'
    },
    matching: {
      pairFound: '配對正確！',
      pairNotFound: '配對錯誤，請再試一次',
      complete: '所有配對完成！'
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
      actions: '操作',
      status: '狀態',
      help: {
        word: '輸入單字',
        pos: '例如：名詞、動詞、形容詞',
        definition: '輸入英文定義',
        translation: '輸入中文翻譯',
        categories: '選擇或建立類別',
        wordTooShort: '單字至少需要2個字元',
      },
      testTranslation: '測試翻譯',
      translationSuccess: '翻譯測試成功',
      translating: '翻譯中...',
      savedEntries: '已儲存的項目',
      importSaved: '匯入所有已儲存項目'
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
      search: '搜尋',
      importSaved: '匯入已儲存項目'
    },
    errors: {
      importFailed: '匯入失敗',
      fileReadError: '無法讀取檔案',
      translationFailed: '自動翻譯失敗。請手動輸入翻譯。',
      noContent: '請先輸入英文定義',
      translationError: '翻譯失敗：{{error}}',
      missingFields: '請填寫必填欄位（單字和英文定義）',
      emptyTranslation: '翻譯結果為空',
      uploadSuccess: '上傳成功！',
      savingEntry: '儲存中...',
      deleteConfirm: '確定要刪除此項目嗎？'
    },
    notifications: {
      saved: '已儲存',
      added: '已新增至待匯入清單',
      imported: '匯入完成',
      deleted: '已刪除',
      progress: '處理中...'
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
        pdf: '匯出 PDF',
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
      timeLimit: '時間限制（分鐘）',
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
  },
  "study.progress": {
    "overall": "總體進度",
    "complete": "完成進度",
    "completed": "已完成",
    "remaining": "剩餘",
    "cardsCompleted": "已完成卡片",
    "correct": "正確",
    "incorrect": "錯誤",
    "accuracy": "正確率",
    "streak": "連續正確"
  },
  "study.controls": {
    "saveExit": "儲存並離開"
  },
  reading: {
    tabs: {
      library: '文章庫',
      import: '匯入文章',
      categories: '分類',
      recent: '最近',
      favorites: '收藏'
    },
    title: '閱讀模式',
    library: {
      empty: '尚無文章。立即匯入新文章開始閱讀！',
      articleCount: '{{count}} 篇文章',
      sortBy: {
        recent: '最新',
        title: '標題',
        readTime: '閱讀時間',
        progress: '進度'
      },
      filter: {
        all: '所有文章',
        inProgress: '閱讀中',
        completed: '已完成',
        unread: '未讀'
      },
      search: '搜尋文章...',
      categories: {
        all: '所有分類',
        manage: '管理分類'
      },
      stats: {
        totalArticles: '共 {{count}} 篇文章',
        avgReadTime: '平均閱讀時間：{{time}} 分鐘',
        totalReadTime: '總閱讀時間：{{time}} 分鐘'
      },
      tools: {
        import: '匯入新文章',
        manage: '管理文章庫',
        sync: '同步進度',
        export: '匯出資料'
      },
      confirmations: {
        deleteArticle: '確定要刪除這篇文章嗎？',
        clearLibrary: '確定要清空文章庫嗎？'
      }
    },
    import: {
      title: '匯入文章',
      dropzone: {
        title: '將 ZIP 檔案拖放至此處，或點擊瀏覽',
        description: '文章套件應包含 details.json、content.txt 和選擇性的封面圖片'
      },
      error: {
        invalidZip: 'ZIP 檔案結構無效',
        missingFiles: '缺少必要檔案',
        corrupted: '文章內容已損壞',
        failed: '匯入文章失敗'
      },
      success: '文章匯入成功',
      validation: {
        checking: '檢查檔案結構中...',
        validating: '驗證內容中...',
        success: '檔案結構有效',
        preparing: '準備匯入中...'
      },
      settings: {
        extractLinks: '提取連結',
        autoCategories: '自動分類',
        parseMetadata: '解析中繼資料'
      },
      status: {
        queued: '等待中',
        processing: '處理中',
        failed: '失敗',
        completed: '已完成'
      }
    },
    interface: {
      readingTime: '閱讀時間：{{minutes}} 分鐘',
      wordCount: '{{count}} 個字',
      startReading: '開始閱讀',
      continueReading: '繼續閱讀',
      focusMode: '專注模式',
      addToFlashcards: '加入字卡',
      textToSpeech: '文字轉語音',
      search: '搜尋文章...',
    },
    dictionary: {
      addToFlashcards: '加入字卡'
    },
    settings: {
      fontSize: '字體大小',
      fontFamily: '字體家族',
      lineHeight: '行高',
      focusMode: '專注模式',
      enableTTS: '文字轉語音',
      theme: '主題',
      fonts: {
        system: '系統預設字體',
        georgia: 'Georgia 字體',
        merriweather: 'Merriweather 字體',
        sourceSerif: 'Source Serif Pro 字體',
        crimson: 'Crimson Pro 字體',
        notoSerif: 'Noto Serif 字體',
        ibmPlex: 'IBM Plex Serif 字體'
      }
    }
  }
};
