import { demoAnnouncements, demoCopy, demoFriends, demoStories, demoTopicCatalog } from "../data/demo.js";
import { contentApi } from "./api.js";
import { MeterialExtra, initTheme } from "./theme.js";

initTheme();
document.body.dataset.contentMode = contentApi.mode;
const apiConfigCode = document.querySelector(".api-template-card code");
if (apiConfigCode && contentApi.mode === "remote") {
  apiConfigCode.textContent = `mode=remote · ${window.METERIAL_EXTRA_CONFIG.apiBaseUrl}`;
}

const LANGUAGE_KEY = "meterial-extra-language";
const languageCopy = {
  en: {
    framework: "FRAMEWORK",
    navOverview: "Overview",
    navStories: "Stories",
    navArchive: "Archive",
    navFriends: "Friends",
    navAnnouncements: "Announcements",
    navAbout: "About",
    navComponents: "Components",
    navPalettes: "Palettes",
    openSource: "OPEN SOURCE",
    mitLicensed: "MIT licensed",
    sidebarDescription: "Fork it, adapt it, and replace the demo with your own content.",
    viewRepository: "View repository ↗",
    productionExample: "Production example: shawnho.top ↗",
    heroEyebrow: "METERIAL EXTRA · DESIGN SYSTEM",
    heroTitle: "A calm frame for <em>expressive content.</em>",
    heroDescription: "An open Material-inspired theme with room for editorial layouts, technical notes, journals, and curated collections.",
    exploreDemo: "Explore demo",
    readDocs: "Read documentation →",
    runtimeDependencies: "runtime dependencies",
    palettes: "palettes",
    sourceLicense: "source license",
    generatedPage: "GENERATED PAGE",
    archiveTitle: "A generated archive layout.",
    friendsTitle: "Fictional friend-link cards.",
    announcementsTitle: "Generated announcement notes.",
    aboutTemplateTitle: "A blank frame for your own story.",
    aboutTemplateText: "This page shows the structure, typography, and content rhythm. Replace the generated copy through the content adapter or connect an API endpoint using the included configuration template.",
    configPointOne: "Semantic layout",
    configPointTwo: "Replaceable content",
    configPointThree: "No private API data",
    apiTemplateTitle: "Connect your own service",
    openConfig: "Open configuration example →",
    generatedDemo: "GENERATED DEMO CONTENT",
    storiesTitle: "Fresh stories, no personal data.",
    searchLabel: "Search demo stories",
    searchPlaceholder: "Search generated stories",
    stories: "Stories",
    topics: "Topics",
    minRead: "Min read",
    showAll: "Show all",
    showFewer: "Show fewer",
    frameworkParts: "FRAMEWORK PARTS",
    componentsTitle: "Small pieces, coherent behavior.",
    actionSystem: "Action system",
    actionDescription: "Rounded controls share one radius token and preserve a centered text baseline.",
    primary: "Primary",
    secondary: "Secondary",
    quiet: "Quiet",
    responsiveNavigation: "Responsive navigation",
    responsiveDescription: "A rail on wide screens becomes a compact drawer on narrow and portrait layouts.",
    toggleDrawer: "Toggle drawer",
    tokenShape: "Token-driven shape",
    tokenDescription: "Switch the global corner style and every participating component follows.",
    livePalettes: "LIVE PALETTES",
    themesTitle: "Set the atmosphere without changing the layout.",
    themesDescription: "Each palette supplies the same semantic roles, so components remain readable in light and dark modes.",
    footerDescription: "An open theme and frontend framework for expressive content.",
    brandAssets: "Brand assets",
    contribute: "Contribute",
    deployGuide: "Deployment guide",
    resultOne: "1 demo story",
    resultMany: "{count} demo stories",
    empty: "No demo stories match this filter.",
    minutes: "{count} min read",
    radiusSoft: "Soft",
    radiusRounded: "Rounded",
    radiusExpressive: "Expressive",
    darkMode: "Switch to dark mode",
    lightMode: "Switch to light mode",
    switchLanguage: "Switch to Chinese",
    pageTitle: "Meterial Extra — Open Theme Framework"
  },
  zh: {
    framework: "框架",
    navOverview: "概览",
    navStories: "文章演示",
    navArchive: "归档",
    navFriends: "友链",
    navAnnouncements: "公告",
    navAbout: "关于",
    navComponents: "组件",
    navPalettes: "配色",
    openSource: "开源项目",
    mitLicensed: "MIT 开源许可",
    sidebarDescription: "可自由复刻、改造，并用你自己的内容替换演示数据。",
    viewRepository: "查看代码仓库 ↗",
    productionExample: "生产示例：shawnho.top ↗",
    heroEyebrow: "METERIAL EXTRA · 设计系统",
    heroTitle: "为<em>富有表现力的内容</em>提供从容框架。",
    heroDescription: "一套开放的 Material 风格主题，适合编辑排版、技术笔记、日常记录和精选内容合集。",
    exploreDemo: "浏览演示",
    readDocs: "阅读文档 →",
    runtimeDependencies: "运行时依赖",
    palettes: "套配色",
    sourceLicense: "源代码许可",
    generatedPage: "生成页面",
    archiveTitle: "自动生成的归档布局。",
    friendsTitle: "虚构的友链卡片。",
    announcementsTitle: "自动生成的公告记录。",
    aboutTemplateTitle: "为你的故事保留空白框架。",
    aboutTemplateText: "此页面展示结构、排版与内容节奏。你可以通过内容适配器替换生成文案，或使用仓库中的配置模板连接自己的接口。",
    configPointOne: "语义化布局",
    configPointTwo: "可替换内容",
    configPointThree: "不包含私有接口数据",
    apiTemplateTitle: "连接你自己的服务",
    openConfig: "打开配置示例 →",
    generatedDemo: "全新生成的演示内容",
    storiesTitle: "全新文章，不包含个人信息。",
    searchLabel: "搜索演示文章",
    searchPlaceholder: "搜索生成的演示文章",
    stories: "文章",
    topics: "话题",
    minRead: "分钟阅读",
    showAll: "展开全部",
    showFewer: "收起",
    frameworkParts: "框架组件",
    componentsTitle: "小部件，一致行为。",
    actionSystem: "操作体系",
    actionDescription: "圆角控件共享同一套尺寸令牌，并保持文字基线居中。",
    primary: "主要按钮",
    secondary: "次要按钮",
    quiet: "弱化按钮",
    responsiveNavigation: "响应式导航",
    responsiveDescription: "宽屏侧栏会在窄屏和竖屏中转化为紧凑抽屉。",
    toggleDrawer: "切换抽屉",
    tokenShape: "令牌驱动的形状",
    tokenDescription: "切换全局圆角样式，所有参与组件会同步变化。",
    livePalettes: "实时配色",
    themesTitle: "不改变布局，也能切换页面氛围。",
    themesDescription: "每套配色提供相同的语义角色，因此组件在深浅模式下都保持清晰。",
    footerDescription: "面向表达型内容的开放主题和前端框架。",
    brandAssets: "品牌资源",
    contribute: "参与贡献",
    deployGuide: "部署指南",
    resultOne: "1 篇演示文章",
    resultMany: "{count} 篇演示文章",
    empty: "没有符合当前条件的演示文章。",
    minutes: "{count} 分钟阅读",
    radiusSoft: "柔和",
    radiusRounded: "圆润",
    radiusExpressive: "表现力",
    darkMode: "切换为深色模式",
    lightMode: "切换为浅色模式",
    switchLanguage: "切换为英文",
    pageTitle: "Meterial Extra — 开源主题框架"
  }
};

