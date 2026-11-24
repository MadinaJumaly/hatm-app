// All Kazakh UI texts (design §J). Taken from the mockups; the texts for states the mockups
// don't draw were checked and approved by the developer in T3.6 (22.10.2026).

export const texts = {
  appName: "Хатм",
  loading: "Жүктелуде…",

  // Bad link
  badLinkTitle: "Сілтеме қате",
  badLinkHint: "Сілтемені хатм ұйымдастырушысынан қайта сұраңыз.",

  // 1 · Name list
  welcome: "Хатмға қош келдіңіз",
  untilDate: (durationDays: number, date: string) => `${String(durationDays)} күн · ${date} дейін`,
  chooseName: "Атыңызды таңдаңыз",
  chooseNameHint: "Тізімнен өз есіміңізді басыңыз.",
  juzLabel: (juz: number) => `${String(juz)}-пара`,

  // 2 · PIN
  chooseOtherName: "Басқа есімді таңдау",
  pinCreateHint:
    "Бірінші рет кіріп тұрсыз. 4 саннан тұратын PIN-код ойлап табыңыз. Келесі жолы осы кодпен кіресіз.",
  pinEnterHint: "PIN-кодыңызды енгізіңіз.",
  pinLabel: "PIN-код",
  pinRepeatLabel: "PIN-кодты қайталаңыз",
  pinCreateButton: "Сақтау және кіру",
  pinEnterButton: "Кіру",
  pinForgot: "Кодты ұмытып қалсаңыз, хатм ұйымдастырушысына жазыңыз — ол кодты қалпына келтіреді.",
  pinNeedFourDigits: "4 сан енгізіңіз.",
  pinMismatch: "PIN-кодтар сәйкес келмейді. Қайта енгізіңіз.",
  pinWrong: (triesLeft: number) => `PIN қате. Тағы ${String(triesLeft)} рет көруге болады.`,
  pinAlreadySet: "Бұл есімге PIN-код қойылған. PIN-кодты енгізіңіз.",
  tryLater: (minutes: number) =>
    `${String(minutes)} минуттан кейін қайталаңыз немесе ұйымдастырушыға жазыңыз.`,

  // 3–4 · Home
  hello: (name: string) => `Сәлем, ${name}`,
  logout: "Шығу",
  logoutQuestion: "Шығасыз ба? Осы телефонда басқа адам өз есімін таңдай алады.",
  logoutYes: "Иә, шығу",
  no: "Жоқ",
  pages: (first: number, last: number) => `${String(first)}–${String(last)} бет`,
  deadline: "Мерзімі",
  left: "Қалды",
  daysLeft: (days: number) => `${String(days)} күн`,
  lastDay: "Бүгін соңғы күн",
  noSeat: "Сізге пара берілмеген. Ұйымдастырушыға жазыңыз.",
  markRead: "Оқыдым",
  marked: "Белгіленді",
  undo: "Қайтару",
  undoHint: "Қате басып қалсаңыз, 15 секунд ішінде қайтара аласыз.",
  thanks: "Рақмет! Сіз бұл параны оқыдыңыз.",
  removeMark: "Белгіні алып тастау",
  removeQuestion: "Белгіні алып тастайсыз ба?",
  removeExplain: (juz: number) => `${String(juz)}-пара қайтадан «Оқылмаған» болады.`,
  removeYes: "Иә, алып тастау",
  markRemoved: "Белгі алынды.",

  // Progress and list
  progress: "Прогресс",
  refresh: "Жаңарту",
  refreshing: "Жаңартылуда…",
  readOf: "/ 30 оқылды",
  updatedAt: (when: string) => `Жаңартылды: ${when}`,
  today: "бүгін",
  offlineBanner: "Интернет жоқ. Соңғы сақталған деректер көрсетілген.",

  // Install help (mockup 3, P-6)
  install: {
    title: "Телефонға орнату",
    iphone: "iPhone (Safari)",
    iphoneSteps: [
      "Төмендегі «Бөлісу» батырмасын басыңыз",
      "«Басты экранға қосу» дегенді таңдаңыз.",
      "«Қосу» батырмасын басыңыз.",
    ],
    shareIcon: "Бөлісу белгісі",
    iphoneNote: "Орнатқаннан кейін PIN-кодты тағы бір рет енгізесіз.",
    android: "Android (Chrome)",
    androidSteps: [
      "Жоғарғы оң жақтағы ⋮ мәзірін басыңыз.",
      "«Басты экранға қосу» немесе «Қолданбаны орнату» дегенді таңдаңыз.",
    ],
    androidButton: "Қолданбаны орнату",
  },
  finished: "Хатм аяқталды",
  allJuz: "Барлық паралар",
  you: " · Сіз",
  nobody: "Ешкім жоқ",
  pullToRefresh: "Жаңарту үшін босатыңыз",

  // Statuses (icon + text, never colour alone)
  status: {
    read: "Оқылды",
    unread: "Оқылмаған",
    overdue: "Мерзімі өтті",
    free: "Бос",
  },

  // Errors (design §D error codes)
  offline: "Интернет жоқ. Қайталап көріңіз.",
  forbidden: "Рұқсат жоқ.",
  serverError: "Қате шықты, қайталап көріңіз.",
  retry: "Қайталау",

  // Organizer (mockups 5–6; texts for screens not drawn were checked in T3.6)
  org: {
    role: "Ұйымдастырушы",
    loginTitle: "Ұйымдастырушы",
    username: "Логин",
    password: "Құпия сөз",
    login: "Кіру",
    wrongLogin: "Логин немесе құпия сөз қате.",
    groupsTitle: "Хатмдар",
    newKhatm: "Жаңа хатм құру",
    noGroups: "Әзірге хатм жоқ. «Жаңа хатм құру» батырмасын басыңыз.",
    open: "Ашу",
    copyLink: "Сілтемені көшіру",
    copy: "Көшіру",
    copied: "Көшірілді",
    copyByHand: "Сілтемені белгілеп, көшіріңіз.",
    groupLink: "Топ сілтемесі",
    deadlineLine: (date: string, state: string) => `Мерзімі: ${date} · ${state}`,
    daysLeft: (days: number) => `${String(days)} күн қалды`,
    onlyUnread: (count: number) => `Тек оқылмағандар (${String(count)})`,
    change: "Өзгерту",
    changeLabel: (juz: number) => `${String(juz)}-параны өзгерту`,
    sheetTitle: (juz: number, name: string) => `${String(juz)}-пара · ${name}`,
    sheetPages: (first: number, last: number) => `${String(first)}–${String(last)} беттер`,
    markOnBehalf: "Оқылды деп белгілеу",
    unmarkOnBehalf: "Белгіні алу",
    resetPin: "PIN-кодты қалпына келтіру",
    resetPinHint: (name: string) => `${name} келесі кіргенде жаңа код ойлап табады.`,
    noPinYet: (name: string) => `${name} әлі PIN-код ойлап таппаған.`,
    resetPinQuestion: "PIN-кодты қалпына келтіресіз бе?",
    resetPinYes: "Иә, қалпына келтіру",
    close: "Жабу",
    markedOnBehalf: (juz: number) => `${String(juz)}-пара оқылды деп белгіленді.`,
    unmarkedOnBehalf: (juz: number) => `${String(juz)}-пара: белгі алынды.`,
    pinResetDone: (name: string) => `${name}: PIN-код қалпына келтірілді.`,
    notFound: "Хатм табылмады.",

    // Create a khatm (O-7)
    createTitle: "Жаңа хатм",
    titleLabel: "Атауы",
    durationLabel: "Мерзімі",
    durationOption: (days: number) => `${String(days)} күн`,
    namesLabel: "Есімдер (әр жолда біреу)",
    namesHint: "1-жолдағы адам 1-параны оқиды, 2-жолдағы адам 2-параны, т.с.с. Ең көбі 30 есім.",
    preview: "Алдын ала қарау",
    previewFree: (count: number) => `Қалған ${String(count)} пара — Бос`,
    create: "Құру",
    created: "Хатм құрылды. Сілтемені көшіріп, топқа жіберіңіз.",
    titleRequired: "Атауын жазыңыз.",
    titleTooLong: "Атауы 80 таңбадан аспауы керек.",
    durationInvalid: "Мерзімді таңдаңыз.",
    namesEmpty: "Кемінде бір есім жазыңыз.",
    namesInvalid: "Есімдер тізімі қате.",
    namesTooMany: (count: number) => `Ең көбі 30 есім. Қазір: ${String(count)}.`,
    nameTooLong: (line: number) => `${String(line)}-жол: есім 40 таңбадан аспауы керек.`,
    nameBadChars: (line: number) =>
      `${String(line)}-жол: тек әріптер, бос орын, нүкте, сызықша және апостроф жазуға болады.`,
    nameDuplicate: (line: number, firstLine: number) =>
      `${String(line)}-жол: бұл есім ${String(firstLine)}-жолда бар.`,
  },

  // Dates
  months: [
    "қаңтар",
    "ақпан",
    "наурыз",
    "сәуір",
    "мамыр",
    "маусым",
    "шілде",
    "тамыз",
    "қыркүйек",
    "қазан",
    "қараша",
    "желтоқсан",
  ],
  /** "…қа/ке дейін" form of each month (name list subtitle). */
  monthsUntil: [
    "қаңтарға",
    "ақпанға",
    "наурызға",
    "сәуірге",
    "мамырға",
    "маусымға",
    "шілдеге",
    "тамызға",
    "қыркүйекке",
    "қазанға",
    "қарашаға",
    "желтоқсанға",
  ],
  /** Sunday first, like Date.getUTCDay(). */
  weekdays: ["жексенбі", "дүйсенбі", "сейсенбі", "сәрсенбі", "бейсенбі", "жұма", "сенбі"],
} as const;
