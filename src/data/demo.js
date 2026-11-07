export const demoStories = [
  {
    id: "quiet-design-systems",
    title: "Designing a system that leaves room for surprise",
    titleZh: "为惊喜留出空间的设计系统",
    summary: "A practical look at semantic tokens, expressive corners, and interfaces that remain calm while content changes.",
    summaryZh: "从语义化令牌、表现力圆角到内容变化时的稳定界面，探讨一套克制而灵活的设计系统。",
    category: "design",
    topics: ["systems", "typography"],
    date: "2026-10-18",
    minutes: 7,
    featured: true,
    cover: "public/assets/demo/systems.svg"
  },
  {
    id: "portrait-navigation",
    title: "A navigation pattern for portrait screens",
    titleZh: "适合竖屏的导航模式",
    summary: "Turn a wide-screen rail into a compact header control without losing keyboard access or state.",
    summaryZh: "把宽屏侧栏转化为紧凑的页眉控件，同时保留键盘访问与导航状态。",
    category: "web",
    topics: ["responsive", "accessibility"],
    date: "2026-10-11",
    minutes: 5,
    cover: "public/assets/demo/portrait.svg"
  },
  {
    id: "palette-with-memory",
    title: "Give the palette a memory",
    titleZh: "让配色记住读者",
    summary: "Persist theme choices while keeping a safe default for first-time readers and reduced-motion preferences.",
    summaryZh: "持久保存主题选择，同时为首次访问者和减少动态效果偏好提供安全默认值。",
    category: "systems",
    topics: ["css", "preferences"],
    date: "2026-10-04",
    minutes: 6,
    cover: "public/assets/demo/palette.svg"
  },
  {
    id: "edges-and-baselines",
    title: "Edges, baselines, and rounded controls",
    titleZh: "圆角边界与文字基线",
    summary: "Large corner radii need proportional padding so labels never crowd the curved boundary.",
    summaryZh: "大圆角需要成比例的内边距，避免标签文字贴近弯曲边界。",
    category: "design",
    topics: ["layout", "typography"],
    date: "2026-09-27",
    minutes: 4,
    cover: "public/assets/demo/baseline.svg"
  },
  {
    id: "content-before-chrome",
    title: "Content before chrome",
    titleZh: "让内容先于装饰",
    summary: "A compact reading frame keeps the article hierarchy visible while atmosphere stays in the background.",
    summaryZh: "紧凑的阅读框架让文章层级保持清晰，把氛围留在背景中。",
    category: "culture",
    topics: ["editorial", "reading"],
    date: "2026-09-20",
    minutes: 8,
    cover: "public/assets/demo/editorial.svg"
  },
  {
    id: "progressive-drawer",
    title: "Progressive enhancement for a drawer",
    titleZh: "渐进增强的抽屉导航",
    summary: "Simple semantic markup, explicit navigation state, and accessible controls before animation.",
    summaryZh: "先保证语义化结构、明确状态与可访问控件，再添加动画。",
    category: "web",
    topics: ["javascript", "accessibility"],
    date: "2026-09-13",
    minutes: 5,
    cover: "public/assets/demo/drawer.svg"
  }
];

export const demoTopicCatalog = [
  { key: "systems", count: 4 },
  { key: "typography", count: 3 },
  { key: "responsive", count: 4 },
  { key: "accessibility", count: 3 },
  { key: "css", count: 5 },
  { key: "preferences", count: 2 },
  { key: "layout", count: 4 },
  { key: "editorial", count: 2 },
  { key: "reading", count: 1 },
  { key: "javascript", count: 3 },
  { key: "animation", count: 2 },
  { key: "documentation", count: 2 }
];

export const demoCopy = {
  en: {
    categories: {
      all: "All",
      design: "Design",
      web: "Web",
      systems: "Systems",
      culture: "Culture"
    },
    topics: {
      systems: "Systems",
      typography: "Typography",
      responsive: "Responsive",
      accessibility: "Accessibility",
      css: "CSS",
      preferences: "Preferences",
      layout: "Layout",
      editorial: "Editorial",
      reading: "Reading",
      javascript: "JavaScript",
      animation: "Animation",
      documentation: "Documentation"
    }
  },
  zh: {
    categories: {
      all: "全部",
      design: "设计",
      web: "网页",
      systems: "系统",
      culture: "文化"
    },
    topics: {
      systems: "设计系统",
      typography: "排版",
      responsive: "响应式",
      accessibility: "无障碍",
      css: "CSS",
      preferences: "偏好设置",
      layout: "布局",
      editorial: "编辑设计",
      reading: "阅读",
      javascript: "JavaScript",
      animation: "动画",
      documentation: "文档"
    }
  }
};

export const demoFriends = [
  {
    name: "Aurora Notes",
    domain: "aurora.example",
    description: "Editorial experiments and slow software.",
    descriptionZh: "编辑设计与慢软件实验记录。",
    glyph: "AN"
  },
  {
    name: "Moss Laboratory",
    domain: "moss.example",
    description: "Small tools for gardens and local-first data.",
    descriptionZh: "面向花园与本地优先数据的小工具。",
    glyph: "ML"
  },
  {
    name: "Paper Orbit",
    domain: "paper-orbit.example",
    description: "A fictional journal about objects and memory.",
    descriptionZh: "关于物件与记忆的虚构日志。",
    glyph: "PO"
  },
  {
    name: "Quiet Terminal",
    domain: "quiet-terminal.example",
    description: "Friendly notes on systems and observability.",
    descriptionZh: "关于系统与可观测性的友好笔记。",
    glyph: "QT"
  },
  {
    name: "Studio Hana",
    domain: "hana.example",
    description: "Color studies and modular visual identities.",
    descriptionZh: "色彩研究与模块化视觉识别。",
    glyph: "SH"
  },
  {
    name: "Tiny Index",
    domain: "tiny-index.example",
    description: "A generated catalog of useful fragments.",
    descriptionZh: "由有用片段组成的虚构目录。",
    glyph: "TI"
  }
];

export const demoAnnouncements = [
  {
    type: "framework",
    date: "2026-10-20",
    title: "Meterial Extra 1.1 released",
    titleZh: "Meterial Extra 1.1 发布",
    body: "The demo now includes generated archive, friend-link, announcement, and about pages.",
    bodyZh: "演示站新增了生成的归档、友链、公告和关于页面。"
  },
  {
    type: "content",
    date: "2026-10-12",
    title: "API templates are now documented",
    titleZh: "接口模板文档已加入",
    body: "Connect a compatible endpoint through the public configuration example without committing private data.",
    bodyZh: "通过公开配置示例连接兼容接口，无需提交私有数据。"
  },
  {
    type: "design",
    date: "2026-10-03",
    title: "Corner-safe controls",
    titleZh: "圆角安全控件",
    body: "Chips and compact buttons now keep text away from strongly curved edges.",
    bodyZh: "标签和紧凑按钮的文本现在会避开大圆角边缘。"
  }
];