const paletteNames = {
  en: { lilac: "Lilac", rose: "Rose", ocean: "Ocean", moss: "Moss" },
  zh: { lilac: "丁香紫", rose: "玫瑰红", ocean: "海洋蓝", moss: "苔藓绿" }
};

let language = "en";
try {
  language = localStorage.getItem(LANGUAGE_KEY) === "zh" ? "zh" : "en";
} catch {
  language = "en";
}

const storyGrid = document.querySelector("#story-grid");
const searchInput = document.querySelector("#story-search");
const resultCount = document.querySelector("#result-count");
const categoryControl = document.querySelector("#category-control");
const topicList = document.querySelector("#topic-list");
const topicToggle = document.querySelector("#topic-toggle");
const languageToggle = document.querySelector("#language-toggle");
const categories = ["all", ...new Set(demoStories.map((story) => story.category))];
const queryState = { category: "all", topic: "", search: "" };

function text(key) {
  return languageCopy[language][key] ?? key;
}

function localizedStory(story) {
  return {
    ...story,
    displayTitle: language === "zh" ? story.titleZh : story.title,
    displaySummary: language === "zh" ? story.summaryZh : story.summary
  };
}

function formatDate(value) {
  return new Intl.DateTimeFormat(language === "zh" ? "zh-CN" : "en", {
    year: "numeric",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

function filteredStories() {
  const query = queryState.search.trim().toLowerCase();
  return demoStories.map(localizedStory).filter((story) => {
    if (queryState.category !== "all" && story.category !== queryState.category) return false;
    if (queryState.topic && !story.topics.includes(queryState.topic)) return false;
    if (!query) return true;
    const topicNames = story.topics.map((key) => demoCopy[language].topics[key]);
    return [
      story.title,
      story.titleZh,
      story.summary,
      story.summaryZh,
      demoCopy.en.categories[story.category],
      demoCopy.zh.categories[story.category],
      ...topicNames
    ].some((value) => value.toLowerCase().includes(query));
  });
}

function renderStories() {
  const visible = filteredStories();
  resultCount.textContent = visible.length === 1
    ? text("resultOne")
    : text("resultMany").replace("{count}", String(visible.length));
  storyGrid.innerHTML = visible.length
    ? visible.map((story) => `
      <article class="story-card ${story.featured ? "featured" : ""}">
        <div class="story-cover"><img src="${story.cover}" alt="" loading="lazy" decoding="async"></div>
        <div class="story-meta">
          <span class="story-category">${demoCopy[language].categories[story.category]}</span>
          <time datetime="${story.date}">${formatDate(story.date)}</time>
          <span>${text("minutes").replace("{count}", String(story.minutes))}</span>
        </div>
        <h3>${story.displayTitle}</h3>
        <p>${story.displaySummary}</p>
        <div class="story-footer">
          <div class="story-tags">${story.topics.map((topic) => `<span>#${demoCopy[language].topics[topic]}</span>`).join("")}</div>
          <span class="story-arrow" aria-hidden="true">↗</span>
        </div>
      </article>
    `).join("")
    : `<div class="empty-state">${text("empty")}</div>`;
}

function renderArchive() {
  const groups = Object.groupBy(
    demoStories.map(localizedStory).sort((a, b) => b.date.localeCompare(a.date)),
    (story) => story.date.slice(0, 4)
  );
  document.querySelector("#archive-grid").innerHTML = Object.entries(groups).map(([year, stories]) => `
    <article class="archive-card">
      <div class="archive-year">${year}</div>
      <div class="archive-list">
        ${stories.map((story) => `<div class="archive-row"><time>${formatDate(story.date)}</time><span>${story.displayTitle}</span><small>${story.minutes} min</small></div>`).join("")}
      </div>
    </article>
  `).join("");
}

function renderFriends() {
  document.querySelector("#friend-grid").innerHTML = demoFriends.map((friend) => `
    <article class="friend-card">
      <span class="friend-mark">${friend.glyph}</span>
      <div><h3>${friend.name}</h3><small>${friend.domain}</small><p>${language === "zh" ? friend.descriptionZh : friend.description}</p></div>
      <span aria-hidden="true">↗</span>
    </article>
  `).join("");
}

function renderAnnouncements() {
  document.querySelector("#announcement-grid").innerHTML = demoAnnouncements.map((announcement) => `
    <article class="announcement-card">
      <div class="announcement-meta"><span>${announcement.type}</span><time>${formatDate(announcement.date)}</time></div>
      <h3>${language === "zh" ? announcement.titleZh : announcement.title}</h3>
      <p>${language === "zh" ? announcement.bodyZh : announcement.body}</p>
    </article>
  `).join("");
}

function renderCategories() {
  categoryControl.innerHTML = categories.map((category) => `
    <button class="category-button ${category === queryState.category ? "active" : ""}" type="button" data-category="${category}" aria-pressed="${category === queryState.category}">${demoCopy[language].categories[category]}</button>
  `).join("");
}

function renderTopics() {
  topicList.innerHTML = demoTopicCatalog.map((topic) => `
    <button class="topic-button ${topic.key === queryState.topic ? "active" : ""}" type="button" data-topic="${topic.key}" aria-pressed="${topic.key === queryState.topic}">${demoCopy[language].topics[topic.key]}<span>${topic.count}</span></button>
  `).join("");
  document.querySelector("#stat-stories").textContent = String(demoStories.length);
  document.querySelector("#stat-topics").textContent = String(demoTopicCatalog.length);
}

function renderPalettes() {
  const paletteGrid = document.querySelector("#palette-grid");
  paletteGrid.innerHTML = ["lilac", "rose", "ocean", "moss"].map((palette) => `
    <button class="palette-button" type="button" data-palette="${palette}" aria-pressed="false">${paletteNames[language][palette]}</button>
  `).join("");
  const active = document.documentElement.dataset.palette;
  paletteGrid.querySelector(`[data-palette="${active}"]`)?.classList.add("active");
}

function syncModeLabel() {
  const dark = document.documentElement.dataset.mode === "dark";
  document.querySelector("#mode-toggle")?.setAttribute("aria-label", text(dark ? "lightMode" : "darkMode"));
}

function applyLanguage(nextLanguage, { render = true } = {}) {
  language = nextLanguage === "zh" ? "zh" : "en";
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = text(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-html]").forEach((element) => {
    element.innerHTML = text(element.dataset.i18nHtml);
  });
  languageToggle.textContent = language === "zh" ? "EN" : "中文";
  languageToggle.setAttribute("aria-label", text("switchLanguage"));
  searchInput.placeholder = text("searchPlaceholder");
  searchInput.setAttribute("aria-label", text("searchLabel"));
  const topicCollapsed = topicList.classList.contains("is-collapsed");
  topicToggle.textContent = text(topicCollapsed ? "showAll" : "showFewer");
  const radii = {
    soft: text("radiusSoft"),
    rounded: text("radiusRounded"),
    expressive: text("radiusExpressive")
  };
  document.querySelectorAll("#radius-select option").forEach((option) => {
    option.textContent = radii[option.value];
  });
  document.title = text("pageTitle");
  syncModeLabel();
  if (render) {
    renderCategories();
    renderTopics();
    renderPalettes();
    renderStories();
    renderArchive();
    renderFriends();
    renderAnnouncements();
  }
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    // The current page still switches when storage is unavailable.
  }
}

renderCategories();
renderTopics();
renderPalettes();
renderStories();
renderArchive();
renderFriends();
renderAnnouncements();
applyLanguage(language, { render: false });

categoryControl.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  queryState.category = button.dataset.category;
  renderCategories();
  renderStories();
});

topicList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-topic]");
  if (!button) return;
  queryState.topic = queryState.topic === button.dataset.topic ? "" : button.dataset.topic;
  renderTopics();
  renderStories();
});

searchInput.addEventListener("input", () => {
  queryState.search = searchInput.value;
  renderStories();
});

topicToggle.addEventListener("click", () => {
  const collapsed = topicList.classList.toggle("is-collapsed");
  topicToggle.textContent = text(collapsed ? "showAll" : "showFewer");
  topicToggle.setAttribute("aria-expanded", String(!collapsed));
});

document.querySelector("#palette-grid").addEventListener("click", (event) => {
  const button = event.target.closest("[data-palette]");
  if (button) MeterialExtra.setPalette(button.dataset.palette);
});

document.querySelector("#mode-toggle").addEventListener("click", () => {
  const current = document.documentElement.dataset.mode === "dark" ? "dark" : "light";
  MeterialExtra.setColorMode(current === "dark" ? "light" : "dark");
  syncModeLabel();
});

languageToggle.addEventListener("click", () => {
  applyLanguage(language === "zh" ? "en" : "zh");
});

document.querySelector("#radius-select").addEventListener("change", (event) => {
  MeterialExtra.setRadius(event.target.value);
});

document.querySelector("#nav-toggle").addEventListener("click", () => {
  MeterialExtra.openNavigation();
});

document.querySelector("#demo-nav").addEventListener("click", () => {
  MeterialExtra.openNavigation(true);
});

document.querySelector("#nav-scrim").addEventListener("click", () => {
  MeterialExtra.openNavigation(false);
});

document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => MeterialExtra.openNavigation(false));
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") MeterialExtra.openNavigation(false);
});
