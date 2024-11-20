export const en = {
  common: {
    save: 'Save',
    cancel: 'Cancel',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    exit: 'Exit',
    finish: 'Finish',
    next: 'Next',
  },
  settings: {
    title: 'Settings',
    language: 'Language',
    languageHelp: 'Choose your preferred language',
    theme: 'Theme Mode',
    appearance: 'Language & Appearance',
    study: 'Study Settings',
    studyGoal: 'Daily Study Goal (minutes)',
    sessionLength: 'Study Session Length (minutes)',
    notifications: 'Enable Notifications',
    audio: 'Enable Audio',
    pomodoro: 'Pomodoro Settings',
    workDuration: 'Work Duration (minutes)',
    breakDuration: 'Break Duration (minutes)',
    autoStartBreak: 'Auto-start breaks',
    vocabLimit: 'Study Vocabulary Limit',
    vocabLimitHelp: 'Maximum number of vocabulary words per study session (5-100)',
    themes: {
      light: 'Light',
      dark: 'Dark', 
      system: 'System'
    },
    categories: {
      title: 'Categories Progress',
      noData: 'No category data available'
    },
    achievements: {
      title: 'Achievements',
      progress: '{{current}}/{{required}}'
    },
    preferences: {
      title: 'App Preferences'
    },
    saveSuccess: 'Settings saved successfully',
    saveError: 'Failed to save settings',
    appMode: 'App Mode',
    selectMode: 'Select Mode',
    modeHelp: 'Switch between flashcards and reading mode',
    modes: {
      flashcards: 'Flashcards Mode',
      reading: 'Reading Mode'
    },
    readingPreferences: 'Reading Preferences',
    fontSize: 'Font Size',
    focusMode: 'Focus Mode'
  },
  profile: {
    level: 'Level',
    xp: 'XP',
    overview: 'Overview',
    patterns: 'Study Patterns',
    categories: 'Categories',
    progress: 'Progress',
    achievements: {
      title: 'Achievements',
      achievements: 'Achievements List', 
      progress: '{{current}}/{{required}} completed',
      xpReward: '+{{points}} XP'
    },
    xpUntilNextLevel: '{{xp}} XP until Level {{level}}',
    dropdown: {
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Logout'
    },
    details: {
      joined: 'Join Date',
      lastActive: 'Last Active',
      studyStreak: 'Study Streak',
      totalStudyTime: 'Total Study Time',
      studySessions: 'Study Sessions',
      cardsLearned: 'Cards Learned',
      cardsMastered: 'Cards Mastered',
      averageAccuracy: 'Average Accuracy'
    },
    graphs: {
      cardsStudied: 'Cards Studied',
      accuracy: 'Accuracy Rate',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      studyTime: 'Study Time Distribution',
      weeklyActivity: 'Weekly Activity',
      masteryProgress: 'Mastery Progress',
      categoryProgress: 'Category Progress',
      hourlyActivity: 'Daily Time Activity',
      learningCurve: 'Learning Curve',
      minutes: 'minutes',
      cards: 'cards',
      today: 'Today',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      allTime: 'All Time',
      noData: 'No data available',
      earnedOn: 'Earned on: {{date}}'
    },
    stats: {
      dailyGoal: 'Daily Goal',
      weeklyGoal: 'Weekly Goal',
      monthlyGoal: 'Monthly Goal',
      achieved: 'Achieved',
      remaining: 'Remaining',
      averagePerDay: 'Average Per Day',
      bestStreak: 'Best Streak',
      totalDays: 'Total Study Days'
    }
  },
  home: {
    welcome: 'Welcome back',
    stats: {
      totalStudied: 'Total Studied',
      dueToday: 'Due Today',
      mastered: 'Mastered',
      streak: 'Day Streak',
      studyTime: 'Study Time',
      minutes: 'Minutes',
      totalCards: 'Total Cards',
      remainingToStudy: 'Remaining to Study',
      weeklyProgress: 'Weekly Progress',
      weeklyGoal: 'Weekly Goal',
      of: 'of',
      cardsMastered: 'cards mastered',
      minutesCompleted: 'minutes completed'
    },
    actions: {
      startStudying: 'Start Studying',
      importCards: 'Import Cards'
    },
    buttons: {
      startReview: 'Start Review',
      startReading: 'Start Reading',
      browse: 'Browse Library',
      addNewCards: 'Get New Cards'
    },
    cards: 'cards',
    progressOverview: 'Progress Overview',
    masteryProgress: 'Mastery Progress',
    totalMinutes: 'Total Minutes Studied',
    studyTime: 'Study Time Overview'
  },
  library: {
    title: 'Library',
    views: {
      grid: 'Grid View',
      categories: 'Categories'
    },
    noResults: 'No cards found',
    search: {
      placeholder: 'Search words...',
      noResults: 'No results found',
      categories: 'Categories'
    },
    cards: {
      difficulty: 'Difficulty',
      lastReviewed: 'Last Reviewed',
      nextReview: 'Next Review',
      notReviewed: 'Not yet reviewed'
    }
  },
  auth: {
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    signIn: 'Sign In',
    signUp: 'Sign Up',
    googleSignIn: 'Sign in with Google',
    errors: {
      failed: 'Failed to sign in',
      googleFailed: 'Failed to sign in with Google',
      passwordMatch: 'Passwords do not match',
      createAccount: 'Failed to create an account'
    }
  },
  study: {
    title: 'Study Session', 
    modes: {
      title: 'Study Mode', 
      flashcard: 'Flashcard',
      multipleChoice: 'Multiple Choice',
      matching: 'Matching',
      fillBlanks: 'Fill in Blanks'
    },
    controls: {
      showAnswer: 'Show Answer',
      hideAnswer: 'Hide Answer',
      next: 'Next',
      complete: 'Complete',
      saveExit: 'Save & Exit'
    },
    progress: {
      cardsCompleted: 'Cards Completed',
      cardsRemaining: 'Cards Remaining',
      sessionComplete: 'Session Complete!',
      accuracy: 'Accuracy',
      overall: 'Overall Progress',
      currentStreak: 'Current Streak',
      cardsProgress: 'Progress: {{reviewed}}/{{total}} cards',
      correct: 'Correct',
      incorrect: 'Incorrect',
      cardsTotal: 'Total Cards: {{total}}',
      cardsStudied: 'Cards Studied: {{count}}',
      cardProgress: 'Card {{current}} of {{total}}',
      progressCount: '{{completed}}/{{total}}',
    },
    feedback: {
      correct: 'Correct!',
      incorrect: 'Try Again',
      showAnswer: 'Show Answer'
    },
    errors: {
      loadingOptions: 'Failed to load options',
      loadingCards: 'Failed to load flashcards'
    },
    pomodoro: {
      focus: 'Focus Time',
      break: 'Break Time',
      start: 'Start',
      pause: 'Pause',
      reset: 'Reset',
      workTime: '{{minutes}} min work',
      breakTime: '{{minutes}} min break'
    },
    resume: {
      title: 'Resume Previous Session?',
      continueSession: 'Continue Session',
      newSession: 'Start New Session'
    },
    fillInBlanks: {
      placeholder: 'Type your answer here...'
    },
    matching: {
      pairFound: 'Good match!',
      pairNotFound: 'Try another pair',
      complete: 'All pairs matched!'
    }
  },
  import: {
    title: 'Import Flashcards',
    steps: {
      select: 'Select File',
      preview: 'Preview',
      import: 'Import'
    },
    preview: {
      title: 'Preview Import Data',
      rowsPerPage: 'Rows per page',
      validate: 'Validate Headers',
      import: 'Start Import',
      cancel: 'Cancel'
    },
    progress: {
      title: 'Import Progress',
      processed: 'Processed',
      success: 'Success',
      failed: 'Failed',
      complete: 'Import completed!',
      completeWithErrors: 'Import complete with errors'
    },
    manual: {
      word: 'Word',
      partOfSpeech: 'Part of Speech',
      englishDefinition: 'English Definition',
      chineseTranslation: 'Chinese Translation',
      categories: 'Categories',
      title: 'Manual Import',
      help: {
        word: 'Enter the vocabulary word',
        pos: 'e.g., noun, verb, adjective',
        definition: 'Enter English definition',
        translation: 'Enter Chinese translation',
        categories: 'Select or create categories',
        wordTooShort: 'Word must be at least 2 characters'
      },
      testTranslation: 'Test Translation',
      translationSuccess: 'Translation test successful',
      translating: 'Translating...',
      savedEntries: 'Saved Entries',
      importSaved: 'Import All Saved Entries'
    },
    actions: {
      upload: 'Upload CSV File',
      back: 'Back',
      startImport: 'Start Import',
      selectAll: 'Select All',
      clearSelection: 'Clear Selection',
      search: 'Search',
      importSaved: 'Import All Saved Entries',
    },
    errors: {
      importFailed: 'Import failed',
      fileReadError: 'Failed to read file',
      translationFailed: 'Auto-translation failed. Please enter translation manually.',
      noContent: 'Please enter English definition first',
      translationError: 'Translation failed: {{error}}',
      missingFields: 'Please fill in required fields (Word and English Definition)',
      emptyTranslation: 'Translation result is empty',
      uploadSuccess: 'Upload successful!',
      savingEntry: 'Saving entry...',
      deleteConfirm: 'Are you sure you want to delete this item?'
    },
    notifications: {
      saved: 'Entry saved',
      added: 'Added to import list',
      imported: 'Import complete',
      deleted: 'Entry deleted',
      progress: 'Processing...'
    },
    instructions: 'Upload a CSV file with two columns: front and back of the cards.',
    dropzone: {
      title: 'Drop files here or click to browse',
      accept: 'Accepts .csv files',
      maxSize: 'Max file size: 5MB',
      error: {
        fileType: 'Invalid file type. Only CSV files are accepted.',
        fileSize: 'File is too large. Maximum size is 5MB.'
      }
    },
    placeholder: {
      search: 'Search words...',
      manualInput: 'Enter one word per line'
    },
    fileImport: {
      title: 'File Import',
      selectFile: 'Select File',
      dragAndDrop: 'Drag and drop a CSV file here, or click to select',
      validate: 'Validate File'
    },
    manualEntry: {
      title: 'Manual Entry',
      addMore: 'Add More Words',
      saveEntry: 'Save Entry'
    }
  },
  worksheets: {
    title: 'My Worksheets',
    createNew: 'Create New',
    noWorksheets: 'No worksheets found',
    actions: {
      start: 'Start',
      continue: 'Continue',
      delete: 'Delete',
      edit: 'Edit',
      export: {
        pdf: 'Export as PDF',
        word: 'Export as Word'
      },
      viewAnswers: 'View Answers',
      back: 'Back to Worksheets',
      exit: 'Exit Worksheet'
    },
    difficulty: {
      difficulty: 'Difficulty',
      easy: 'Easy',
      medium: 'Medium',
      hard: 'Hard'
    },
    stats: {
      timeLimit: 'Time Limit',
      completed: 'Completed',
      minutes: 'min'
    },
    answerKey: {
      title: 'Answer Key',
      question: 'Question',
      navigation: {
        first: 'First',
        prev: 'Prev',
        next: 'Next',
        last: 'Last'
      }
    },
    errors: {
      noQuestions: 'No worksheet questions available',
      loadFailed: 'Failed to load worksheet'
    },
    question: 'Question {{current}} of {{total}}',
    answerPlaceholder: 'Enter your answer',
    form: {
      title: 'Create New Worksheet',
      inputMode: {
        database: 'From Database',
        manual: 'Manual Input'
      },
      words: 'Enter Words (one per line)',
      template: 'Template',
      timeLimit: 'Time Limit (minutes)',
      filterCategory: 'Filter by Category',
      allWords: 'All Words',
      searchWords: 'Search words...',
      templateHelp: 'Choose exercise type',
      categoryHelp: 'Filter words by category',
      timeHelp: '1-120 minutes',
      selectWords: 'Select Words',
      selectAll: 'Select All', 
      clearSelection: 'Clear Selection',
      searchPlaceholder: 'Search words to include...',
      manualInputPlaceholder: 'Enter one word per line',
      generatorTitle: 'Create Worksheet',
      wordInput: 'Enter Words'
    },
    templates: {
      comprehensivePractice: 'Comprehensive Practice',
      translationMastery: 'Translation Mastery',
      sentenceWriting: 'Sentence Writing',
      vocabularyQuiz: 'Vocabulary Quiz'
    },
    placeholder: {
      title: 'Enter worksheet title...',
      search: 'Search words to include...',
      manual: 'Enter one word per line'
    },
    labels: {
      status: 'Status: {{status}}',
      lastAttempted: 'Last attempted: {{date}}',
      timeEstimate: 'Estimated time: {{time}} min',
      totalQuestions: '{{count}} questions',
      inProgress: 'In Progress',
      notStarted: 'Not Started',
      completed: 'Completed'
    }
  },
  studyMode: {
    selected: 'Selected Mode',
  },
  navigation: {
    menu: {
      profile: 'Profile',
      settings: 'Settings',
      logout: 'Logout',
      home: 'Home',
      study: 'Study',
      worksheets: 'Worksheets',
      import: 'Import'
    },
    appName: 'FlashCards AI',
    level: 'Level'
  },
  forms: {
    worksheet: {
      title: 'Create Worksheet',
      titleLabel: 'Worksheet Title',
      difficulty: 'Difficulty',
      timeLimit: 'Time Limit (minutes)',
      categories: 'Categories',
      submit: 'Create Worksheet',
      cancel: 'Cancel',
      preview: 'Preview'
    },
    import: {
      selectFile: 'Select CSV File',
      dropzone: 'Drop files here or click to browse',
      format: 'File format: CSV with columns for word, definition, etc.',
      validateHeaders: 'Validate Headers',
      startImport: 'Start Import',
      cancel: 'Cancel',
      preview: 'Preview Data'
    }
  },
  "study.progress": {
    "overall": "Overall Progress",
    "complete": "Complete",
    "completed": "Completed",
    "remaining": "Remaining",
    "cardsCompleted": "cards completed",
    "correct": "Correct",
    "incorrect": "Incorrect",
    "accuracy": "Accuracy",
    "streak": "Streak"
  },
  "study.controls": {
    "saveExit": "Save & Exit"
  },
  reading: {
    tabs: {
      library: 'Article Library',
      import: 'Import Article',
      categories: 'Categories',
      recent: 'Recent',
      favorites: 'Favorites',
      manage: 'Manage Articles'
    },
    title: 'Reading Mode',
    library: {
      empty: 'No articles yet. Import some to get started!',
      articleCount: '{{count}} articles',
      sortBy: {
        recent: 'Most Recent',
        title: 'Title',
        readTime: 'Reading Time',
        progress: 'Progress'
      },
      filter: {
        all: 'All Articles',
        inProgress: 'In Progress',
        completed: 'Completed',
        unread: 'Unread'
      },
      search: 'Search articles...',
      categories: {
        all: 'All Categories',
        manage: 'Manage Categories'
      },
      stats: {
        totalArticles: '{{count}} articles',
        avgReadTime: 'Average read time: {{time}} min',
        totalReadTime: 'Total read time: {{time}} min'
      },
      tools: {
        import: 'Import New',
        manage: 'Manage Library',
        sync: 'Sync Progress',
        export: 'Export Data'
      },
      confirmations: {
        deleteArticle: 'Are you sure you want to delete this article?',
        clearLibrary: 'Are you sure you want to clear your library?',
      }
    },
    import: {
      title: 'Import Article',
      dropzone: {
        title: 'Drop ZIP file here or click to browse',
        description: 'Article package should contain details.json, content.txt and optional cover image',
        titleMultiple: 'Drop ZIP files here or click to browse',
        descriptionMultiple: 'You can select multiple article packages at once'
      },
      error: {
        invalidZip: 'Invalid ZIP file structure',
        missingFiles: 'Required files are missing',
        corrupted: 'Article content is corrupted',
        failed: 'Failed to import article',
        partialFail: 'Some articles failed to import'
      },
      success: {
        single: 'Article imported successfully',
        multiple: 'All articles imported successfully'
      },
      validation: {
        checking: 'Checking file structure...',
        validating: 'Validating content...',
        success: 'File structure is valid',
        preparing: 'Preparing to import...'
      },
      settings: {
        extractLinks: 'Extract links',
        autoCategories: 'Auto-categorize',
        parseMetadata: 'Parse metadata'
      },
      status: {
        queued: 'Queued',
        processing: 'Processing',
        failed: 'Failed',
        completed: 'Completed'
      }
    },
    interface: {
      readingTime: '{{minutes}} min read',
      wordCount: '{{count}} words',
      startReading: 'Start Reading',
      continueReading: 'Continue Reading',
      focusMode: 'Focus Mode',
      addToFlashcards: 'Add to Flashcards',
      textToSpeech: 'Text to Speech',
      search: 'Search articles...',
      progress: {
        progress: '{{percent}}% completed',
        importing: 'Importing article...',
        analyzing: 'Analyzing content...',
        saving: 'Saving article...',
        error: {
          fileStructure: 'Invalid file structure',
          fileSize: 'File too large',
          fileType: 'Invalid file type',
          parsing: 'Error parsing content',
          network: 'Network error',
          unknown: 'Unknown error occurred'
        },
        success: 'Article successfully imported'
      }
    },
    dictionary: {
      addToFlashcards: 'Add to Flashcards'
    },
    manage: {
      title: 'Manage Articles',
      deleteSelected: 'Delete Selected ({{count}})',
      never: 'Never',
      confirmDelete: 'Delete',
      deleteConfirmTitle: 'Confirm Deletion',
      deleteConfirmMessage: 'Are you sure you want to delete {{count}} selected articles? This action cannot be undone.',
      error: {
        deleteFailed: 'Failed to delete articles'
      },
      columns: {
        title: 'Title',
        category: 'Category',
        wordCount: 'Words',
        lastRead: 'Last Read',
        progress: 'Progress'
      }
    }
  }
};
