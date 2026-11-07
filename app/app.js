
// Menus use canonical page URLs; existing hash bookmarks remain supported.
const PUBLIC_ROUTES = {"home": "/", "archive": "/archive", "minecraft": "/minecraft", "mirrors": "/mirrors", "thoughts": "/thoughts", "support": "/support", "friends": "/friends", "about": "/about", "announcements": "/announcements", "articles": "/articles", "search": "/search", "profile": "/profile", "privacy": "/privacy", "cookies": "/cookies", "terms": "/terms", "copyright": "/copyright", "disclaimer": "/disclaimer"};
const legacyMenu = location.hash.slice(1).split('?')[0];
if (Object.prototype.hasOwnProperty.call(PUBLIC_ROUTES, legacyMenu)) {
  history.replaceState(null, '', PUBLIC_ROUTES[legacyMenu] + location.search);
}

let site = { profile: {}, posts: [], categories: [], tags: [], theme: {} };
let language = localStorage.getItem('blog-language') || 'zh';
let currentUser = null;
let currentPage = 1;
let currentQuery = { category: '', q: location.pathname === '/search' ? (new URLSearchParams(location.search).get('q') || '') : '' };
let turnstileSiteKey = '';
let turnstileWidgetId = null;
let resetTurnstileWidgetId = null;
let oauthTurnstileWidgetId = null;
let articleData = null;
let refreshEmailCodeLabel = null;
let refreshResetEmailCodeLabel = null;
let activePublicUserId = '';
let activePublicUser = null;
let activePublicProfileStats = null;
let commentPage = 1;
let pendingCommentImageUrls = [];
let friendState = { friends: [], query: '', page: 1, loaded: false };
let thoughtsLoaded = false;
let thoughtsCatalog = [];
let aboutCommentData = { comments: [] };
let aboutCommentsLoaded = false;
let footerFriendsLoaded = false;
let serverRuntime = null;
let oauthBindProvider = '';
let oauthCodeTimer = null;
let announcementsCatalog = [];
let announcementsLoaded = false;
let carouselIndex = 0;
let carouselProgressFrame = null;
let carouselElapsed = 0;
let carouselStartedAt = 0;
let carouselRunning = false;
let carouselPointerPaused = false;
let carouselTouchHeld = false;
let carouselFocusPaused = false;
const CAROUSEL_INTERVAL_MS = 6000;
const MAX_GALLERY_IMAGES = 9;
const COMMENTS_PER_PAGE = 10;
const FRIENDS_PER_PAGE = 18;
const dialogScrollPositions = new WeakMap();
let minecraftState = { edition: 'java', platform: 'windows', channel: 'all', build: '', query: '', page: 1, catalog: null, selectedVersion: null, generation: 0, detailGeneration: 0 };
let mirrorState = { catalog: null, systemId: '', versionId: '', archId: '', query: '', type: '', selectedMirror: '' };
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const formatDate = (value) => value ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', { year:'numeric', month:'short', day:'numeric' }).format(new Date(value)) : '';
const text = (zh, en) => language === 'en' ? (en || zh) : (zh || en);
const XIAOHE_LOGO_PATH = "M67.68,16.4L105.12,47.6A8 8 0 0 1 108,53.75L108,84A22 22 0 0 1 86,106L34,106A22 22 0 0 1 12,84L12,53.75A8 8 0 0 1 14.88,47.6L52.32,16.4A12 12 0 0 1 67.68,16.4ZM42,52L42,52A6 6 0 0 1 48,58L48,64A3 3 0 0 0 51,67L69,67A3 3 0 0 0 72,64L72,58A6 6 0 0 1 78,52L78,52A6 6 0 0 1 84,58L84,88A6 6 0 0 1 78,94L78,94A6 6 0 0 1 72,88L72,82A3 3 0 0 0 69,79L51,79A3 3 0 0 0 48,82L48,88A6 6 0 0 1 42,94L42,94A6 6 0 0 1 36,88L36,58A6 6 0 0 1 42,52Z";
function updateThemeFavicon() {
  const link = $('#site-favicon');
  if (!link) return;
  const color = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#415F91';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="4 2 112 112"><path fill="' + color + '" fill-rule="evenodd" d="' + XIAOHE_LOGO_PATH + '"/></svg>';
  link.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

const errorTranslations = {
  '账号或密码不正确': 'Incorrect username, email, or password.',
  '请输入有效的邮箱地址': 'Please enter a valid email address.',
  '人机验证未通过，请完成验证后重试。': 'Please complete the security check and try again.',
  '人机验证未通过，请完成 Cloudflare Turnstile 验证后重试。': 'Please complete the Cloudflare Turnstile check and try again.',
  '邮箱服务尚未配置，请联系管理员。': 'Email service is not configured. Please contact the administrator.',
  '该邮箱已注册，请直接登录。': 'This email is already registered. Please log in.',
  '验证码邮件发送失败，请稍后重试。': 'Could not send the verification email. Please try again later.',
  '用户名、邮箱、验证码或密码格式不正确': 'Check your username, email, six-digit code, and password (at least 8 characters).',
  '邮箱、验证码或新密码格式不正确': 'Check your email, six-digit code, and new password (at least 8 characters).',
  '两次输入的密码不一致': 'The two passwords do not match.',
  '验证码用途无效': 'The verification code purpose is invalid.',
  '用户名或邮箱已注册': 'This username or email is already registered.',
  '邮箱验证码无效或已过期，请重新获取。': 'The email code is invalid or expired. Please request a new one.',
  '请先登录': 'Please log in first.',
  '评论内容不能为空': 'Please enter a comment.',
  '评论内容或图片不能为空': 'Please enter a comment or add an image.',
  '评论图片无效或已失效': 'The comment image is invalid or has expired.',
  '评论图片无效、已失效，或超过 9 张上限': 'Comment images are invalid, expired, or exceed the 9-image limit.',
  '文章不存在': 'Story not found.',
  '请求格式无效': 'Invalid request. Please try again.',
  '请先登录后再举报': 'Please log in before reporting.',
  '举报目标无效': 'The report target is invalid.',
  '请选择举报原因': 'Please choose a report reason.',
  '举报的用户不存在': 'The reported user no longer exists.',
  '举报的评论不存在': 'The reported comment no longer exists.',
  '不能举报自己的账号或评论': 'You cannot report your own account or comment.',
  '你已举报该目标，管理员处理前无需重复提交': 'You already reported this target. Please wait for the administrator review.',
  '待处理的举报过多，请等待管理员处理后再提交': 'You have too many pending reports. Please wait for an administrator to review them.',
  '账号当前处于禁言状态，暂时无法发表评论': 'Your account is muted and cannot post comments right now.',
  '账号当前处于禁言状态，暂时无法上传评论图片': 'Your account is muted and cannot upload comment images right now.',
  '账号已被封禁，请联系管理员': 'This account is banned. Please contact the administrator.'
};
let policyDocuments = {};
function localizedError(message, fallback = text('操作失败，请稍后重试。', 'Something went wrong. Please try again.')) {
  if (!message) return fallback;
  if (language !== 'en') return message;
  const retry = message.match(/^请求过于频繁，请在 (\d+) 秒后重试。$/);
  return errorTranslations[message] || (retry ? `Too many requests. Please try again in ${retry[1]} seconds.` : /[\u3400-\u9fff]/.test(message) ? fallback : message);
}
function setControlLabel(element, label) {
  if (!element) return;
  element.title = label; element.setAttribute('aria-label', label); element.dataset.iconLabel = label;
  if (!element.querySelector('svg, mdui-icon')) element.textContent = label;
}
function updateAccountTitle() {
  const heading = !$('#public-profile-panel').classList.contains('hidden') ? 'public-profile-name' : !$('#user-reset-form').classList.contains('hidden') ? 'reset-dialog-title' : !$('#user-register-form').classList.contains('hidden') ? 'register-dialog-title' : 'account-dialog-title';
  $('#account-dialog').setAttribute('aria-labelledby', heading);
}
function renderLanguageUI() {
  document.querySelectorAll('[data-zh][data-en]').forEach(element => {
    if ((element.id === 'send-email-code' || element.id === 'send-oauth-code') && element.disabled) return;
    const label = text(element.dataset.zh, element.dataset.en);
    if (element.matches('button')) setControlLabel(element, label);
    else element.textContent = label;
  });
  for (const [route, zh, en] of [['home','首页','Home'],['archive','归档','Archive'],['minecraft','Minecraft 版本库','Minecraft Versions'],['mirrors','镜像库','Mirrors'],['thoughts','日常','Everyday'],['support','投喂与支持','Support'],['friends','友情链接','Friends'],['about','关于','About'],['announcements','网站公告','Announcements']]) {
    const link = document.querySelector(`[data-route="${route}"]`);
    setControlLabel(link, text(zh, en)); link.href = PUBLIC_ROUTES[route];
    link.dataset.m3Label = ({minecraft:text('版本库','Versions'),support:text('投喂','Support'),friends:text('友链','Friends')})[route] || text(zh,en);
  }
  $('.brand').href = '/';
  $('#hero-cta').href = '/articles';
  $('.nav-links').setAttribute('aria-label', text('主导航','Main navigation'));
  const menu = $('#sidebar-toggle'); menu.title = text('展开或收起侧栏','Toggle sidebar'); menu.setAttribute('aria-label', menu.title);
  const languageButton = $('#language-toggle');
  languageButton.innerHTML = `${BlogIcons.svg('translate')}<span>${language === 'en' ? '中文' : 'EN'}</span>`;
  languageButton.title = text('切换为英文','Switch to Chinese'); languageButton.setAttribute('aria-label', languageButton.title);
  setControlLabel($('#account-open'), text('登录 / 注册','Log in / Register'));
  const profileButton = $('#profile-open');
  profileButton.title = text('个人资料','Your profile');
  profileButton.setAttribute('aria-label', currentUser?.username ? text(`${currentUser.username}的个人资料`, `${currentUser.username}'s profile`) : profileButton.title);
  setControlLabel($('#search-form button'), text('搜索','Search'));
  $('#search-input').placeholder = text('搜索标题、正文或标签','Search titles, content or tags');
  $('#search-input').setAttribute('aria-label', text('搜索文章','Search stories'));
  $('#category-filter').setAttribute('aria-label', text('按分类筛选','Filter by category'));
  $('#about-avatar-image').alt = text('博主头像','Author avatar');
  $('#about-traits').setAttribute('aria-label', text('兴趣与生活标签','Interests and everyday life'));
  $('#about-character')?.setAttribute('aria-label', text('和紫发爱心角色互动，点击切换对话','Interact with the purple-haired heart character to cycle through messages'));
  $('#about-character-frame-player')?.setAttribute('aria-label', text('紫发星屿作者抱着紫色爱心的动态人物插画','An animated portrait of purple-haired StarIsle hugging a purple heart'));
  $('#profile-avatar-image').alt = text('用户头像','User avatar');
  $('#public-profile-image').alt = text('用户头像','User avatar');
  $('#brand-logo').setAttribute('aria-label', text('小房子博客标志','House blog logo'));
  $('#brand-logo-image').alt = text('博客标志','Blog logo');
  $('#report-details').placeholder = text('请描述具体问题，帮助管理员判断。','Describe the issue to help the administrator review it.');
  $('#friend-search').placeholder = text('搜索名称、简介或域名','Search names, descriptions, or domains');
  $('#friend-search').setAttribute('aria-label', text('搜索友情链接','Search friend links'));
  $('#about-comment-form textarea').placeholder = text('登录后留下你的留言','Log in to leave a message');
  $('#friend-application-form input[name="description"]')?.setAttribute('placeholder', text('用一两句话介绍你的网站','Describe your site in a sentence or two'));
  $('#report-dialog').setAttribute('aria-label', text('提交举报','Submit a report'));
  document.title = text(site.profile?.name, site.profile?.name_en) || 'StarIsle';
  for (const selector of ['#account-error','#profile-error','#public-profile-error','#report-status']) {
    const node = $(selector); if (node.textContent) node.textContent = localizedError(node.textContent);
  }
  if (refreshEmailCodeLabel) refreshEmailCodeLabel();
  if (refreshResetEmailCodeLabel) refreshResetEmailCodeLabel();
  updateAccountTitle();
}

function renderThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = $('#theme-toggle'); const label = text('切换深浅色', 'Toggle theme');
  button.title = label; button.setAttribute('aria-label', label); button.setAttribute('aria-pressed', String(dark)); button.classList.add('icon-only');
  button.innerHTML = `<mdui-icon name="${dark ? 'brightness_2' : 'brightness_low'}"></mdui-icon>`;
}
function renderOAuthProviderButtons() {
  const providers = site.oauth_providers || {};
  document.querySelectorAll('[data-oauth-login]').forEach((button) => {
    const provider = button.dataset.oauthLogin;
    const configured = Boolean(providers[provider]);
    const agreed = Boolean($('#login-agreement')?.checked);
    button.disabled = !configured;
    button.classList.toggle('consent-pending', configured && !agreed);
    button.setAttribute('aria-disabled', String(button.disabled));
    button.title = !configured
      ? text('管理员尚未配置该登录方式', 'This sign-in method is not configured')
      : !agreed
        ? text('请先勾选同意相关条款', 'Accept the policies before continuing')
        : text(`使用 ${provider === 'github' ? 'GitHub' : 'QQ'} 登录`, `Continue with ${provider === 'github' ? 'GitHub' : 'QQ'}`);
  });
}
function promptAuthAgreement() {
  openAccount('login');
  const row = $('#login-agreement-row');
  const box = $('#login-agreement');
  $('#account-error').textContent = text('请先阅读并勾选同意服务条款与条件、隐私政策、Cookie 政策和免责声明。','Please read and accept the Terms & Conditions, Privacy Policy, Cookie Policy, and Disclaimer first.');
  row.classList.remove('shake');
  void row.offsetWidth;
  row.classList.add('shake');
  clearTimeout(promptAuthAgreement.timer);
  promptAuthAgreement.timer = setTimeout(() => row.classList.remove('shake'), 560);
  setTimeout(() => box.focus(), 120);
}
function formatUptime(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (language === 'en') return [days ? `${days}d` : '', hours ? `${hours}h` : '', `${minutes}m`].filter(Boolean).join(' ');
  return [days ? `${days} 天` : '', hours ? `${hours} 小时` : '', `${minutes} 分钟`].filter(Boolean).join(' ');
}
function renderServerRuntime() {
  const dot = $('#server-status-dot');
  const label = $('#server-status-label');
  const uptime = $('#server-uptime');
  if (!dot || !label || !uptime) return;
  if (!serverRuntime) {
    dot.className = 'server-status-dot offline';
    label.textContent = text('状态暂时无法获取', 'Status unavailable');
    uptime.textContent = '—';
    return;
  }
  dot.className = 'server-status-dot online';
  label.textContent = text('服务器运行正常', 'Server is online');
  uptime.textContent = formatUptime(serverRuntime.uptime_seconds);
}
async function loadServerRuntime() {
  try {
    const response = await fetch('/api/server/status', { cache: 'no-store' });
    if (!response.ok) throw new Error('status request failed');
    serverRuntime = await response.json();
  } catch (_) {
    serverRuntime = null;
  }
  renderServerRuntime();
}
function renderOAuthAccountSettings(user) {
  const providers = site.oauth_providers || {};
  const connections = user?.oauth_connections || {};
  document.querySelectorAll('[data-oauth-account]').forEach((button) => {
    const provider = button.dataset.oauthAccount;
    const connection = connections[provider] || {};
    const connected = Boolean(connection.connected);
    const status = $(`#${provider}-connection-status`);
    const configured = Boolean(providers[provider]);
    if (status) status.textContent = connected ? text(`已绑定${connection.name ? ` · ${connection.name}` : ''}`, `Connected${connection.name ? ` · ${connection.name}` : ''}`) : text('未绑定', 'Not connected');
    button.textContent = connected ? text('解绑', 'Unbind') : text('绑定', 'Bind');
    button.dataset.connected = String(connected);
    button.disabled = !connected && !configured;
    button.title = !connected && !configured ? text('管理员尚未配置该登录方式', 'This sign-in method is not configured') : button.textContent;
  });
}
function showOAuthNotice(message, isError = false) {
  const notice = $('#oauth-notice');
  if (!notice || !message) return;
  notice.textContent = message;
  notice.classList.toggle('error', isError);
  notice.classList.remove('hidden');
  clearTimeout(showOAuthNotice.timer);
  showOAuthNotice.timer = setTimeout(() => notice.classList.add('hidden'), 6000);
}
function notifyPendingComment(result) {
  if (!result?.pending_review) return;
  showOAuthNotice(text(
    '评论已发布，含屏蔽词的部分已用星号隐藏，正在等待人工审核；审核无误后将恢复原文。',
    'Your comment is published. Prohibited words are masked with asterisks while an administrator reviews it; the original text will be restored if approved.'
  ));
}
function hideCookieConsent(value) {
  try { localStorage.setItem('blog-cookie-consent', value); } catch (_) {}
  const notice = $('#cookie-consent');
  notice.classList.add('leaving');
  setTimeout(() => notice.classList.add('hidden'), 220);
}
function initCookieConsent() {
  let consent = '';
  try { consent = localStorage.getItem('blog-cookie-consent') || ''; } catch (_) {}
  if (consent) return;
  setTimeout(() => $('#cookie-consent').classList.remove('hidden'), 520);
}
function startOAuth(provider, intent = 'login') {
  if (intent === 'login' && !$('#login-agreement').checked) {
    promptAuthAgreement();
    return;
  }
  if (!(site.oauth_providers || {})[provider]) {
    showOAuthNotice(text('该登录方式尚未配置。', 'This sign-in method is not configured.'), true);
    return;
  }
  location.href = `/auth/${provider}/start?intent=${intent}${intent === 'login' ? '&policies_accepted=1' : ''}&next=${encodeURIComponent(location.pathname + location.search)}`;
}
function renderSupportCard(imageSelector, emptySelector, hintSelector, value) {
  const image = $(imageSelector);
  const empty = $(emptySelector);
  const hint = $(hintSelector);
  const safeUrl = safeSupportImageUrl(value);
  image.classList.toggle('hidden', !safeUrl);
  empty.classList.toggle('hidden', Boolean(safeUrl));
  hint.classList.toggle('hidden', !safeUrl);
  if (safeUrl) {
    image.src = `${safeUrl}${safeUrl.includes('?') ? '&' : '?'}asset=no-recipient-20261104`;
    image.onerror = () => {
      image.classList.add('hidden');
      empty.classList.remove('hidden');
    };
  } else {
    image.removeAttribute('src');
    image.onerror = null;
  }
}
function renderSupportPage() {
  const p = site.profile || {};
  $('#support-eyebrow').textContent = text(p.support_eyebrow, p.support_eyebrow_en) || 'BUY ME A COFFEE';
  $('#support-heading').textContent = text(p.support_title, p.support_title_en) || text('如果这些内容帮到了你', 'If these notes helped you');
  $('#support-body').textContent = text(p.support_body, p.support_body_en);
  $('#support-note').textContent = text(p.support_note, p.support_note_en);
  renderSupportCard('#support-alipay-image', '#support-alipay-empty', '#support-alipay-hint', p.alipay_qr_url);
  renderSupportCard('#support-wechat-image', '#support-wechat-empty', '#support-wechat-hint', p.wechat_qr_url);
  const paypalUrl = safeHttpUrl(p.paypal_url);
  const paypalLink = $('#support-paypal-link');
  const paypalEmpty = $('#support-paypal-empty');
  paypalLink.classList.toggle('hidden', !paypalUrl);
  paypalEmpty.classList.toggle('hidden', Boolean(paypalUrl));
  if (paypalUrl) paypalLink.href = paypalUrl;
  else paypalLink.removeAttribute('href');
}
function renderAboutBody(paragraphs) {
  const body = $('#about-body');
  const chatIcons = ['science', 'system_update', 'movie', 'router', 'psychology', 'delete_sweep'];
  const intro = paragraphs[0] || '';
  const signatureText = paragraphs[1] || '';
  const quotedIndex = paragraphs.findIndex((paragraph, index) => index > 1 && [...paragraph.matchAll(/[“"]([^”"]+)[”"]/g)].length > 1);
  const quotedParagraph = quotedIndex >= 0 ? paragraphs[quotedIndex] : '';
  const closingParagraphs = paragraphs.slice(quotedIndex >= 0 ? quotedIndex + 1 : Math.min(2, paragraphs.length));
  const nodes = [];

  const bio = document.createElement('section');
  bio.className = 'about-bio-grid';
  const story = document.createElement('article');
  story.className = 'about-story-card about-chapter';
  story.innerHTML = `
    <div class="about-chapter-heading">
      <span class="about-section-index" aria-hidden="true">01</span>
      <div><span class="eyebrow">${text('关于我', 'WHO I AM')}</span><h2>${text('先认识一下', 'A quick introduction')}</h2></div>
    </div>`;
  const introCopy = document.createElement('p');
  introCopy.className = 'about-lead';
  introCopy.textContent = intro;
  story.append(introCopy);
  bio.append(story);

  if (signatureText) {
    const signature = document.createElement('aside');
    signature.className = 'about-signature-chat';
    const avatar = document.createElement('span');
    avatar.className = 'about-chat-mini-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    avatar.textContent = text('豪', 'H');
    const message = document.createElement('p');
    message.textContent = signatureText;
    signature.append(avatar, message);
    bio.append(signature);
  }
  nodes.push(bio);


  if (closingParagraphs.length) {
    const life = document.createElement('section');
    life.className = 'about-life-grid';
    const labels = [
      ['问题被拆开之后', 'AFTER IT CLICKS', 'lightbulb'],
      ['屏幕之外', 'BEYOND THE SCREEN', 'travel_explore'],
    ];
    closingParagraphs.forEach((paragraph, index) => {
      const card = document.createElement('article');
      card.className = 'about-life-card';
      const [zhTitle, enTitle, iconName] = labels[index] || [text('关于我', 'ABOUT ME'), 'ABOUT ME', 'auto_awesome'];
      card.innerHTML = `<span class="material-symbols-rounded" aria-hidden="true">${iconName}</span><span class="eyebrow">${text(zhTitle, enTitle)}</span>`;
      const copy = document.createElement('p');
      copy.textContent = paragraph;
      card.append(copy);
      life.append(card);
    });
    nodes.push(life);
  }
  body.replaceChildren(...nodes);
}

const SITE_UI_PALETTES = {
  forest: { accent: '#32694d', light: '#32694d', dark: '#b3d5be' },
  ocean: { accent: '#315f8a', light: '#315f8a', dark: '#b7d4ef' },
  violet: { accent: '#6750a4', light: '#6750a4', dark: '#d0bcff' },
  rose: { accent: '#8e4158', light: '#8e4158', dark: '#ffb3c5' },
  amber: { accent: '#8b5e14', light: '#8b5e14', dark: '#ffd38a' },
};
function applySiteAppearance(profile = {}) {
  const root = document.documentElement;
  const customAccent = /^#[0-9a-f]{6}$/i.test(profile.ui_accent || '') ? profile.ui_accent : '#32694d';
  const paletteKey = profile.ui_palette === 'custom' || Object.hasOwn(SITE_UI_PALETTES, profile.ui_palette) ? profile.ui_palette : 'seasonal';
  const settings = {
    width: ['focus', 'standard', 'wide', 'custom'].includes(profile.ui_width) ? profile.ui_width : 'standard',
    corner: ['soft', 'rounded', 'expressive', 'custom'].includes(profile.ui_corner) ? profile.ui_corner : 'rounded',
    cards: ['tonal', 'elevated', 'outlined'].includes(profile.ui_card_style) ? profile.ui_card_style : 'tonal',
    density: ['comfortable', 'compact', 'airy'].includes(profile.ui_density) ? profile.ui_density : 'comfortable',
    hero: ['art', 'focus', 'compact'].includes(profile.ui_hero_layout) ? profile.ui_hero_layout : 'art',
    motion: ['full', 'subtle', 'reduced'].includes(profile.ui_motion) ? profile.ui_motion : 'full',
  };
  document.body.dataset.uiPalette = paletteKey;
  document.body.dataset.uiWidth = settings.width;
  document.body.dataset.uiCorner = settings.corner;
  document.body.dataset.uiCards = settings.cards;
  document.body.dataset.uiDensity = settings.density;
  document.body.dataset.uiHeroLayout = settings.hero;
  document.body.dataset.uiMotion = settings.motion;
  root.style.setProperty('--site-custom-width', `${Math.min(1360, Math.max(900, Number(profile.ui_width_custom) || 1120))}px`);
  root.style.setProperty('--site-custom-radius', `${Math.min(40, Math.max(0, Number(profile.ui_corner_custom) || 20))}px`);
  if (paletteKey !== 'seasonal') {
    const palette = paletteKey === 'custom'
      ? { accent: customAccent, light: `color-mix(in srgb,${customAccent} 76%,#18231d)`, dark: `color-mix(in srgb,${customAccent} 44%,#ffffff)` }
      : SITE_UI_PALETTES[paletteKey];
    root.style.setProperty('--term-accent', palette.accent);
    root.style.setProperty('--theme-primary-light', palette.light);
    root.style.setProperty('--theme-primary-dark', palette.dark);
  }
  window.SolarThemes?.syncChrome();
}

function renderSite() {
  const p = site.profile || {}; const theme = site.theme || {};
  turnstileSiteKey = site.turnstile_sitekey || '';
  document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
  SolarThemes.apply(theme, language);
  applySiteAppearance(p);
  updateThemeFavicon();
  $('#brand-name').textContent = text(p.name, p.name_en) || 'StarIsle';
  $('#brand-mark').textContent = (text(p.name, p.name_en) || 'S').slice(0, 1).toUpperCase();
  const defaultLogo = !p.logo_url || p.logo_url === '/brand.svg';
  const inlineLogo = $('#brand-logo');
  const logoImage = $('#brand-logo-image');
  inlineLogo.classList.toggle('hidden', !defaultLogo);
  logoImage.classList.toggle('hidden', defaultLogo || !p.logo_url);
  if (!defaultLogo && p.logo_url) logoImage.src = p.logo_url;
  else logoImage.removeAttribute('src');
  $('#brand-mark').classList.toggle('hidden', defaultLogo || Boolean(p.logo_url));
  $('#season-badge').textContent = text(theme.label, theme.label_en);
  $('#hero-eyebrow').textContent = text(p.eyebrow, p.eyebrow_en) || 'PERSONAL NOTES · 2026';
  $('#hero-title').textContent = text(theme.title, theme.title_en) || text(p.subtitle, p.subtitle_en);
  $('#hero-bio').textContent = `${text(theme.description, theme.description_en)} ${text(p.bio, p.bio_en)}`.trim();
  $('#hero-cta').innerHTML = `${escapeHtml(text(p.hero_cta, p.hero_cta_en) || text('浏览文章','Browse stories'))} <span>→</span>`;
  $('#posts-heading').textContent = text(p.posts_heading, p.posts_heading_en);
  $('#about-eyebrow').textContent = text(p.about_eyebrow, p.about_eyebrow_en);
  $('#about-heading').textContent = text(p.about_heading, p.about_heading_en);
  const dialogText = (key, fallbackZh, fallbackEn) => text(p[`about_${key}`], p[`about_${key}_en`]) || text(fallbackZh, fallbackEn);
  const dialogFields = [
    ['.about-bubble-kicker > span', 'dialog_kicker', '灵感便签', 'IDEA NOTES'],
    ['.about-bubble-status', 'dialog_status', '刚刚', 'now'],
    ['.about-bubble-idle', 'dialog_idle', '很高兴认识你', 'Nice to meet you'],
    ['.about-bubble-hint', 'dialog_hint', '点击继续聊天', 'Tap to keep chatting'],
  ];
  dialogFields.forEach(([selector, key, zh, en]) => {
    const node = document.querySelector(`#about-character ${selector}`);
    if (!node) return;
    node.dataset.zh = p[`about_${key}`] || zh;
    node.dataset.en = p[`about_${key}_en`] || en;
    node.textContent = dialogText(key, zh, en);
  });
  const aboutParagraphs = (text(p.about_body, p.about_body_en) || '').split(/\n+/).map((paragraph) => paragraph.trim()).filter(Boolean);
  renderAboutBody(aboutParagraphs);
  $('#about-name').textContent = text(p.about_name, p.about_name_en) || text(p.name, p.name_en);
  const avatar = $('#about-avatar'), avatarImage = $('#about-avatar-image');
  avatar.textContent = (text(p.name, p.name_en) || 'S').slice(0,1).toUpperCase();
  avatarImage.onerror = () => { avatarImage.classList.add('hidden'); avatar.classList.remove('hidden'); };
  if (p.avatar_url) { avatarImage.src = p.avatar_url; avatarImage.classList.remove('hidden'); avatar.classList.add('hidden'); } else { avatar.classList.remove('hidden'); avatarImage.classList.add('hidden'); avatarImage.removeAttribute('src'); }
  const aboutCharacterFallback = $('#about-character-fallback');
  if (aboutCharacterFallback) {
    if (p.avatar_url) aboutCharacterFallback.src = p.avatar_url;
    else aboutCharacterFallback.removeAttribute('src');
  }
  $('#copyright').textContent = p.copyright || '© 2026 StarIsle'; $('#footer-note').textContent = text(p.footer_note, p.footer_note_en);
  renderSupportPage();
  renderLanguageUI();
  renderOAuthProviderButtons();
  if (currentUser) renderOAuthAccountSettings(currentUser);
  if (serverRuntime) renderServerRuntime();
  applyArticleLayout(savedArticleLayout);
  renderThemeIcon(); BlogIcons.iconize();
}
function positionCategoryThumb() {
  const control = $('#category-filter-control');
  const options = $('#category-filter');
  const active = options?.querySelector('.category-segment.active');
  const thumb = $('#category-filter-thumb');
  if (!control || !active || !thumb) return;
  const target = active.offsetLeft - options.scrollLeft;
  thumb.style.width = `${active.offsetWidth}px`;
  thumb.style.transform = `translateX(${target}px)`;
}
const portraitTopicMedia = matchMedia('(orientation: portrait)');
function syncTopicPlacement() {
  const layout = $('.home-feed-layout');
  const sidebar = $('.home-feed-sidebar');
  const categoryPanel = $('.category-slider-panel');
  const toolbarLeft = $('.blog-toolbar-left');
  if (!layout || !sidebar || !categoryPanel || !toolbarLeft) return;
  if (portraitTopicMedia.matches) {
    categoryPanel.insertAdjacentElement('afterend', sidebar);
    sidebar.classList.add('portrait-feed-sidebar');
    layout.classList.add('topics-in-toolbar');
  } else {
    layout.append(sidebar);
    sidebar.classList.remove('portrait-feed-sidebar');
    layout.classList.remove('topics-in-toolbar');
  }
  positionCategoryThumb();
}
function renderFilters() {
  const categoryHost = $('#category-filter');
  const selectedCategory = currentQuery.category || '';
  const categories = ['', ...(site.categories || [])];
  categoryHost.innerHTML = categories.map((category) => {
    const label = category ? (category === '未分类' ? text('未分类','Uncategorized') : category) : text('全部分类','All categories');
    const active = category === selectedCategory;
    return `<button class="category-segment ${active ? 'active' : ''}" type="button" data-category="${escapeHtml(category)}" data-no-icon aria-pressed="${String(active)}">${escapeHtml(label)}</button>`;
  }).join('');
  categoryHost.querySelectorAll('[data-category]').forEach((button) => {
    button.onclick = () => {
      currentQuery.category = button.dataset.category;
      currentPage = 1;
      loadPosts();
    };
  });
  requestAnimationFrame(positionCategoryThumb);
  const selectedTags = Array.isArray(currentQuery.tags) ? currentQuery.tags : [];
  const tagCounts = site.tag_counts || {};
  $('#tag-filter').innerHTML = (site.tags || []).map((tag) => `<button class="tag filter-tag ${selectedTags.includes(tag) ? 'selected' : ''}" data-tag="${escapeHtml(tag)}" aria-pressed="${String(selectedTags.includes(tag))}">#${escapeHtml(tag)}<span class="tag-count">${Number(tagCounts[tag] || 0)}</span></button>`).join('') + (selectedTags.length ? `<button class="tag clear-tag-selection" id="clear-tag-selection" type="button" data-no-icon><mdui-icon name="close"></mdui-icon>${text('取消全部选择','Clear all')}</button>` : '');
  document.querySelectorAll('#tag-filter .filter-tag').forEach((button) => button.onclick = () => toggleTag(button.dataset.tag));
  $('#clear-tag-selection')?.addEventListener('click', clearSelectedTags);
  BlogIcons.iconize($('#tag-filter'));
  const stats = site.stats || {};
  const wordCount = Number(stats.words || 0);
  $('#site-post-total').textContent = String(Number(stats.posts || 0));
  $('#site-word-total').textContent = wordCount >= 10000 ? `${(wordCount / 1000).toFixed(0)}k` : `${(wordCount / 1000).toFixed(1)}k`;
  $('#site-view-total').textContent = Number(stats.views || 0).toLocaleString(language === 'en' ? 'en-US' : 'zh-CN');
}
function postWordStats(post) {
  const source = String(post?.content || post?.excerpt || '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
  const cjk = (source.match(/[\u3400-\u9fff\uf900-\ufaff]/g) || []).length;
  const latin = (source.replace(/[\u3400-\u9fff\uf900-\ufaff]/g, ' ').match(/[a-z0-9]+/gi) || []).length;
  const count = cjk + latin;
  const label = `${count >= 10000 ? (count / 1000).toFixed(0) : Math.max(0.1, count / 1000).toFixed(1)}k`;
  return { count, label, minutes: Math.max(1, Math.ceil(count / 500)) };
}
function postSummary(post, fallbackLength = 260) {
  const excerpt = String(post?.excerpt || '').trim();
  if (excerpt) return excerpt;
  return String(post?.content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, fallbackLength);
}
function renderPager(container, page, pages, onPage) {
  if (!container) return;
  const safePages = Math.max(1, Number(pages) || 1);
  const safePage = Math.min(safePages, Math.max(1, Number(page) || 1));
  container.innerHTML = `<button class="outlined-button pager-arrow" type="button" data-page-target="${safePage - 1}" ${safePage <= 1 ? 'disabled' : ''} data-no-icon>${BlogIcons.svg('left')}<span>${text('上一页','Previous')}</span></button><div class="pager-jump"><span>${text('第','Page')}</span><input type="number" min="1" max="${safePages}" value="${safePage}" inputmode="numeric" aria-label="${text('输入页码','Enter page number')}"><span>/ ${safePages} ${text('页','')}</span><button class="tonal-button" type="button" data-page-go data-no-icon>${BlogIcons.svg('right')}<span>${text('跳转','Go')}</span></button></div><button class="outlined-button pager-arrow" type="button" data-page-target="${safePage + 1}" ${safePage >= safePages ? 'disabled' : ''} data-no-icon><span>${text('下一页','Next')}</span>${BlogIcons.svg('right')}</button>`;
  const input = container.querySelector('input');
  const go = () => onPage(Math.min(safePages, Math.max(1, Number(input.value) || 1)));
  container.querySelectorAll('[data-page-target]').forEach((button) => {
    button.onclick = () => onPage(Number(button.dataset.pageTarget));
  });
  container.querySelector('[data-page-go]').onclick = go;
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      go();
    }
  });
}
function renderPosts() {
  const grid = $('#post-grid'); const posts = site.posts || [];
  $('#post-count').textContent = `${site.pagination?.total || posts.length} ${text('篇文章','stories')}`;
  $('#articles-total').textContent = String(Number(site.pagination?.total || posts.length || 0));
  grid.innerHTML = posts.length ? posts.map((post, index) => {
    const coverUrl = safePostCoverUrl(post.cover_url);
    const stats = postWordStats(post);
    const summary = postSummary(post, 160);
    return `<article class="post-card ${index === 0 ? 'featured' : ''} ${coverUrl ? 'has-cover' : ''}">${coverUrl ? `<button class="post-cover-button" data-id="${escapeHtml(post.id)}" data-no-icon aria-label="${text('阅读文章：','Read story: ')}${escapeHtml(post.title)}"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(post.title)}" loading="${index === 0 ? 'eager' : 'lazy'}" decoding="async"></button>` : ''}<div class="post-card-body"><div class="post-meta">${post.pinned ? `<span class="pin-label">${text('置顶','Pinned')}</span>` : ''}<span class="post-index">${String(index + 1).padStart(2,'0')}</span><span>${formatDate(post.published_at || post.updated_at)}</span><span>${escapeHtml(post.author || '')}</span><span>${post.views || 0} ${text('阅读','views')}</span><span>${stats.label} ${text('字','words')}</span><span>${text('约','About ')}${stats.minutes}${text('分钟',' min')}</span></div><span class="post-category-chip">${escapeHtml(post.category || text('未分类','Uncategorized'))}</span><h3>${escapeHtml(post.title)}</h3><p title="${escapeHtml(summary)}">${escapeHtml(summary)}</p><div class="post-bottom"><div class="tag-row">${(post.tags || []).map((tag) => `<button class="tag filter-tag" data-tag="${escapeHtml(tag)}">#${escapeHtml(tag)}</button>`).join('')}</div><div class="post-card-actions"><button class="post-favorite ${post.favorited ? 'favorited' : ''}" type="button" data-favorite-post="${escapeHtml(post.id)}" aria-pressed="${String(Boolean(post.favorited))}" aria-label="${post.favorited ? text('取消收藏','Remove from favorites') : text('收藏文章','Save story')}" title="${post.favorited ? text('取消收藏','Remove from favorites') : text('收藏文章','Save story')}" data-no-icon>${BlogIcons.svg('bookmark')}</button><button class="read-button" data-id="${escapeHtml(post.id)}" data-icon="book" aria-label="${text('阅读文章','Read story')}">→</button></div></div></div></article>`;
  }).join('') : `<div class="empty-state">${text('没有找到文章。','No stories found.')}</div>`;
  grid.querySelectorAll('.post-cover-button').forEach((button) => button.onclick = () => openReader(posts.find((post) => post.id === button.dataset.id)));
  grid.querySelectorAll('.read-button').forEach((button) => button.onclick = () => openReader(posts.find((post) => post.id === button.dataset.id)));
  bindFavoriteButtons(grid);
  grid.querySelectorAll('.filter-tag').forEach((button) => button.onclick = () => toggleTag(button.dataset.tag));
  const meta = site.pagination || {};
  renderPager($('#pagination'), meta.page || 1, meta.pages || 1, (page) => { currentPage = page; loadPosts(); });
  BlogIcons.iconize(grid); BlogIcons.iconize($('#pagination'));
}
function setCarouselProgress(value) {
  const progress = $('#carousel-progress-bar');
  if (!progress) return;
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  progress.style.transform = `scaleX(${normalized})`;
  progress.parentElement?.setAttribute('aria-valuenow', String(Math.round(normalized * 100)));
}
function stopCarousel() {
  if (carouselRunning) {
    carouselElapsed += performance.now() - carouselStartedAt;
    carouselRunning = false;
  }
  if (carouselProgressFrame) cancelAnimationFrame(carouselProgressFrame);
  carouselProgressFrame = null;
}
function showCarouselSlide(index, animate = true) {
  const items = site.carousel || [];
  if (!items.length) return;
  carouselIndex = (index + items.length) % items.length;
  const track = $('#home-carousel-track');
  track.style.transform = '';
  document.querySelectorAll('[data-carousel-slide]').forEach((slide, slideIndex) => {
    const active = slideIndex === carouselIndex;
    slide.classList.toggle('active', active);
    slide.setAttribute('aria-hidden', String(!active));
    if (active && animate) {
      slide.classList.remove('entering');
      void slide.offsetWidth;
      slide.classList.add('entering');
    }
  });
  document.querySelectorAll('[data-carousel-dot]').forEach((dot, dotIndex) => {
    dot.classList.toggle('active', dotIndex === carouselIndex);
    dot.setAttribute('aria-current', String(dotIndex === carouselIndex));
  });
}
function startCarousel(reset = false) {
  stopCarousel();
  const items = site.carousel || [];
  if (reset || carouselElapsed >= CAROUSEL_INTERVAL_MS) {
    carouselElapsed = 0;
    setCarouselProgress(0);
  }
  if (items.length < 2 || document.body.dataset.page !== 'home') {
    setCarouselProgress(0);
    return;
  }
  if (carouselPointerPaused || carouselFocusPaused || carouselTouchHeld) return;
  carouselStartedAt = performance.now();
  carouselRunning = true;
  const tick = (now) => {
    if (!carouselRunning) return;
    const total = carouselElapsed + (now - carouselStartedAt);
    setCarouselProgress(total / CAROUSEL_INTERVAL_MS);
    if (total >= CAROUSEL_INTERVAL_MS) {
      carouselRunning = false;
      carouselElapsed = 0;
      showCarouselSlide(carouselIndex + 1);
      setCarouselProgress(0);
      startCarousel(true);
      return;
    }
    carouselProgressFrame = requestAnimationFrame(tick);
  };
  carouselProgressFrame = requestAnimationFrame(tick);
}
function renderHomeCarousel() {
  const section = $('#home-carousel');
  const track = $('#home-carousel-track');
  const dots = $('#carousel-dots');
  if (!section || !track || !dots) return;
  const items = site.carousel || [];
  section.classList.toggle('hidden', !items.length || document.body.dataset.page !== 'home');
  section.classList.toggle('single', items.length < 2);
  if (!items.length) {
    track.innerHTML = '';
    dots.innerHTML = '';
    stopCarousel();
    return;
  }
  carouselIndex = Math.min(carouselIndex, items.length - 1);
  track.innerHTML = items.map((post, index) => {
    const coverUrl = safePostCoverUrl(post.cover_url);
    const stats = postWordStats(post);
    return `<article class="carousel-slide ${index === carouselIndex ? 'active' : ''} ${coverUrl ? 'has-cover' : 'no-cover'}" data-carousel-slide aria-hidden="${index !== carouselIndex}"><button class="carousel-link" type="button" data-carousel-post="${escapeHtml(post.id)}">${coverUrl ? `<img class="carousel-image" src="${escapeHtml(coverUrl)}" alt="" loading="eager" decoding="async">` : '<span class="carousel-placeholder" aria-hidden="true"><mdui-icon name="auto_stories"></mdui-icon></span>'}<span class="carousel-scrim" aria-hidden="true"></span><span class="carousel-copy"><span class="carousel-category">${escapeHtml(post.category || text('未分类','Uncategorized'))}</span><strong>${escapeHtml(post.title)}</strong><small>${formatDate(post.published_at || post.updated_at)} · ${stats.label} ${text('字','words')} · ${text('约','About ')}${stats.minutes}${text('分钟',' min')}</small></span></button></article>`;
  }).join('');
  dots.innerHTML = items.map((post, index) => `<button class="carousel-dot ${index === carouselIndex ? 'active' : ''}" type="button" data-carousel-dot="${index}" aria-label="${text('查看精选文章','View featured story')} ${index + 1}" aria-current="${index === carouselIndex}"></button>`).join('');
  track.querySelectorAll('[data-carousel-post]').forEach((button) => button.onclick = () => openReader(items.find((post) => post.id === button.dataset.carouselPost)));
  track.querySelectorAll('.carousel-link').forEach((cover) => {
    cover.addEventListener('pointerenter', (event) => {
      if (event.pointerType === 'touch') return;
      carouselPointerPaused = true;
      stopCarousel();
    });
    cover.addEventListener('pointerleave', (event) => {
      if (event.pointerType === 'touch') return;
      carouselPointerPaused = false;
      if (!carouselFocusPaused) startCarousel();
    });
  });
  dots.querySelectorAll('[data-carousel-dot]').forEach((dot) => dot.onclick = () => { showCarouselSlide(Number(dot.dataset.carouselDot)); startCarousel(true); });
  showCarouselSlide(carouselIndex, false);
  if (items.length > 1) startCarousel(true);
  else setCarouselProgress(0);
}
async function loadPosts() {
  const singleColumn = savedArticleLayout || matchMedia('(orientation: portrait)').matches;
  const pageSize = singleColumn ? 10 : 20;
  const params = new URLSearchParams({ page: currentPage, page_size: pageSize, q: currentQuery.q || '', category: currentQuery.category || '' });
  if (Array.isArray(currentQuery.tags) && currentQuery.tags.length) params.set('tags', currentQuery.tags.join(','));
  const response = await fetch('/api/posts?' + params);
  site = { ...site, ...(await response.json()) };
  renderFilters();
  renderPosts();
}
function toggleTag(tag) { const tags = Array.isArray(currentQuery.tags) ? [...currentQuery.tags] : []; const index = tags.indexOf(tag); if (index >= 0) tags.splice(index, 1); else tags.push(tag); currentQuery.tags = tags; currentPage = 1; loadPosts(); }
function clearSelectedTags() { currentQuery.tags = []; currentPage = 1; loadPosts(); }
function openReader(post) { if (post) location.href = '/post/' + encodeURIComponent(post.slug || post.id); }
function updateFavoriteButton(button, favorited) {
  button.classList.toggle('favorited', favorited);
  button.setAttribute('aria-pressed', String(favorited));
  const label = button.querySelector('span');
  if (label) label.textContent = favorited ? text('已收藏', 'Saved') : text('收藏', 'Save');
  button.title = favorited ? text('取消收藏', 'Remove from favorites') : text('收藏文章', 'Save story');
  button.setAttribute('aria-label', button.title);
}
async function togglePostFavorite(postId, button) {
  if (!currentUser) return openAccount('login');
  button.disabled = true;
  try {
    const response = await fetch(`/api/posts/${encodeURIComponent(postId)}/favorite`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    const result = await response.json();
    if (response.status === 401) return openAccount('login');
    if (!response.ok) throw new Error(localizedError(result.error, text('收藏操作失败。', 'Could not update your saved stories.')));
    currentUser.favorites = Array.isArray(result.favorites) ? result.favorites : currentUser.favorites;
    document.querySelectorAll(`[data-favorite-post="${CSS.escape(postId)}"]`).forEach((node) => updateFavoriteButton(node, Boolean(result.favorited)));
    if (articleData?.post?.id === postId) articleData.post.favorited = Boolean(result.favorited);
    showOAuthNotice(result.favorited ? text('已加入收藏。', 'Saved to your favorites.') : text('已取消收藏。', 'Removed from your favorites.'));
    if (document.body.dataset.page === 'profile') loadProfileFavorites();
  } catch (error) {
    showOAuthNotice(error.message || text('收藏操作失败。', 'Could not update your saved stories.'), true);
  } finally {
    button.disabled = false;
  }
}
function bindFavoriteButtons(root = document) {
  root.querySelectorAll('[data-favorite-post]').forEach((button) => {
    button.onclick = () => togglePostFavorite(button.dataset.favoritePost, button);
  });
}
function safeHttpUrl(value) { return /^https?:\/\//i.test(String(value || '')) ? String(value) : ''; }
function safePostCoverUrl(value) {
  const url = String(value || '');
  return /^\/uploads\/[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp)$/i.test(url) ? url : safeHttpUrl(url);
}
function safeSupportImageUrl(value) {
  const url = String(value || '');
  return /^(?:\/uploads\/[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp)|\/donate-(?:alipay|wechat)-qr\.png)$/i.test(url) ? url : safeHttpUrl(url);
}
function galleryImageUrls(item, legacyKey = 'image_url') {
  const urls = [];
  for (const value of [...(Array.isArray(item?.image_urls) ? item.image_urls : []), item?.[legacyKey]]) {
    const url = safeSupportImageUrl(value);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, MAX_GALLERY_IMAGES);
}
function galleryMarkup(urls, className, label, icon = 'add_photo_alternate') {
  if (!urls.length) return '';
  return `<div class="${className}" aria-label="${escapeHtml(label)}">${urls.map((url, index) => `<a class="gallery-item" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)} ${index + 1}" loading="lazy"></a>`).join('')}</div>`;
}
function safeUserAvatarUrl(value) {
  const url = String(value || '');
  return /^\/uploads\/[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp)$/i.test(url) ? url : '';
}
function avatarVariantEntries(user) {
  const variants = user?.avatar_variants || {};
  const allowed = new Set([32,48,64,96,128,192,256]);
  return Object.entries(variants).map(([size, url]) => {
    const pixels = Number(size);
    const value = String(url || '');
    return { pixels, url: value };
  }).filter(({pixels,url}) => allowed.has(pixels) && new RegExp(`^/uploads/[a-f0-9]{32}_${pixels}\\.webp$`,'i').test(url)).sort((a,b)=>a.pixels-b.pixels);
}
function avatarSrcset(user) {
  return avatarVariantEntries(user).map(({pixels,url}) => `${url} ${pixels}w`).join(', ');
}
function userInitial(user) {
  return String(user?.username || 'U').trim().slice(0, 1).toUpperCase() || 'U';
}
function defaultAvatarGlyph() {
  return '<svg class="default-avatar-glyph" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 11.5a4.25 4.25 0 1 0 0-8.5 4.25 4.25 0 0 0 0 8.5Zm-7.5 8.2c.3-4.2 3.1-6.7 7.5-6.7s7.2 2.5 7.5 6.7c.03.4-.3.8-.75.8H5.25a.77.77 0 0 1-.75-.8Z"/></svg>';
}
function avatarImageMarkup(user, className = '') {
  const avatarUrl = safeUserAvatarUrl(user?.avatar_url);
  if (!avatarUrl) return `<span class="${className} default-user-avatar">${defaultAvatarGlyph()}</span>`;
  const srcset = avatarSrcset(user);
  const sizes = className.includes('comment-avatar') ? '(max-width: 560px) 36px, 44px' : '96px';
  return `<span class="${className} has-image"><img src="${escapeHtml(avatarUrl)}"${srcset ? ` srcset="${escapeHtml(srcset)}" sizes="${escapeHtml(sizes)}"` : ''} alt="${escapeHtml(text('用户头像','User avatar'))}" loading="lazy"><span class="avatar-fallback default-user-avatar" aria-hidden="true">${defaultAvatarGlyph()}</span></span>`;
}
function renderUserAvatar(image, fallback, user) {
  const avatarUrl = safeUserAvatarUrl(user?.avatar_url);
  const srcset = avatarSrcset(user);
  fallback.classList.add('default-user-avatar');
  fallback.innerHTML = defaultAvatarGlyph();
  fallback.classList.toggle('hidden', Boolean(avatarUrl));
  image.classList.toggle('hidden', !avatarUrl);
  if (avatarUrl) {
    image.src = avatarUrl;
    if (srcset) {
      image.srcset = srcset;
      image.sizes = image.id === 'profile-open-image' ? '48px' : '(max-width: 759px) 68px, 84px';
    } else {
      image.removeAttribute('srcset');
      image.removeAttribute('sizes');
    }
    image.onerror = () => { image.classList.add('hidden'); fallback.classList.remove('hidden'); };
  } else {
    image.removeAttribute('src');
    image.removeAttribute('srcset');
    image.removeAttribute('sizes');
    image.onerror = null;
  }
}
function formatBytes(value) { const bytes = Number(value); if (!Number.isFinite(bytes) || bytes < 0) return text('未知','Unknown'); const units = ['B','KB','MB','GB','TB']; let size = bytes; let unit = 0; while (size >= 1024 && unit < units.length - 1) { size /= 1024; unit += 1; } return `${size.toFixed(unit ? 1 : 0)} ${units[unit]}`; }
async function copyLibraryText(value, statusNode) { try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(value); else throw new Error(); if (statusNode) statusNode.textContent = text('链接已复制','Link copied'); } catch { const field = document.createElement('textarea'); field.value = value; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select(); const copied = document.execCommand('copy'); field.remove(); if (statusNode) statusNode.textContent = copied ? text('链接已复制','Link copied') : text('复制失败','Copy failed'); } }
function minecraftChannelLabel(version) {
  const labels = {
    release: text('正式版','Release'),
    snapshot: text('测试版快照','Snapshot'),
    legacy: text('历史版本','Legacy'),
    testing: text('测试版','Preview / Beta'),
  };
  return labels[version?.channel] || cleanMinecraftType(version?.type);
}
function cleanMinecraftType(value) {
  const labels = {
    release: text('正式版','Release'),
    snapshot: text('快照','Snapshot'),
    old_beta: text('旧测试版','Legacy beta'),
    old_alpha: text('旧预览版','Legacy alpha'),
  };
  return labels[value] || value || '—';
}
function updateMinecraftFilters() {
  document.querySelectorAll('[data-edition]').forEach((button) => {
    const active = button.dataset.edition === minecraftState.edition;
    button.textContent = button.dataset.edition === 'java' ? text('Java 版','Java Edition') : text('基岩版','Bedrock');
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  const channel = $('#minecraft-channel');
  const bedrock = minecraftState.edition === 'bedrock';
  channel.innerHTML = bedrock
    ? `<option value="all">${text('全部版本','All versions')}</option><option value="release">${text('正式版','Release')}</option><option value="testing">${text('测试版','Preview / Beta')}</option>`
    : `<option value="all">${text('全部版本','All versions')}</option><option value="release">${text('正式版','Release')}</option><option value="snapshot">${text('测试版快照','Snapshots')}</option><option value="legacy">${text('历史版本','Legacy')}</option>`;
  channel.value = minecraftState.channel;
  $('#minecraft-platform-field').classList.toggle('hidden', !bedrock);
  $('#minecraft-platform').innerHTML = `<option value="windows">Windows</option><option value="android">${text('Android APK','Android APK')}</option>`;
  $('#minecraft-platform').value = minecraftState.platform;
  $('#minecraft-build-field').classList.toggle('hidden', !bedrock || minecraftState.platform !== 'windows');
  $('#minecraft-build').innerHTML = `<option value="">${text('全部构建','All builds')}</option><option value="UWP">UWP</option><option value="GDK">GDK</option>`;
  $('#minecraft-build').value = minecraftState.build;
  const sourceUrl = minecraftState.edition === 'java'
    ? 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json'
    : minecraftState.platform === 'android'
      ? 'https://mc233.endyun.ltd/'
      : 'https://data.mcappx.com/v2/bedrock.json';
  $('#minecraft-source-link').href = sourceUrl;
  $('#minecraft-source-name').textContent = minecraftState.edition === 'java'
    ? 'Mojang'
    : minecraftState.platform === 'android' ? text('MC版本库 · MCARC','MC Version Library · MCARC') : 'MCAPPX';
}
function renderMinecraftCatalog() {
  const data = minecraftState.catalog;
  if (!data) return;
  const versions = data.versions || [];
  $('#minecraft-summary').textContent = `${text('找到','Found')} ${data.pagination.total} ${text('个版本','versions')} · ${data.source}`;
  $('#minecraft-count').textContent = String(data.pagination.total);
  const list = $('#minecraft-list');
  list.innerHTML = versions.length ? versions.map((version) => {
    const arches = (version.architectures || []).join(' · ');
    const build = version.build_type ? `${version.build_type} · ` : '';
    const displayVersion = version.platform === 'android' ? (version.store_version || version.id) : version.id;
    return `<button type="button" class="version-row ${minecraftState.selectedVersion?.id === version.id ? 'selected' : ''}" data-version="${escapeHtml(version.id)}"><span class="version-main"><span class="version-cube">${BlogIcons.svg('cube')}</span><span class="version-copy"><strong>${escapeHtml(displayVersion)}</strong><small>${escapeHtml(formatDate(version.release_time) || text('日期未知','Date unknown'))}${arches ? ' · ' + escapeHtml(arches) : ''}</small></span></span><span class="version-side"><span class="status-chip ${version.channel === 'release' ? '' : 'testing'}">${escapeHtml(minecraftChannelLabel(version))}</span>${build ? `<span class="meta-chip">${escapeHtml(build.trim())}</span>` : ''}</span></button>`;
  }).join('') : `<div class="library-empty">${text('没有找到匹配的版本，请更换关键词或筛选条件。','No matching versions. Try another query or filter.')}</div>`;
  list.querySelectorAll('[data-version]').forEach((button) => button.onclick = () => loadMinecraftVersion(button.dataset.version));
  const meta = data.pagination;
  $('#minecraft-pagination').innerHTML = meta.pages > 1 ? `<button class="outlined-button" type="button" data-page="${meta.page - 1}" ${meta.page <= 1 ? 'disabled' : ''}>${text('上一页','Previous')}</button><span>${text('第','Page ')}${meta.page} / ${meta.pages}</span><button class="outlined-button" type="button" data-page="${meta.page + 1}" ${meta.page >= meta.pages ? 'disabled' : ''}>${text('下一页','Next')}</button>` : '';
  $('#minecraft-pagination').querySelectorAll('[data-page]').forEach((button) => button.onclick = () => loadMinecraftCatalog(Number(button.dataset.page)));
}
async function loadMinecraftVersion(versionId, generation = minecraftState.generation) {
  const detailGeneration = ++minecraftState.detailGeneration;
  const detail = $('#minecraft-detail');
  const knownVersion = (minecraftState.catalog?.versions || []).find((item) => item.id === versionId);
  const loadingVersion = knownVersion?.platform === 'android' ? (knownVersion.store_version || versionId) : versionId;
  detail.innerHTML = `<span class="eyebrow">VERSION DETAIL</span><h2>${escapeHtml(loadingVersion)}</h2><div class="library-loading">${text('正在读取版本与下载信息…','Loading version and download details…')}</div>`;
  try {
    const params = new URLSearchParams({ edition: minecraftState.edition, platform: minecraftState.platform, id: versionId });
    const response = await fetch('/api/minecraft/version?' + params);
    const result = await response.json();
    if (!response.ok) throw new Error(localizedError(result.error, text('版本详情读取失败。','Could not load version details.')));
    if (generation !== minecraftState.generation || detailGeneration !== minecraftState.detailGeneration) return;
    minecraftState.selectedVersion = result.version;
    renderMinecraftCatalog();
    renderMinecraftDetail();
  } catch (error) {
    if (generation === minecraftState.generation && detailGeneration === minecraftState.detailGeneration) detail.innerHTML = `<span class="eyebrow">VERSION DETAIL</span><h2>${text('读取失败','Unable to load')}</h2><p>${escapeHtml(error.message)}</p>`;
  }
}
function renderMinecraftDetail() {
  const version = minecraftState.selectedVersion;
  if (!version) return;
  const downloadAction = (label, icon = 'download', modifier = '') => `<span class="download-action ${modifier}">${BlogIcons.svg(icon)}<span>${escapeHtml(label)}</span></span>`;
  const detail = $('#minecraft-detail');
  const isBedrock = version.edition === 'bedrock';
  const displayVersion = isBedrock && version.platform === 'android' ? (version.store_version || version.id) : version.id;
  const facts = [
    [text('版本通道','Channel'), minecraftChannelLabel(version)],
    [text('发布时间','Released'), formatDate(version.release_time) || text('未知','Unknown')],
    [text('游戏版本','Edition'), isBedrock ? text('基岩版','Bedrock') : text('Java 版','Java')],
    [isBedrock ? text('构建类型','Build type') : text('版本类型','Version type'), isBedrock ? `${version.build_type || '—'}${version.platform === 'android' ? '' : version.store_version ? ' · ' + version.store_version : ''}` : cleanMinecraftType(version.type)],
    [text('系统架构','Architectures'), (version.architectures || []).join(' · ') || text('通用','Universal')],
  ];
  let downloadHtml = '';
  if (isBedrock && version.platform === 'android') {
    const providerGroups = new Map();
    for (const download of version.downloads || []) {
      if (!safeHttpUrl(download.url)) continue;
      const provider = download.provider || text('其他网盘','Other drive');
      const group = providerGroups.get(provider) || [];
      group.push(download);
      providerGroups.set(provider, group);
    }
    downloadHtml = `<div class="cloud-download-groups">${[...providerGroups.entries()].map(([provider, downloads]) => `<section class="cloud-download-group"><header><span class="cloud-drive-mark">${escapeHtml(provider.slice(0, 1))}</span><div><strong>${escapeHtml(provider)}</strong><small>${downloads.length} ${text('种架构','architectures')}</small></div></header><div class="cloud-download-options">${downloads.map((download) => `<a class="download-option" href="${escapeHtml(safeHttpUrl(download.url))}" target="_blank" rel="noopener" aria-label="${text('打开网盘','Open drive')}：${escapeHtml(provider)} ${escapeHtml(download.architecture)}"><span class="download-architecture">${escapeHtml(download.architecture)}<small>${escapeHtml(download.size || text('大小未知','Unknown size'))}</small></span><span class="download-icon" aria-hidden="true">${BlogIcons.svg('download')}</span></a>`).join('')}</div></section>`).join('')}</div>`;
  } else if (isBedrock) {
    const batches = [];
    for (const variation of version.variations || []) {
      for (const link of variation.links || []) {
        if (link.kind === 'file') batches.push(`<a class="download-link" href="${escapeHtml(safeHttpUrl(link.url))}" target="_blank" rel="noopener"><span>${escapeHtml(variation.architecture || '')} · ${escapeHtml(link.label)}</span>${downloadAction(text('下载','Download'))}</a>`);
      }
      if (!(variation.links || []).some((link) => link.kind === 'file')) batches.push(`<div class="download-link"><span>${escapeHtml(variation.architecture || '')} · ${text('更新 ID','Update ID')}</span>${downloadAction((variation.links || [])[0]?.label || text('请打开来源页','Open source page'), 'right', 'secondary')}</div>`);
    }
    downloadHtml = batches.join('');
  } else {
    downloadHtml = (version.downloads || []).map((download) => `<a class="download-link" href="${escapeHtml(safeHttpUrl(download.url))}" target="_blank" rel="noopener"><span>${escapeHtml(download.name)} · ${formatBytes(download.size)}</span>${downloadAction(text('下载','Download'))}</a>`).join('');
  }
  const pageUrl = isBedrock && version.platform === 'android'
    ? (safeHttpUrl(version.page_url) || 'https://mc233.endyun.ltd/')
    : isBedrock
      ? version.page_url
      : `https://minecraft.wiki/w/Java_Edition_${encodeURIComponent(version.id)}`;
  detail.innerHTML = `<div class="version-detail-head"><div><span class="eyebrow">${isBedrock ? text('基岩版','BEDROCK EDITION') : text('Java 版','JAVA EDITION')}</span><h2 class="version-detail-id">${escapeHtml(displayVersion)}</h2></div><span class="status-chip ${version.channel === 'release' ? '' : 'testing'}">${escapeHtml(minecraftChannelLabel(version))}</span></div><p class="detail-note">${text('以下信息由公开数据源实时聚合；下载前请核对版本、架构和校验信息。','Aggregated from public sources. Verify the version, architecture, and checks before downloading.')}</p><div class="detail-grid">${facts.map(([label,value]) => `<div class="detail-fact"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || '—')}</strong></div>`).join('')}</div><h3 class="detail-subhead">${isBedrock && version.platform === 'android' ? text('网盘与架构下载','Cloud drives and architectures') : text('下载与来源','Downloads and sources')}</h3><div class="download-list">${downloadHtml || `<div class="library-empty">${text('此版本没有可用的直接下载条目。','No direct downloads are listed for this version.')}</div>`}</div><div class="detail-actions"><a class="outlined-button" href="${escapeHtml(safeHttpUrl(pageUrl))}" target="_blank" rel="noopener" data-no-icon>${isBedrock ? (version.platform === 'android' ? text('MC版本库','MC Version Library') : 'MCAPPX') : 'Minecraft Wiki'} ↗</a><button class="tonal-button" id="copy-version-link" type="button" data-no-icon>${text('复制版本页','Copy version link')}</button></div><p id="version-copy-status" class="detail-note" aria-live="polite"></p>`;
  $('#copy-version-link').onclick = () => copyLibraryText(pageUrl, $('#version-copy-status'));
}
async function loadMinecraftCatalog(page = 1) {
  const generation = ++minecraftState.generation;
  minecraftState.selectedVersion = null;
  minecraftState.page = Math.max(1, Number(page) || 1);
  $('#minecraft-summary').textContent = text('正在读取版本目录…','Loading version catalog…');
  $('#minecraft-list').innerHTML = `<div class="library-loading">${text('正在连接版本数据源…','Connecting to the version source…')}</div>`;
  try {
    const params = new URLSearchParams({ edition: minecraftState.edition, platform: minecraftState.platform, channel: minecraftState.channel, q: minecraftState.query, build: minecraftState.build, page: minecraftState.page, page_size: 18 });
    const response = await fetch('/api/minecraft/catalog?' + params);
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('版本目录暂时不可用。','Version catalog is unavailable.')));
    if (generation !== minecraftState.generation) return;
    minecraftState.catalog = data;
    renderMinecraftCatalog();
    const first = data.versions?.[0];
    if (first) await loadMinecraftVersion(first.id, generation);
    else $('#minecraft-detail').innerHTML = `<span class="eyebrow">VERSION DETAIL</span><h2>${text('没有匹配的版本','No matching version')}</h2><p class="detail-note">${text('调整关键词或筛选条件后重试。','Adjust the query or filters and try again.')}</p>`;
  } catch (error) {
    if (generation === minecraftState.generation) {
      $('#minecraft-summary').textContent = error.message;
      $('#minecraft-list').innerHTML = `<div class="library-empty">${escapeHtml(error.message)}</div>`;
    }
  }
}
function printMirrorPath(template, version, architecture) {
  return template.replaceAll('{version}', encodeURIComponent(version.id)).replaceAll('{codename}', encodeURIComponent(version.codename || version.id)).replaceAll('{arch}', encodeURIComponent(architecture.token));
}
function renderMirrorSystemOptions(preferredId = mirrorState.systemId) {
  const query = mirrorState.query.toLowerCase();
  const systems = mirrorState.catalog.systems.filter((system) => (!mirrorState.type || system.type === mirrorState.type) && (!query || `${system.name} ${system.name_en} ${system.description}`.toLowerCase().includes(query)));
  const select = $('#mirror-system');
  select.innerHTML = systems.map((system) => `<option value="${system.id}">${escapeHtml(system.name)}</option>`).join('') || `<option value="">${text('没有匹配的系统','No matching system')}</option>`;
  const selected = systems.some((system) => system.id === preferredId) ? preferredId : systems[0]?.id || '';
  select.value = selected;
  mirrorState.systemId = selected;
  mirrorState.versionId = '';
  mirrorState.archId = '';
  renderMirrorVersionOptions();
}
function renderMirrorVersionOptions() {
  const system = mirrorState.catalog.systems.find((item) => item.id === mirrorState.systemId);
  const versionSelect = $('#mirror-version');
  const archSelect = $('#mirror-arch');
  if (!system) {
    versionSelect.innerHTML = archSelect.innerHTML = '';
    $('#mirror-list').innerHTML = `<div class="library-empty">${text('没有匹配的镜像系统。','No matching mirror system.')}</div>`;
    $('#mirror-summary').textContent = text('请调整搜索或系统类型。','Adjust the search or system type.');
    return;
  }
  versionSelect.innerHTML = system.versions.map((version) => `<option value="${version.id}">${escapeHtml(version.name)}</option>`).join('');
  mirrorState.versionId = system.versions[0].id;
  versionSelect.value = mirrorState.versionId;
  archSelect.innerHTML = system.architectures.map((arch) => `<option value="${arch.id}">${escapeHtml(arch.name)}</option>`).join('');
  mirrorState.archId = system.architectures[0].id;
  archSelect.value = mirrorState.archId;
  const availableMirrors = mirrorState.catalog.mirrors.filter((mirror) => !system.mirror_ids || system.mirror_ids.includes(mirror.id));
  mirrorState.selectedMirror = availableMirrors[0]?.id || '';
  renderMirrorCards();
}
function renderMirrorCards() {
  const data = mirrorState.catalog;
  const system = data.systems.find((item) => item.id === mirrorState.systemId);
  if (!system) return;
  const version = system.versions.find((item) => item.id === mirrorState.versionId);
  const architecture = system.architectures.find((item) => item.id === mirrorState.archId);
  const mirrors = data.mirrors.filter((mirror) => !system.mirror_ids || system.mirror_ids.includes(mirror.id));
  const list = $('#mirror-list');
  list.innerHTML = mirrors.map((mirror) => {
    const path = printMirrorPath(system.path, version, architecture);
    const url = `${mirror.base.replace(/\/$/, '')}/${path}`;
    return `<article class="mirror-row ${mirrorState.selectedMirror === mirror.id ? 'selected' : ''}" data-mirror="${mirror.id}"><div class="mirror-row-head"><div class="mirror-name"><span class="mirror-logo">${escapeHtml(mirror.short)}</span><span><h3>${escapeHtml(text(mirror.name, mirror.name_en))}</h3><p>${escapeHtml(text(mirror.description, mirror.description_en))}</p></span></div><span class="meta-chip">${escapeHtml(system.type.toUpperCase())}</span></div><div class="mirror-path">${escapeHtml(url)}</div><div class="mirror-actions"><a class="filled-button" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-no-icon>${text('打开目录','Open directory')} ↗</a><button class="tonal-button" type="button" data-copy="${escapeHtml(url)}" data-no-icon>${text('复制地址','Copy URL')}</button><button class="outlined-button" type="button" data-probe="${mirror.id}" data-no-icon>${text('检测','Check')}</button></div><div class="probe-status" aria-live="polite"></div></article>`;
  }).join('');
  $('#mirror-summary').textContent = `${system.name} ${version.name} · ${architecture.name} · ${mirrors.length} ${text('个可用镜像入口','mirror options')}`;
  $('#mirror-count').textContent = String(mirrors.length);
  document.querySelectorAll('[data-copy]').forEach((button) => button.onclick = () => copyLibraryText(button.dataset.copy, button.closest('.mirror-row').querySelector('.probe-status')));
  document.querySelectorAll('[data-probe]').forEach((button) => button.onclick = () => probeMirror(button));
  document.querySelectorAll('.mirror-row').forEach((row) => row.addEventListener('click', (event) => { if (!event.target.closest('a,button')) { mirrorState.selectedMirror = row.dataset.mirror; document.querySelectorAll('.mirror-row').forEach((item) => item.classList.toggle('selected', item === row)); renderMirrorDetail(); } }));
  if (!mirrors.some((mirror) => mirror.id === mirrorState.selectedMirror)) mirrorState.selectedMirror = mirrors[0]?.id || '';
  renderMirrorDetail();
}
async function probeMirror(button) {
  const row = button.closest('.mirror-row');
  const status = row.querySelector('.probe-status');
  button.disabled = true;
  status.className = 'probe-status';
  status.textContent = text('正在检测镜像目录…','Checking mirror directory…');
  try {
    const params = new URLSearchParams({ mirror: button.dataset.probe, system: mirrorState.systemId, version: mirrorState.versionId, arch: mirrorState.archId });
    const result = await (await fetch('/api/mirrors/probe?' + params)).json();
    status.className = `probe-status ${result.ok ? 'ok' : 'failed'}`;
    status.textContent = result.ok ? `${text('可访问','Available')} · HTTP ${result.status} · ${result.latency_ms} ms` : `${text('暂不可用','Unavailable')} · ${result.error || 'HTTP ' + result.status}`;
  } catch { status.className = 'probe-status failed'; status.textContent = text('检测请求失败','Availability check failed'); }
  finally { button.disabled = false; }
}
function renderMirrorDetail() {
  const data = mirrorState.catalog;
  const system = data?.systems.find((item) => item.id === mirrorState.systemId);
  const mirror = data?.mirrors.find((item) => item.id === mirrorState.selectedMirror);
  if (!system || !mirror) return;
  const version = system.versions.find((item) => item.id === mirrorState.versionId);
  const architecture = system.architectures.find((item) => item.id === mirrorState.archId);
  const url = `${mirror.base.replace(/\/$/, '')}/${printMirrorPath(system.path, version, architecture)}`;
  $('#mirror-detail').innerHTML = `<span class="eyebrow">${escapeHtml(mirror.short)} · ${escapeHtml(system.type.toUpperCase())}</span><h2>${escapeHtml(text(mirror.name, mirror.name_en))}</h2><p class="detail-note">${escapeHtml(text(system.description, system.description_en))}</p><div class="detail-grid"><div class="detail-fact"><span>${text('系统','System')}</span><strong>${escapeHtml(system.name)}</strong></div><div class="detail-fact"><span>${text('版本','Version')}</span><strong>${escapeHtml(version.name)}</strong></div><div class="detail-fact"><span>${text('架构','Architecture')}</span><strong>${escapeHtml(architecture.name)}</strong></div><div class="detail-fact"><span>${text('镜像更新时间','Catalog date')}</span><strong>${escapeHtml(data.updated_at)}</strong></div></div><div class="library-detail-block"><div class="detail-subhead">${text('镜像目录','Mirror directory')}</div><code class="mirror-path">${escapeHtml(url)}</code><div class="detail-actions"><a class="filled-button" href="${escapeHtml(url)}" target="_blank" rel="noopener" data-no-icon>${text('打开目录','Open directory')} ↗</a><a class="outlined-button" href="${escapeHtml(mirror.home)}" target="_blank" rel="noopener" data-no-icon>${text('镜像主页','Mirror home')} ↗</a>${system.official_url ? `<a class="tonal-button" href="${escapeHtml(safeHttpUrl(system.official_url))}" target="_blank" rel="noopener" data-no-icon>${escapeHtml(text(system.official_label, system.official_label_en || system.official_label))} ↗</a>` : ''}</div></div><p class="detail-note">${text('目录地址按系统惯例生成，建议先用“检测”确认同步状态；Windows 与 macOS 的最终版本和许可以官方页面为准。','Use Check to verify mirror synchronization. For Windows and macOS, the official page is authoritative for releases and licenses.')}</p>`;
}
async function loadMirrorCatalog() {
  if (mirrorState.catalog && mirrorState.systemId) {
    renderMirrorCards();
    return;
  }
  $('#mirror-summary').textContent = text('正在读取镜像目录…','Loading mirror catalog…');
  try {
    const response = await fetch('/api/mirrors/catalog');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text('镜像目录暂时不可用。','Mirror catalog is unavailable.'));
    mirrorState.catalog = data;
    renderMirrorSystemOptions();
  } catch (error) { $('#mirror-list').innerHTML = `<div class="library-empty">${escapeHtml(error.message)}</div>`; $('#mirror-summary').textContent = error.message; }
}
function safeFriendAvatarUrl(value) {
  const url = String(value || '');
  return /^https:\/\//i.test(url) ? url : '';
}
function renderFriends() {
  const query = friendState.query.trim().toLowerCase();
  const filtered = friendState.friends.filter((friend) => {
    if (!query) return true;
    return [friend.name, friend.description, friend.address, friend.url]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
  const pages = Math.max(1, Math.ceil(filtered.length / FRIENDS_PER_PAGE));
  friendState.page = Math.min(Math.max(1, friendState.page), pages);
  const visible = filtered.slice((friendState.page - 1) * FRIENDS_PER_PAGE, friendState.page * FRIENDS_PER_PAGE);
  $('#friend-count').textContent = query ? `${filtered.length} / ${friendState.friends.length}` : String(friendState.friends.length);
  $('#friend-grid').innerHTML = visible.length ? visible.map((friend) => {
    const initial = String(friend.name || 'F').trim().slice(0, 1).toUpperCase();
    const avatarUrl = safeFriendAvatarUrl(friend.avatar);
    return `<a class="friend-card" href="${escapeHtml(safeHttpUrl(friend.url))}" target="_blank" rel="noopener noreferrer nofollow"><span class="friend-avatar"><span>${escapeHtml(initial)}</span>${avatarUrl ? `<img src="${escapeHtml(avatarUrl)}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}</span><span class="friend-copy"><strong>${escapeHtml(friend.name)}</strong><p>${escapeHtml(friend.description || text('欢迎访问这位朋友的小站。','Visit this friend’s site.'))}</p><small>${escapeHtml(friend.address || new URL(friend.url).hostname)}</small></span><span class="friend-arrow" aria-hidden="true">↗</span></a>`;
  }).join('') : `<div class="friend-empty">${text('没有找到符合条件的友链。','No matching friend links found.')}</div>`;
  $('#friend-grid').querySelectorAll('.friend-avatar img').forEach((image) => {
    image.onerror = () => image.remove();
  });
  $('#friend-pagination').innerHTML = pages > 1 ? `<button class="outlined-button" data-friend-page="${friendState.page - 1}" ${friendState.page <= 1 ? 'disabled' : ''}>${text('上一页','Previous')}</button><span>${text('第','Page ')}${friendState.page} / ${pages}</span><button class="outlined-button" data-friend-page="${friendState.page + 1}" ${friendState.page >= pages ? 'disabled' : ''}>${text('下一页','Next')}</button>` : '';
  $('#friend-pagination').querySelectorAll('[data-friend-page]').forEach((button) => button.onclick = () => {
    friendState.page = Number(button.dataset.friendPage);
    renderFriends();
    $('#friend-grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
}
async function loadFriends(force = false) {
  if (friendState.loaded && !force) {
    renderFriends();
    return;
  }
  try {
    const response = await fetch('/api/friends');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text('友链读取失败。','Could not load friend links.'));
    friendState.friends = data.friends || [];
    friendState.loaded = true;
    renderFriends();
  } catch (error) {
    $('#friend-grid').innerHTML = `<div class="friend-empty">${escapeHtml(error.message)}</div>`;
    $('#friend-count').textContent = '0';
  }
}
function renderDailyMotionArt() {
  const host = $('.thoughts-motion-art');
  if (!host || host.dataset.motionVersion === '2') return;
  host.dataset.motionVersion = '2';
  host.innerHTML = `<svg viewBox="0 0 240 170" focusable="false"><defs><linearGradient id="daily-paper-gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="color-mix(in srgb,var(--primary-container) 94%,var(--surface))"/><stop offset="1" stop-color="color-mix(in srgb,var(--tertiary) 14%,var(--surface))"/></linearGradient><linearGradient id="daily-photo-gradient" x1="0" y1="0" x2="0" y2="1"><stop stop-color="color-mix(in srgb,var(--primary) 70%,#b8d8ff)"/><stop offset="1" stop-color="color-mix(in srgb,var(--tertiary) 45%,var(--surface))"/></linearGradient></defs><rect class="daily-canvas" x="8" y="7" width="224" height="156" rx="36" fill="color-mix(in srgb,var(--primary-container) 42%,var(--surface))"/><g class="daily-orbit-ring"><circle cx="120" cy="86" r="61" fill="none" stroke="var(--primary)" stroke-opacity=".16" stroke-width="1.5" stroke-dasharray="4 9"/><circle cx="181" cy="86" r="4" fill="var(--tertiary)"/></g><g transform="translate(30 31) rotate(-7)"><g class="daily-note-card"><rect width="120" height="108" rx="22" fill="url(#daily-paper-gradient)" stroke="var(--primary)" stroke-opacity=".24"/><rect x="17" y="20" width="48" height="8" rx="4" fill="var(--primary)" opacity=".78"/><rect x="17" y="39" width="82" height="5" rx="2.5" fill="var(--muted)" opacity=".45"/><rect x="17" y="53" width="68" height="5" rx="2.5" fill="var(--muted)" opacity=".35"/><rect x="17" y="67" width="76" height="5" rx="2.5" fill="var(--muted)" opacity=".3"/><g class="daily-check"><circle cx="97" cy="86" r="11" fill="var(--primary)"/><path d="m92 86 3.5 3.5 6.5-7" fill="none" stroke="var(--on-primary)" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g></g></g><g transform="translate(142 31) rotate(7)"><g class="daily-photo-card"><rect width="75" height="92" rx="18" fill="var(--surface)" stroke="var(--primary)" stroke-opacity=".25"/><rect x="7" y="7" width="61" height="57" rx="13" fill="url(#daily-photo-gradient)"/><circle cx="50" cy="24" r="8" fill="#ffe5a3" opacity=".9"/><path d="m12 55 17-20 12 13 8-8 13 15Z" fill="color-mix(in srgb,var(--surface) 76%,transparent)"/><rect x="8" y="72" width="39" height="6" rx="3" fill="var(--primary)" opacity=".55"/><circle class="daily-camera-dot" cx="60" cy="76" r="4" fill="var(--tertiary)"/></g></g><g transform="translate(171 108)"><g class="daily-like-badge"><circle r="17" fill="var(--surface)" stroke="var(--primary)" stroke-opacity=".22"/><path d="M0 8C-10 2-13-4-13-8c0-5 4-8 8-8 3 0 5 2 5 5 0-3 2-5 5-5 4 0 8 3 8 8 0 4-3 10-13 16Z" fill="var(--primary)"/></g></g><path class="daily-spark" d="m199 31 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="var(--tertiary)"/><circle class="daily-dot" cx="38" cy="139" r="5" fill="var(--primary)"/><circle class="daily-dot second" cx="128" cy="143" r="3.5" fill="var(--tertiary)"/></svg>`;
}
function renderThoughts() {
  const list = $('#thoughts-list');
  if (!list) return;
  const cards = thoughtsCatalog.map((thought) => {
    const imageUrls = galleryImageUrls(thought);
    const image = galleryMarkup(imageUrls, `thought-gallery count-${Math.min(imageUrls.length, 4)}`, text('日常记录照片','Everyday photos'));
    return `<article class="thought-card ${imageUrls.length ? 'has-photo' : ''}"><div class="thought-marker" aria-hidden="true"></div><div class="thought-card-body"><div class="thought-meta"><span class="status-chip">${escapeHtml(thought.mood || text('日常','Daily'))}</span><time>${formatDate(thought.created_at)}</time></div>${thought.content ? `<p>${escapeHtml(thought.content)}</p>` : ''}${image}<div class="thought-actions"><button class="thought-like ${thought.liked ? 'liked' : ''}" type="button" data-thought-like="${escapeHtml(thought.id)}" aria-pressed="${String(Boolean(thought.liked))}">${BlogIcons.svg('heart')}<span>${thought.liked ? text('已赞','Liked') : text('点赞','Like')}${Number(thought.likes || 0) ? ` · ${Number(thought.likes)}` : ''}</span></button></div></div></article>`;
  });
  if (!cards.length) {
    list.innerHTML = `<div class="friend-empty">${text('还没有日常记录，稍后再来看看。','No everyday moments yet. Check back soon.')}</div>`;
    return;
  }
  const columnCount = innerWidth <= 670 ? 1 : innerWidth <= 1040 ? 2 : 3;
  const columns = Array.from({ length: columnCount }, (_, columnIndex) => cards.filter((_, cardIndex) => cardIndex % columnCount === columnIndex));
  list.innerHTML = `<div class="thoughts-columns" data-thought-columns="${columnCount}">${columns.map((column) => `<div class="thoughts-column">${column.join('')}</div>`).join('')}</div>`;
  list.querySelectorAll('[data-thought-like]').forEach((button) => {
    button.onclick = async () => {
      if (!currentUser) return openAccount('login');
      const thought = thoughtsCatalog.find((item) => item.id === button.dataset.thoughtLike);
      if (!thought) return;
      button.disabled = true;
      try {
        const response = await fetch(`/api/thoughts/${encodeURIComponent(thought.id)}/like`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
        if (response.status === 401) return openAccount('login');
        const result = await response.json();
        if (!response.ok) throw new Error(localizedError(result.error));
        thought.likes = Number(result.likes || 0);
        thought.liked = Boolean(result.liked);
        button.classList.toggle('liked', thought.liked);
        button.setAttribute('aria-pressed', String(thought.liked));
        button.querySelector('span').textContent = `${thought.liked ? text('已赞','Liked') : text('点赞','Like')}${thought.likes ? ` · ${thought.likes}` : ''}`;
      } catch (_) {
      } finally {
        button.disabled = false;
      }
    };
  });
}
async function loadThoughts(force = false) {
  if (thoughtsLoaded && !force) {
    renderThoughts();
    return;
  }
  try {
    const response = await fetch('/api/thoughts');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text('日常读取失败。','Could not load everyday moments.'));
    thoughtsCatalog = data.thoughts || [];
    thoughtsLoaded = true;
    renderThoughts();
  } catch (error) {
    $('#thoughts-list').innerHTML = `<div class="friend-empty">${escapeHtml(error.message)}</div>`;
  }
}
function renderAboutComments() {
  commentPage = Math.min(commentPage, Math.max(1, Math.ceil(commentRoots(aboutCommentData).length / COMMENTS_PER_PAGE)));
  renderCommentThread(aboutCommentData, { id: 'about' }, {
    threadSelector: '#about-comment-thread',
    countSelector: '#about-comment-count',
    paginationSelector: '#about-comment-pagination',
  });
}
async function loadAboutComments(force = false) {
  if (aboutCommentsLoaded && !force) {
    renderAboutComments();
    return;
  }
  try {
    const response = await fetch('/api/comments?post=about');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || text('留言读取失败。','Could not load messages.'));
    aboutCommentData = data;
    aboutCommentsLoaded = true;
    renderAboutComments();
  } catch (error) {
    $('#about-comment-thread').innerHTML = `<div class="comment-empty">${escapeHtml(error.message)}</div>`;
    $('#about-comment-count').textContent = '0';
  }
}
function showRoute() {
  if (location.pathname.startsWith('/post/')) return;
  const pathRoute = Object.keys(PUBLIC_ROUTES).find(route => PUBLIC_ROUTES[route] === location.pathname) || 'home';
  let route = location.hash.slice(1).split('?')[0] || pathRoute;
  if (route === 'profile' && !currentUser) {
    history.replaceState(null, '', '/');
    route = 'home';
    openAccount('login');
  }
  document.body.dataset.page = route;
  const storyListing = ['home', 'search', 'articles'].includes(route);
  $('#hero').classList.toggle('hidden', route !== 'home');
  $('#home-carousel').classList.toggle('hidden', route !== 'home' || !(site.carousel || []).length);
  if (route === 'home') renderHomeCarousel();
  else stopCarousel();
  $('#toolbar').classList.toggle('hidden', !storyListing);
  $('#posts-view').classList.toggle('hidden', !storyListing);
  $('#articles-page-intro').classList.toggle('hidden', route !== 'articles');
  $('#articles-list-controls').classList.toggle('hidden', !storyListing);
  $('#home-posts-heading').classList.toggle('hidden', route !== 'home');
  applyArticleLayout(savedArticleLayout);
  if (storyListing) requestAnimationFrame(positionCategoryThumb);
  $('#archive-view').classList.toggle('hidden', route !== 'archive');
  $('#announcements-page-view').classList.toggle('hidden', route !== 'announcements');
  $('#minecraft-view').classList.toggle('hidden', route !== 'minecraft');
  $('#mirrors-view').classList.toggle('hidden', route !== 'mirrors');
  $('#thoughts-view').classList.toggle('hidden', route !== 'thoughts');
  $('#support-view').classList.toggle('hidden', route !== 'support');
  $('#friends-view').classList.toggle('hidden', route !== 'friends');
  $('#about-view').classList.toggle('hidden', route !== 'about');
  $('#profile-page-view').classList.toggle('hidden', route !== 'profile');
  const policyRoute = ['privacy','cookies','terms','copyright','disclaimer'].includes(route);
  $('#policy-page-view').classList.toggle('hidden', !policyRoute);
  if (route === 'archive') loadArchive();
  if (route === 'minecraft') {
    updateMinecraftFilters();
    if (minecraftState.catalog) {
      renderMinecraftCatalog();
      if (minecraftState.selectedVersion) renderMinecraftDetail();
    } else loadMinecraftCatalog();
  }
  if (route === 'mirrors') loadMirrorCatalog();
  if (route === 'thoughts') loadThoughts();
  if (route === 'friends') loadFriends();
  if (route === 'about') { commentPage = 1; loadAboutComments(); }
  if (route === 'announcements') renderAnnouncementPage();
  if (route === 'profile') renderProfilePage();
  if (route === 'minecraft') document.title = `${text('Minecraft 版本库','Minecraft Versions')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'mirrors') document.title = `${text('镜像库','Mirrors')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'support') document.title = `${text('投喂与支持','Support')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'friends') document.title = `${text('友情链接','Friend links')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'thoughts') document.title = `${text('日常','Everyday')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'profile') document.title = `${text('个人资料','Your profile')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'archive') document.title = `${text('文章归档','Archive')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'about') document.title = `${text('关于本站','About')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'search') document.title = `${text('搜索文章','Search')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'articles') document.title = `${text('全部文章','All stories')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (route === 'announcements') document.title = `${text('网站公告','Site announcements')} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
  else if (policyRoute) renderPolicyPage(route);
  else document.title = text(site.profile?.name, site.profile?.name_en) || 'StarIsle';
  document.querySelectorAll('[data-route]').forEach((link) => { const active = link.dataset.route === route; link.classList.toggle('active', active); if (active) link.setAttribute('aria-current', 'page'); else link.removeAttribute('aria-current'); });
}
function commentRoots(data) {
  const comments = data.comments || [];
  const ids = new Set(comments.map((comment) => comment.id));
  return comments.filter((comment) => !comment.parent_id || !ids.has(comment.parent_id));
}
function commentsMarkup(data) {
  const comments = data.comments || [];
  const ids = new Set(comments.map((comment) => comment.id));
  const children = new Map();
  comments.forEach((comment) => {
    const parent = comment.parent_id && ids.has(comment.parent_id) ? comment.parent_id : '';
    if (parent) children.set(parent, [...(children.get(parent) || []), comment]);
  });
  const roots = commentRoots(data);
  const pages = Math.max(1, Math.ceil(roots.length / COMMENTS_PER_PAGE));
  commentPage = Math.min(Math.max(1, commentPage), pages);
  const visibleRoots = roots.slice((commentPage - 1) * COMMENTS_PER_PAGE, commentPage * COMMENTS_PER_PAGE);
  const replyTools = (id, username) => `<form class="comment-reply-form hidden" data-reply-form="${escapeHtml(id)}"><textarea rows="1" maxlength="2000" placeholder="${text('回复','Reply to')} @${escapeHtml(username)}"></textarea><div class="comment-image-previews" data-comment-image-previews></div><div class="comment-reply-actions"><label class="comment-image-picker">${BlogIcons.svg('upload')}<span>${text('图片 · 可点击或拖入','Images · click or drop')}</span><input class="hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-comment-image-input multiple><input type="hidden" data-comment-image-urls></label><span class="comment-image-status" data-comment-image-status role="status"></span><button class="filled-button" type="submit" data-no-icon>${text('发送回复','Send reply')}</button><button class="text-button" type="button" data-reply-cancel data-no-icon>${text('取消','Cancel')}</button></div></form>`;
  const renderComment = (comment, depth = 0) => {
    const replies = children.get(comment.id) || [];
    const author = comment.user || { id: comment.user_id || '', username: comment.username || '', avatar_url: '' };
    const username = author.username || comment.username || text('用户', 'User');
    const userButton = author.id
      ? `<button class="comment-user-name" type="button" data-user-id="${escapeHtml(author.id)}">${escapeHtml(username)}</button>`
      : `<strong>${escapeHtml(username)}</strong>`;
    const avatar = avatarImageMarkup(author, 'comment-avatar');
    const avatarControl = author.id
      ? `<button class="comment-avatar-button" type="button" data-user-id="${escapeHtml(author.id)}" aria-label="${text('查看用户资料','View user profile')}：${escapeHtml(username)}">${avatar}</button>`
      : avatar;
    const quotedContent = comment.reply_to_content || '';
    const quotesRepliedComment = Boolean(comment.parent_id && comment.reply_to_id && comment.reply_to_id !== comment.parent_id);
    const quote = quotesRepliedComment ? `<blockquote class="comment-quote"><span>${text('回复','Reply to')} @${escapeHtml(comment.reply_to_username || text('用户','User'))}</span>${quotedContent ? `<p>${escapeHtml(quotedContent)}</p>` : ''}</blockquote>` : '';
    const imageUrls = galleryImageUrls(comment);
    const image = galleryMarkup(imageUrls, `comment-gallery count-${Math.min(imageUrls.length, 4)}`, text('评论图片','Comment images'));
    const deleteAction = comment.can_delete ? `<button class="comment-action comment-delete-action" type="button" data-comment-delete="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('delete')}<span>${text('删除','Delete')}</span></button>` : '';
    const reviewLabel = comment.pending_review ? `<span class="comment-review-label" title="${text('审核通过后将恢复原文','The original text will be restored after review')}">${text('待审核 · 已打码','Masked · Pending review')}</span>` : '';
    const reviewRequestAction = comment.can_delete && comment.pending_review ? `<button class="comment-action comment-review-request${comment.review_requested ? ' requested' : ''}" type="button" data-comment-request-review="${escapeHtml(comment.id)}" data-no-icon ${comment.review_requested ? 'disabled' : ''}>${BlogIcons.svg('send')}<span>${comment.review_requested ? text('已催审','Review requested') : text('催审','Request review')}</span></button>` : '';
    return `<article class="comment-item ${depth ? 'comment-reply' : ''}" data-comment-id="${escapeHtml(comment.id)}">${avatarControl}<div class="comment-body"><header class="comment-header">${userButton}${comment.pinned ? `<span class="comment-pin-label">${text('置顶','Pinned')}</span>` : ''}${reviewLabel}<time>${formatDate(comment.created_at)}</time></header>${quote}${comment.content ? `<p class="comment-text">${escapeHtml(comment.content)}</p>` : ''}${image}<div class="comment-actions"><button class="comment-action ${comment.liked ? 'liked' : ''}" type="button" data-comment-like="${escapeHtml(comment.id)}" data-no-icon aria-label="${comment.liked ? text('取消点赞','Unlike') : text('点赞','Like')}">${BlogIcons.svg('heart')}<span>${comment.liked ? text('已赞','Liked') : text('点赞','Like')}${Number(comment.likes || 0) ? ` · ${Number(comment.likes)}` : ''}</span></button><button class="comment-action" type="button" data-comment-reply="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('send')}<span>${text('回复','Reply')}</span></button><button class="comment-action" type="button" data-comment-report="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('flag')}<span>${text('举报','Report')}</span></button>${reviewRequestAction}${deleteAction}</div>${replyTools(comment.id, username)}${replies.length && depth < 3 ? `<div class="comment-replies">${replies.map((reply) => renderComment(reply, depth + 1)).join('')}</div>` : ''}</div></article>`;
  };
  if (!roots.length) return `<div class="comment-empty">${text('还没有评论。','No comments yet.')}</div>`;
  const rendered = new Set();
  const walk = (comment, depth = 0) => {
    if (!comment || rendered.has(comment.id)) return '';
    rendered.add(comment.id);
    return renderComment(comment, depth);
  };
  return visibleRoots.map((comment) => walk(comment)).join('');
}
function renderCommentPagination(data, post, {
  paginationSelector = '#comment-pagination',
  threadSelector = '#comment-thread',
  countSelector = '#comment-count',
} = {}) {
  const roots = commentRoots(data);
  const pages = Math.max(1, Math.ceil(roots.length / COMMENTS_PER_PAGE));
  const pagination = $(paginationSelector);
  if (!pagination) return;
  commentPage = Math.min(pages, Math.max(1, commentPage));
  renderPager(pagination, commentPage, pages, (page) => {
    commentPage = page;
    renderCommentThread(data, post, { scroll: true, threadSelector, countSelector, paginationSelector });
  });
}
function renderCommentThread(data, post, {
  preserveScroll = false,
  scroll = false,
  threadSelector = '#comment-thread',
  countSelector = '#comment-count',
  paginationSelector = '#comment-pagination',
} = {}) {
  const host = $(threadSelector);
  if (!host || !data) return;
  const scrolledTo = window.scrollY;
  host.innerHTML = commentsMarkup(data);
  $(countSelector).textContent = String((data.comments || []).length);
  renderCommentPagination(data, post, { paginationSelector, threadSelector, countSelector });
  bindCommentActions(data, post, threadSelector, countSelector, paginationSelector);
  const restore = () => {
    if (preserveScroll) window.scrollTo({ top: scrolledTo, left: 0, behavior: 'instant' });
    if (scroll) host.closest('.comments, .about-messages')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  requestAnimationFrame(restore);
}
function commentImageUrls(form) {
  const input = form?.querySelector('[data-comment-image-urls]');
  let urls = [];
  try {
    const parsed = JSON.parse(input?.value || '[]');
    urls = Array.isArray(parsed) ? parsed : [];
  } catch (_) {}
  const legacy = form?.querySelector('[data-comment-image-url]')?.value;
  if (legacy && !urls.includes(legacy)) urls.push(legacy);
  return [...new Set(urls.map(safeSupportImageUrl).filter(Boolean))].slice(0, MAX_GALLERY_IMAGES);
}
function writeCommentImageUrls(form, urls) {
  const normalized = [...new Set(urls.map(safeSupportImageUrl).filter(Boolean))].slice(0, MAX_GALLERY_IMAGES);
  const input = form.querySelector('[data-comment-image-urls]');
  if (input) input.value = JSON.stringify(normalized);
  form.querySelector('[data-comment-image-url]')?.remove();
  renderCommentImagePreviews(form);
  if (form.classList.contains('comment-form')) pendingCommentImageUrls = normalized;
  return normalized;
}
function renderCommentImagePreviews(form) {
  const host = form.querySelector('[data-comment-image-previews]');
  if (!host) return;
  const urls = commentImageUrls(form);
  host.innerHTML = urls.map((url, index) => `<div class="comment-image-preview-item"><img src="${escapeHtml(url)}" alt="${escapeHtml(text('已选图片','Selected image'))} ${index + 1}"><button class="comment-image-remove" type="button" data-comment-image-remove="${escapeHtml(url)}" data-no-icon aria-label="${escapeHtml(text('移除图片','Remove image'))}">×</button></div>`).join('');
}
function clearCommentImagePicker(form, message = '') {
  writeCommentImageUrls(form, []);
  const input = form.querySelector('[data-comment-image-input]');
  if (input) input.value = '';
  const status = form.querySelector('[data-comment-image-status]');
  if (status) {
    status.textContent = message;
    status.classList.remove('success', 'error');
  }
}
async function uploadCommentImages(files, form) {
  const status = form.querySelector('[data-comment-image-status]');
  if (!status) return;
  status.classList.remove('error', 'success');
  let urls = commentImageUrls(form);
  const available = Math.max(0, MAX_GALLERY_IMAGES - urls.length);
  const selected = [...files].slice(0, available);
  if (!available) {
    status.textContent = text(`最多上传 ${MAX_GALLERY_IMAGES} 张图片。`, `You can upload up to ${MAX_GALLERY_IMAGES} images.`);
    status.classList.add('error');
    return;
  }
  let failed = '';
  for (let index = 0; index < selected.length; index += 1) {
    const file = selected[index];
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      failed = text('仅支持 JPG、PNG、GIF 或 WebP。', 'Use JPG, PNG, GIF, or WebP images.');
      continue;
    }
    if (file.size > 4 * 1024 * 1024) {
      failed = text('单张图片不能超过 4 MB。', 'Each image must be 4 MB or smaller.');
      continue;
    }
    status.textContent = text(`正在上传 ${index + 1} / ${selected.length}…`, `Uploading ${index + 1} of ${selected.length}…`);
    const body = new FormData();
    body.append('file', file, file.name);
    try {
      const response = await fetch('/api/comment/image', { method: 'POST', body });
      const data = await response.json();
      if (response.status === 401) {
        openAccount('login');
        return;
      }
      if (!response.ok) throw new Error(localizedError(data.error, text('图片上传失败。','Could not upload the image.')));
      const url = safeSupportImageUrl(data.url);
      if (url && !urls.includes(url)) urls.push(url);
      urls = writeCommentImageUrls(form, urls);
    } catch (error) {
      failed = error.message || text('图片上传失败。','Could not upload the image.');
    }
  }
  if (files.length > available) failed = text(`最多上传 ${MAX_GALLERY_IMAGES} 张，多出的图片未处理。`, `Up to ${MAX_GALLERY_IMAGES} images can be added; extra files were skipped.`);
  status.textContent = failed || text(`已添加 ${urls.length} 张图片`, `${urls.length} images added`);
  status.classList.add(failed ? 'error' : 'success');
  const input = form.querySelector('[data-comment-image-input]');
  if (input) input.value = '';
  if (form.classList.contains('comment-form') && !failed) pendingCommentImageUrls = urls;
}
function bindCommentImageUploads(root = document) {
  root.querySelectorAll('[data-comment-image-input]').forEach((input) => {
    const form = input.closest('form');
    if (form && !form.dataset.imageDropBound) {
      form.dataset.imageDropBound = 'true';
      let dragDepth = 0;
      const hasFiles = (event) => [...(event.dataTransfer?.types || [])].includes('Files');
      form.addEventListener('dragenter', (event) => { if (!hasFiles(event)) return; event.preventDefault(); form.dataset.dropLabel = text('松开以上传图片','Drop images to upload'); dragDepth += 1; form.classList.add('dragging-images'); });
      form.addEventListener('dragover', (event) => { if (!hasFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
      form.addEventListener('dragleave', () => { dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) form.classList.remove('dragging-images'); });
      form.addEventListener('drop', (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault(); dragDepth = 0; form.classList.remove('dragging-images');
        const files = [...(event.dataTransfer?.files || [])].filter((file) => file.type.startsWith('image/'));
        if (files.length) uploadCommentImages(files, form);
      });
    }
    input.onchange = () => {
      const files = [...(input.files || [])];
      if (files.length) uploadCommentImages(files, input.closest('form'));
    };
  });
  root.querySelectorAll('[data-comment-image-previews]').forEach((host) => {
    const form = host.closest('form');
    renderCommentImagePreviews(form);
    host.onclick = (event) => {
      const button = event.target.closest('[data-comment-image-remove]');
      if (!button) return;
      const remaining = commentImageUrls(form).filter((url) => url !== button.dataset.commentImageRemove);
      writeCommentImageUrls(form, remaining);
      const status = form.querySelector('[data-comment-image-status]');
      if (status) {
        status.textContent = text(`已选择 ${remaining.length} 张图片`, `${remaining.length} images selected`);
        status.classList.remove('error', 'success');
      }
    };
  });
  root.querySelectorAll('[data-comment-image-url]').forEach((legacyInput) => {
    if (legacyInput.value) writeCommentImageUrls(legacyInput.closest('form'), [legacyInput.value]);
  });
}
function bindCommentActions(data, post, threadSelector = '#comment-thread', countSelector = '#comment-count', paginationSelector = '#comment-pagination') {
  const scope = $(threadSelector);
  if (!scope) return;
  const refresh = () => renderCommentThread(data, post, { preserveScroll: true, threadSelector, countSelector, paginationSelector });
  scope.querySelectorAll('.comment-avatar img').forEach((image) => {
    image.onerror = () => {
      image.classList.add('hidden');
      image.classList.add('avatar-broken');
      image.nextElementSibling?.classList.remove('hidden');
    };
  });
  scope.querySelectorAll('[data-comment-like]').forEach((button) => button.onclick = async () => {
    if (!currentUser) return openAccount('login');
    button.disabled = true;
    const response = await fetch(`/api/comments/${encodeURIComponent(button.dataset.commentLike)}/like`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
    if (response.status === 401) { button.disabled = false; return openAccount('login'); }
    if (response.ok) {
      const result = await response.json();
      const comment = (data.comments || []).find((item) => item.id === button.dataset.commentLike);
      if (comment) { comment.likes = result.likes; comment.liked = result.liked; }
      refresh();
    }
    button.disabled = false;
  });
  scope.querySelectorAll('[data-comment-reply]').forEach((button) => button.onclick = () => {
    if (!currentUser) return openAccount('login');
    const form = scope.querySelector(`[data-reply-form="${button.dataset.commentReply}"]`);
    scope.querySelectorAll('[data-reply-form]').forEach((item) => { if (item !== form) item.classList.add('hidden'); });
    form.classList.toggle('hidden');
    if (!form.classList.contains('hidden')) form.querySelector('textarea').focus();
  });
  scope.querySelectorAll('[data-reply-cancel]').forEach((button) => button.onclick = () => button.closest('[data-reply-form]').classList.add('hidden'));
  scope.querySelectorAll('[data-user-id]').forEach((button) => button.onclick = () => openPublicProfile(button.dataset.userId));
  scope.querySelectorAll('[data-comment-report]').forEach((button) => button.onclick = () => openReportDialog('comment', button.dataset.commentReport));
  scope.querySelectorAll('[data-comment-request-review]').forEach((button) => button.onclick = async () => {
    if (!currentUser) return openAccount('login');
    button.disabled = true;
    const commentId = button.dataset.commentRequestReview;
    const comment = (data.comments || []).find((item) => item.id === commentId);
    try {
      const response = await fetch(`/api/comments/${encodeURIComponent(commentId)}/request-review`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
      const result = await response.json();
      if (response.status === 401) { button.disabled = false; return openAccount('login'); }
      if (!response.ok && response.status !== 409) throw new Error(localizedError(result.error, text('催审失败，请稍后重试。','Could not request review. Please try again.')));
      if (comment) {
        comment.review_requested = true;
        comment.can_request_review = false;
      }
      renderCommentThread(data, post, { preserveScroll: true, threadSelector, countSelector, paginationSelector });
      showOAuthNotice(response.status === 409
        ? text('这条评论已经催审，请耐心等待管理员处理。','Review has already been requested for this comment.')
        : text('已通过邮件提醒管理员尽快审核，每条评论仅能催审一次。','The administrator has been notified by email. Each comment can be escalated only once.'));
    } catch (error) {
      button.disabled = false;
      showOAuthNotice(error.message || text('催审失败，请稍后重试。','Could not request review. Please try again.'), true);
    }
  });
  scope.querySelectorAll('[data-comment-delete]').forEach((button) => button.onclick = async () => {
    if (!currentUser) return openAccount('login');
    const confirmed = await showSiteDialog({
      title: text('删除评论', 'Delete comment'),
      message: text('确定删除这条评论吗？此操作无法撤销。', 'Delete this comment? This cannot be undone.'),
      confirmText: text('删除', 'Delete'),
      danger: true,
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      const response = await fetch(`/api/comments/${encodeURIComponent(button.dataset.commentDelete)}`, { method: 'DELETE' });
      const result = await response.json();
      if (response.status === 401) return openAccount('login');
      if (!response.ok) throw new Error(localizedError(result.error, text('评论删除失败。','Could not delete the comment.')));
      const deletedId = button.dataset.commentDelete;
      data.comments = (data.comments || []).filter((comment) => comment.id !== deletedId);
      data.comments.forEach((comment) => { if (comment.parent_id === deletedId) comment.parent_id = ''; });
      renderCommentThread(data, post, { preserveScroll: true, threadSelector, countSelector, paginationSelector });
    } catch (error) {
      button.disabled = false;
      await showSiteDialog({ title: text('操作失败', 'Action failed'), message: error.message || text('评论删除失败。','Could not delete the comment.'), confirmText: text('知道了', 'OK'), showCancel: false });
    }
  });
  bindCommentImageUploads(scope);
  scope.querySelectorAll('[data-reply-form]').forEach((form) => form.onsubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) return openAccount('login');
    const textarea = form.querySelector('textarea');
    const imageUrls = commentImageUrls(form);
    const response = await fetch('/api/comment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: post.id, parent_id: form.dataset.replyForm, content: textarea.value, image_urls: imageUrls }) });
    const result = await response.json();
    if (response.status === 401) return openAccount('login');
    if (!response.ok) { textarea.setCustomValidity(localizedError(result.error)); textarea.reportValidity(); return; }
    notifyPendingComment(result);
    textarea.setCustomValidity('');
    data.comments = [...(data.comments || []), result.comment];
    renderCommentThread(data, post, { preserveScroll: true, threadSelector, countSelector, paginationSelector });
  });
}
let articleTocObserver = null;
function setupArticleToc(container, toc) {
  if (!container || !toc) return;
  articleTocObserver?.disconnect();
  const headings = [...container.querySelectorAll('.article-content h2, .article-content h3, .article-content h4')].filter((heading) => heading.textContent.trim());
  const links = [];
  headings.forEach((heading, index) => {
    if (!heading.id) heading.id = `article-section-${index + 1}`;
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.className = `article-toc-link level-${heading.tagName.slice(1)}`;
    link.textContent = heading.textContent.trim();
    link.addEventListener('click', (event) => {
      event.preventDefault();
      heading.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', `#${heading.id}`);
    });
    links.push(link);
  });
  toc.innerHTML = `<header><mdui-icon name="format_list_bulleted" aria-hidden="true"></mdui-icon><div><span>${text('文章目录','On this page')}</span><small>${headings.length ? text(`${headings.length} 个章节`, `${headings.length} sections`) : text('暂无章节','No sections')}</small></div></header>${headings.length ? '<nav aria-label="文章目录"></nav>' : `<p>${text('本文没有可跳转的标题。','This story has no section headings.')}</p>`}`;
  const nav = toc.querySelector('nav');
  if (nav) links.forEach((link) => nav.append(link));
  if (!headings.length || !('IntersectionObserver' in window)) return;
  articleTocObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    toc.querySelectorAll('a').forEach((link) => {
      const active = link.hash === `#${visible.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }, { rootMargin: '-110px 0px -68% 0px', threshold: [0, 1] });
  headings.forEach((heading) => articleTocObserver.observe(heading));
}
async function renderPostPage(identifier, cached = null) {
  const data = cached || await (await fetch('/api/posts/' + encodeURIComponent(identifier))).json();
  const previousPostId = articleData?.post?.id;
  articleData = data;
  document.body.dataset.page = 'article';
  const draft = $('#article-page .comment-form textarea')?.value || '';
  if (previousPostId && previousPostId !== data.post?.id) commentPage = 1;
  $('#hero').classList.add('hidden'); $('#home-posts-heading').classList.add('hidden'); $('#home-carousel').classList.add('hidden'); $('#announcements-page-view').classList.add('hidden'); $('#toolbar').classList.add('hidden'); $('#posts-view').classList.add('hidden'); $('#archive-view').classList.add('hidden'); $('#minecraft-view').classList.add('hidden'); $('#mirrors-view').classList.add('hidden'); $('#thoughts-view').classList.add('hidden'); $('#support-view').classList.add('hidden'); $('#friends-view').classList.add('hidden'); $('#about-view').classList.add('hidden');
  let page = $('#article-page'); if (!page) { page = document.createElement('article'); page.id = 'article-page'; page.className = 'article-page container'; document.querySelector('main').append(page); }
  if (!data.post) { page.innerHTML = `<section class="empty-state">${text('文章不存在。','Story not found.')}</section>`; return; }
  const post = data.post;
  document.title = `${post.title} · ${text(site.profile.name, site.profile.name_en) || 'StarIsle'}`;
  const coverUrl = safePostCoverUrl(post.cover_url);
  page.innerHTML = `<a class="back-link" href="/">${BlogIcons.svg('left')}<span>${text('返回首页','Back home')}</span></a><span class="eyebrow">${post.pinned ? `<span class="pin-label">${text('置顶','Pinned')}</span> · ` : ''}${formatDate(post.published_at || post.updated_at)} · ${escapeHtml(post.author || '')}</span><h1>${escapeHtml(post.title)}</h1>${coverUrl ? `<figure class="article-cover"><img src="${escapeHtml(coverUrl)}" alt="${escapeHtml(post.title)}" loading="eager" decoding="async"></figure>` : ''}<div class="article-actions"><span class="post-stats">${post.views || 0} ${text('阅读','views')} · ${post.likes || 0} ${text('赞','likes')}</span><button class="tonal-button ${post.liked ? 'liked' : ''}" id="article-like" data-no-icon>${BlogIcons.svg('heart')}<span>${post.liked ? text('取消点赞','Unlike') : text('点赞','Like')}</span></button><button class="tonal-button article-favorite ${post.favorited ? 'favorited' : ''}" type="button" data-favorite-post="${escapeHtml(post.id)}" aria-pressed="${String(Boolean(post.favorited))}" data-no-icon>${BlogIcons.svg('bookmark')}<span>${post.favorited ? text('已收藏','Saved') : text('收藏','Save')}</span></button><button class="tonal-button" id="article-share" data-no-icon>${BlogIcons.svg('share')}<span>${text('分享','Share')}</span></button></div><p class="share-status" id="share-status" aria-live="polite"></p><div class="tag-row">${(post.tags || []).map((tag) => `<span class="tag">#${escapeHtml(tag)}</span>`).join('')}</div><div class="reader-content article-content">${post.content || ''}</div><section class="comments"><div class="comments-heading"><h2>${text('评论','Comments')}</h2><span class="count-pill" id="comment-count">${(data.comments || []).length}</span></div><form class="comment-form"><textarea rows="2" maxlength="2000" placeholder="${text('登录后留下你的想法','Log in to leave a thought')}"></textarea><div class="comment-image-previews" data-comment-image-previews></div><div class="comment-compose-actions"><label class="comment-image-picker">${BlogIcons.svg('upload')}<span>${text('添加图片 · 可点击或拖入','Add images · click or drop')}</span><input class="hidden" type="file" accept="image/jpeg,image/png,image/gif,image/webp" data-comment-image-input multiple><input type="hidden" data-comment-image-urls></label><span class="comment-image-status" data-comment-image-status role="status"></span><button class="filled-button" type="submit" data-no-icon>${text('发表评论','Comment')}</button></div></form><div class="comment-list" id="comment-thread">${commentsMarkup(data)}</div><nav class="pagination comment-pagination" id="comment-pagination" aria-label="${text('评论分页','Comment pages')}"></nav></section>`;
  const legacyBack = page.querySelector(':scope > .back-link');
  const legacyEyebrow = page.querySelector(':scope > .eyebrow');
  const legacyTitle = page.querySelector(':scope > h1');
  const legacyCover = page.querySelector(':scope > .article-cover');
  const hero = document.createElement('header');
  hero.className = `article-hero${coverUrl ? ' has-cover' : ''}`;
  if (legacyCover) {
    const backdrop = document.createElement('div');
    backdrop.className = 'article-cover-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    backdrop.append(legacyCover.querySelector('img'));
    hero.append(backdrop);
    legacyCover.remove();
  }
  const heroNav = document.createElement('div');
  heroNav.className = 'article-hero-nav';
  heroNav.append(legacyBack);
  const titleBlock = document.createElement('div');
  titleBlock.className = 'article-title-block';
  const titleMeta = document.createElement('div');
  titleMeta.className = 'article-title-meta';
  titleMeta.append(legacyEyebrow);
  const categoryTag = document.createElement('span');
  categoryTag.className = 'article-category-chip';
  categoryTag.textContent = post.category || text('未分类','Uncategorized');
  const readingStats = document.createElement('div');
  readingStats.className = 'article-reading-stats';
  const stats = postWordStats(post);
  readingStats.innerHTML = `<span>${stats.label} ${text('字','words')}</span><span>${text('预计阅读','Reading time')} ${stats.minutes} ${text('分钟','min')}</span>`;
  titleBlock.append(titleMeta, categoryTag, legacyTitle);
  const detailedSummary = postSummary(post, 360);
  if (detailedSummary) {
    const summary = document.createElement('p');
    summary.className = 'article-summary';
    summary.textContent = detailedSummary;
    titleBlock.append(summary);
  }
  titleBlock.append(readingStats);
  hero.append(heroNav);
  const articleMain = document.createElement('div');
  articleMain.className = 'article-main';
  while (page.firstChild) articleMain.append(page.firstChild);
  const toc = document.createElement('aside');
  toc.className = 'article-toc surface';
  const contentLayout = document.createElement('div');
  contentLayout.className = 'article-content-layout';
  contentLayout.append(articleMain, toc);
  const readingSurface = document.createElement('div');
  readingSurface.className = 'article-reading-surface';
  readingSurface.append(titleBlock, contentLayout);
  page.append(hero, readingSurface);
  setupArticleToc(articleMain, toc);
  page.querySelector('.comment-form textarea').value = draft;
  if (pendingCommentImageUrls.length) {
    const topForm = page.querySelector('.comment-form');
    writeCommentImageUrls(topForm, pendingCommentImageUrls);
  }
  BlogIcons.iconize(page);
  bindFavoriteButtons(page);
  renderCommentThread(data, post);
  bindCommentImageUploads(page);
  bindCommentActions(data, post);
  $('#article-share').onclick = async () => { try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(location.href); else throw new Error(); $('#share-status').textContent = text('链接已复制','Link copied'); } catch { const field=document.createElement('textarea'); field.value=location.href; field.style.position='fixed'; field.style.opacity='0'; document.body.append(field); field.select(); const copied=document.execCommand('copy'); field.remove(); $('#share-status').textContent=copied?text('链接已复制','Link copied'):text('复制失败','Copy failed'); } };
  $('#article-like').onclick = async () => {
    if (!currentUser) return openAccount('login');
    const button = $('#article-like');
    button.disabled = true;
    const response = await fetch(`/api/posts/${encodeURIComponent(post.id)}/like`, { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
    if (response.status === 401) { button.disabled = false; return openAccount('login'); }
    if (response.ok) {
      const result = await response.json();
      post.likes = result.likes ?? post.likes;
      post.liked = Boolean(result.liked);
      button.classList.toggle('liked', post.liked);
      button.querySelector('span').textContent = post.liked ? text('取消点赞','Unlike') : text('点赞','Like');
      $('.post-stats').textContent = `${post.views || 0} ${text('阅读','views')} · ${post.likes || 0} ${text('赞','likes')}`;
    }
    button.disabled = false;
  };
  page.querySelector('.comment-form').onsubmit = async (event) => {
    event.preventDefault();
    if (!currentUser) return openAccount('login');
    const form = event.target;
    const textarea = form.querySelector('textarea');
    const imageUrls = commentImageUrls(form);
    textarea.setCustomValidity('');
    const response = await fetch('/api/comment', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({post_id:post.id,content:textarea.value,image_urls:imageUrls}) });
    const result = await response.json();
    if (response.status === 401) return openAccount('login');
    if (!response.ok) { textarea.setCustomValidity(localizedError(result.error)); textarea.reportValidity(); return; }
    notifyPendingComment(result);
    textarea.value = '';
    pendingCommentImageUrls = [];
    clearCommentImagePicker(form);
    data.comments = [...(data.comments || []), result.comment];
    commentPage = Math.max(1, Math.ceil(commentRoots(data).length / COMMENTS_PER_PAGE));
    renderCommentThread(data, post, { preserveScroll: true });
  };
}
async function loadArchive() {
  const data = await (await fetch('/api/archive')).json();
  const stats = data.stats || {};
  $('#archive-total').textContent = String(Number(stats.total || 0));
  $('#archive-latest-update').textContent = formatDate(stats.latest_updated_at || stats.latest_published_at) || '—';
  const groups = Array.isArray(data.archive) ? data.archive : [];
  $('#archive-list').innerHTML = groups.map((group) => `<section class="archive-group"><h3>${/^\d{4}$/.test(group.year) && Number(group.month) >= 1 && Number(group.month) <= 12 ? new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'zh-CN', {year:'numeric',month:'long'}).format(new Date(Number(group.year), Number(group.month)-1, 1)) : text('日期未知','Unknown date')}</h3>${group.posts.map((post) => `<button class="archive-post" data-id="${post.id}">${escapeHtml(post.title)} <small>${formatDate(post.published_at)}</small></button>`).join('')}</section>`).join('') || `<div class="empty-state">${text('暂无归档。','No archive yet.')}</div>`;
  document.querySelectorAll('.archive-post').forEach((button) => button.onclick = () => openReader({ id: button.dataset.id }));
}

const accountDialog = $('#account-dialog');
const oauthBindDialog = $('#oauth-bind-dialog');
const profilePageContent = $('#profile-page-content');
profilePageContent.append($('#profile-form'), $('#oauth-account-settings'));
const profileFavoritesSection = document.createElement('section');
profileFavoritesSection.className = 'surface profile-favorites';
profileFavoritesSection.innerHTML = '<header class="profile-favorites-heading"><div><span class="eyebrow">SAVED STORIES</span><h2>我的收藏</h2><p>收藏的文章只会在你的个人资料页中显示。</p></div><span class="count-pill" id="profile-favorites-count">0</span></header><div class="profile-favorites-list" id="profile-favorites-list"><div class="empty-state">正在读取收藏…</div></div>';
profilePageContent.append(profileFavoritesSection);
let emailCodeTimer = null;
let resetEmailCodeTimer = null;
function restoreViewportAfterDialog(dialog) {
  const scrollTop = dialogScrollPositions.get(dialog);
  if (!Number.isFinite(scrollTop)) return;
  const restore = () => window.scrollTo({ top: scrollTop, left: 0, behavior: 'instant' });
  requestAnimationFrame(restore);
  setTimeout(restore, 60);
}
function showDialogPreservingScroll(dialog) {
  if (!dialog.open) {
    dialogScrollPositions.set(dialog, window.scrollY);
    dialog.showModal();
  }
  restoreViewportAfterDialog(dialog);
}
function closeDialogPreservingScroll(dialog) {
  if (dialog.open) dialog.close();
  restoreViewportAfterDialog(dialog);
}
function showSiteDialog({
  title = text('提示', 'Notice'),
  message = '',
  confirmText = text('确定', 'Confirm'),
  cancelText = text('取消', 'Cancel'),
  prompt = false,
  placeholder = '',
  danger = false,
  showCancel = true,
} = {}) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'reader-dialog app-action-dialog';
    dialog.innerHTML = `<div class="app-dialog-icon ${danger ? 'danger' : ''}"><mdui-icon name="${danger ? 'warning' : 'info'}"></mdui-icon></div><h2>${escapeHtml(title)}</h2><p class="app-dialog-message">${escapeHtml(message)}</p>${prompt ? `<label class="app-dialog-field"><span>${escapeHtml(placeholder || text('请输入内容', 'Enter a value'))}</span><input type="text" autocomplete="off"></label>` : ''}<div class="app-dialog-actions">${showCancel ? `<button class="text-button" type="button" data-dialog-cancel data-no-icon><mdui-icon name="close"></mdui-icon><span>${escapeHtml(cancelText)}</span></button>` : ''}<button class="filled-button ${danger ? 'danger-button' : ''}" type="button" data-dialog-confirm data-no-icon><mdui-icon name="${danger ? 'delete' : 'check'}"></mdui-icon><span>${escapeHtml(confirmText)}</span></button></div>`;
    document.body.append(dialog);
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
      dialog.close();
      dialog.remove();
    };
    dialog.querySelector('[data-dialog-confirm]').onclick = () => finish(prompt ? dialog.querySelector('input').value : true);
    dialog.querySelector('[data-dialog-cancel]')?.addEventListener('click', () => finish(prompt ? null : false));
    dialog.addEventListener('cancel', (event) => { event.preventDefault(); finish(prompt ? null : false); });
    dialog.addEventListener('close', () => { if (!settled) { settled = true; resolve(null); dialog.remove(); } });
    dialog.showModal();
    setTimeout(() => (prompt ? dialog.querySelector('input') : dialog.querySelector('[data-dialog-confirm]'))?.focus(), 0);
  });
}
function oauthBindIntro(provider) {
  const name = provider === 'qq' ? 'QQ' : 'GitHub';
  return text(`首次使用 ${name} 登录，需要验证邮箱。邮箱已注册时会绑定到原账号，否则会创建新的邮箱账号。`, `First-time ${name} sign-in requires email verification. A registered email is linked to the existing account; otherwise a new email account is created.`);
}
function openOAuthBindPage() {
  const params = new URLSearchParams(location.search);
  const token = params.get('token') || '';
  oauthBindProvider = params.get('provider') || '';
  if (!token || !['github', 'qq'].includes(oauthBindProvider)) {
    location.replace('/?oauth_error=binding_expired');
    return;
  }
  $('#oauth-bind-token').value = token;
  $('#oauth-bind-status').textContent = '';
  $('#oauth-bind-intro').textContent = oauthBindIntro(oauthBindProvider);
  showDialogPreservingScroll(oauthBindDialog);
  setTimeout(() => ensureOAuthTurnstile(), 150);
}
function startOAuthCodeCooldown(seconds = 60) {
  const button = $('#send-oauth-code');
  if (oauthCodeTimer) clearInterval(oauthCodeTimer);
  let remaining = Math.max(1, Number(seconds) || 60);
  button.disabled = true;
  const update = () => {
    button.textContent = `${text('重新发送', 'Resend')} (${remaining}s)`;
    if (remaining <= 0) {
      clearInterval(oauthCodeTimer);
      oauthCodeTimer = null;
      button.disabled = false;
      button.textContent = text('获取验证码', 'Get code');
      return;
    }
    remaining -= 1;
  };
  update();
  oauthCodeTimer = setInterval(update, 1000);
}
function ensureTurnstile(reset = false, attempt = 0) {
  const host = $('#turnstile-widget');
  if (!host || !turnstileSiteKey) return;
  if (!window.turnstile) { if (attempt < 30) setTimeout(() => ensureTurnstile(reset, attempt + 1), 100); return; }
  if (turnstileWidgetId !== null) { if (reset) window.turnstile.reset(turnstileWidgetId); return; }
  turnstileWidgetId = window.turnstile.render(host, {
    sitekey: turnstileSiteKey,
    action: 'register',
    language: language === 'en' ? 'en' : 'zh-cn',
    theme: document.documentElement.dataset.theme || 'auto',
    callback: () => { $('#account-error').textContent = ''; },
    'expired-callback': () => { $('#account-error').textContent = text('验证已过期，请重新验证。', 'Verification expired. Please try again.'); },
    'error-callback': () => { $('#account-error').textContent = text('验证暂不可用，请稍后重试。', 'Verification is unavailable. Please try again.'); }
  });
}
function ensureResetTurnstile(reset = false, attempt = 0) {
  const host = $('#reset-turnstile-widget');
  if (!host || !turnstileSiteKey) return;
  if (!window.turnstile) { if (attempt < 30) setTimeout(() => ensureResetTurnstile(reset, attempt + 1), 100); return; }
  if (resetTurnstileWidgetId !== null) { if (reset) window.turnstile.reset(resetTurnstileWidgetId); return; }
  resetTurnstileWidgetId = window.turnstile.render(host, {
    sitekey: turnstileSiteKey,
    action: 'password_reset',
    language: language === 'en' ? 'en' : 'zh-cn',
    theme: document.documentElement.dataset.theme || 'auto',
    callback: () => { $('#account-error').textContent = ''; },
    'expired-callback': () => { $('#account-error').textContent = text('验证已过期，请重新验证。', 'Verification expired. Please try again.'); },
    'error-callback': () => { $('#account-error').textContent = text('验证暂不可用，请稍后重试。', 'Verification is unavailable. Please try again.'); }
  });
}
function ensureOAuthTurnstile(reset = false, attempt = 0) {
  const host = $('#oauth-bind-turnstile-widget');
  if (!host || !turnstileSiteKey) return;
  if (!window.turnstile) { if (attempt < 30) setTimeout(() => ensureOAuthTurnstile(reset, attempt + 1), 100); return; }
  if (oauthTurnstileWidgetId !== null) { if (reset) window.turnstile.reset(oauthTurnstileWidgetId); return; }
  oauthTurnstileWidgetId = window.turnstile.render(host, {
    sitekey: turnstileSiteKey,
    action: 'oauth_bind',
    language: language === 'en' ? 'en' : 'zh-cn',
    theme: document.documentElement.dataset.theme || 'auto',
    callback: () => { $('#oauth-bind-status').textContent = ''; },
    'expired-callback': () => { $('#oauth-bind-status').textContent = text('验证已过期，请重新验证。', 'Verification expired. Please try again.'); },
    'error-callback': () => { $('#oauth-bind-status').textContent = text('验证暂不可用，请稍后重试。', 'Verification is unavailable. Please try again.'); },
  });
}
$('#home-carousel-track').addEventListener('pointerdown', (event) => {
  if (!['touch', 'pen'].includes(event.pointerType) || !event.target.closest('.carousel-link')) return;
  carouselTouchHeld = true;
  stopCarousel();
});
function releaseCarouselTouch(event) {
  if (!['touch', 'pen'].includes(event.pointerType) || !carouselTouchHeld) return;
  carouselTouchHeld = false;
  if (!carouselPointerPaused && !carouselFocusPaused) startCarousel();
}
window.addEventListener('pointerup', releaseCarouselTouch, { passive: true });
window.addEventListener('pointercancel', releaseCarouselTouch, { passive: true });
function openAccount(mode = 'login') {
  const wasOpen = accountDialog.open;
  const previousMode = accountDialog.dataset.accountMode || '';
  showDialogPreservingScroll(accountDialog);
  $('#account-forms').classList.remove('hidden');
  $('#public-profile-panel').classList.add('hidden');
  document.querySelectorAll('.account-tab').forEach((tab) => { const selected = mode !== 'reset' && tab.dataset.mode === mode; tab.classList.toggle('active', selected); tab.setAttribute('aria-pressed', String(selected)); });
  $('#user-login-form').classList.toggle('hidden', mode !== 'login');
  $('#user-register-form').classList.toggle('hidden', mode !== 'register');
  $('#user-reset-form').classList.toggle('hidden', mode !== 'reset');
  $('#login-agreement-row').classList.toggle('hidden', mode !== 'login');
  $('#register-agreement-row').classList.toggle('hidden', mode !== 'register');
  $('#oauth-login-panel').classList.toggle('hidden', mode !== 'login');
  $('#account-error').textContent = '';
  renderOAuthProviderButtons();
  updateAccountTitle();
  const switched = wasOpen && previousMode !== mode && ['login', 'register'].includes(previousMode) && ['login', 'register'].includes(mode);
  if (switched && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const panel = mode === 'login' ? $('#user-login-form') : $('#user-register-form');
    panel.animate([
      { opacity: 0, transform: 'translateX(12px)' },
      { opacity: 1, transform: 'translateX(0)' },
    ], { duration: 240, easing: 'cubic-bezier(.2,0,0,1)' });
  }
  accountDialog.dataset.accountMode = mode;
  if (mode === 'register') setTimeout(() => ensureTurnstile(turnstileWidgetId !== null), 200);
  if (mode === 'reset') setTimeout(() => ensureResetTurnstile(resetTurnstileWidgetId !== null), 200);
}
function startEmailCodeCooldown(seconds = 60, notice = '') {
  const button = $('#send-email-code'); const status = $('#email-code-status');
  if (emailCodeTimer) clearInterval(emailCodeTimer);
  let remaining = seconds; button.disabled = true;
  const update = () => { const label = `${text('重新发送','Resend')} (${remaining}s)`; button.title = label; button.setAttribute('aria-label', label); button.innerHTML = BlogIcons.svg('send'); status.textContent = notice ? localizedError(notice, text('发送过于频繁，请稍后重试。','Too many requests. Please wait before retrying.')) : text('验证码已发送，请查看收件箱或垃圾邮件。','Code sent. Check your inbox or spam folder.'); if (remaining <= 0) { clearInterval(emailCodeTimer); emailCodeTimer = null; refreshEmailCodeLabel = null; button.disabled = false; const ready = text('获取验证码','Get code'); button.title = ready; button.setAttribute('aria-label', ready); status.textContent = ''; return; } };
  refreshEmailCodeLabel = update; update(); emailCodeTimer = setInterval(() => { remaining -= 1; update(); }, 1000);
}
$('#send-email-code').onclick = async () => {
  const email = $('#register-email').value.trim(); const status = $('#email-code-status');
  $('#account-error').textContent = '';
  if (!$('#register-agreement').checked) return $('#account-error').textContent = text('请先阅读并勾选同意服务条款与条件、隐私政策、Cookie 政策和免责声明。','Please read and accept the Terms & Conditions, Privacy Policy, Cookie Policy, and Disclaimer first.');
  if (!$('#register-email').reportValidity()) return;
  if (!window.turnstile || turnstileWidgetId === null) { ensureTurnstile(); return $('#account-error').textContent = text('人机验证正在加载，请稍后重试。','Security check is loading. Please try again.'); }
  const token = window.turnstile.getResponse(turnstileWidgetId);
  if (!token) return $('#account-error').textContent = text('请先完成人机验证，再获取邮箱验证码。','Complete the security check before requesting a code.');
  const button = $('#send-email-code'); button.disabled = true; button.title = text('发送中…','Sending…'); button.setAttribute('aria-label', button.title); status.textContent = '';
  try {
    const response = await fetch('/api/auth/send-code', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email, 'cf-turnstile-response': token }) });
    const data = await response.json();
    if (!response.ok) { $('#account-error').textContent = localizedError(data.error, text('验证码发送失败。','Could not send the code.')); button.disabled = false; button.title = text('获取验证码','Get code'); button.setAttribute('aria-label', button.title); if (response.status === 429) startEmailCodeCooldown(Number(response.headers.get('Retry-After')) || 60, text('发送过于频繁，请稍后重试。','Too many requests. Please wait before retrying.')); }
    else startEmailCodeCooldown();
  } catch (_) { $('#account-error').textContent = text('网络异常，验证码发送失败。','Network error. Could not send the code.'); button.disabled = false; button.title = text('获取验证码','Get code'); button.setAttribute('aria-label', button.title); }
  finally { ensureTurnstile(true); }
};
function startResetEmailCodeCooldown(seconds = 60, notice = '') {
  const button = $('#send-reset-code');
  const status = $('#email-code-status');
  if (resetEmailCodeTimer) clearInterval(resetEmailCodeTimer);
  let remaining = seconds;
  button.disabled = true;
  const update = () => {
    const label = `${text('重新发送','Resend')} (${remaining}s)`;
    button.title = label;
    button.setAttribute('aria-label', label);
    button.innerHTML = BlogIcons.svg('send');
    status.textContent = notice ? localizedError(notice) : text('验证码已发送，请查看收件箱或垃圾邮件。','Code sent. Check your inbox or spam folder.');
    if (remaining <= 0) {
      clearInterval(resetEmailCodeTimer);
      resetEmailCodeTimer = null;
      refreshResetEmailCodeLabel = null;
      button.disabled = false;
      const ready = text('获取验证码','Get code');
      button.title = ready;
      button.setAttribute('aria-label', ready);
      status.textContent = '';
      return;
    }
  };
  refreshResetEmailCodeLabel = update;
  update();
  resetEmailCodeTimer = setInterval(() => { remaining -= 1; update(); }, 1000);
}
$('#forgot-password').onclick = () => openAccount('reset');
$('#reset-back-login').onclick = () => openAccount('login');
$('#send-reset-code').onclick = async () => {
  const email = $('#reset-email').value.trim();
  const status = $('#email-code-status');
  $('#account-error').textContent = '';
  if (!$('#reset-email').reportValidity()) return;
  if (!window.turnstile || resetTurnstileWidgetId === null) {
    ensureResetTurnstile();
    return $('#account-error').textContent = text('人机验证正在加载，请稍后重试。','Security check is loading. Please try again.');
  }
  const token = window.turnstile.getResponse(resetTurnstileWidgetId);
  if (!token) return $('#account-error').textContent = text('请先完成人机验证，再获取邮箱验证码。','Complete the security check before requesting a code.');
  const button = $('#send-reset-code');
  button.disabled = true;
  status.textContent = '';
  try {
    const response = await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, purpose: 'password_reset', 'cf-turnstile-response': token }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('验证码发送失败。','Could not send the code.')));
    startResetEmailCodeCooldown();
  } catch (error) {
    $('#account-error').textContent = error.message || text('验证码发送失败。','Could not send the code.');
    button.disabled = false;
  } finally {
    ensureResetTurnstile(true);
  }
};
$('#user-reset-form').onsubmit = async (event) => {
  event.preventDefault();
  const form = event.target;
  const button = form.querySelector('[type="submit"]');
  const email = $('#reset-email').value.trim();
  const password = form.querySelector('[name="password"]').value;
  const confirmPassword = form.querySelector('[name="confirm_password"]').value;
  const emailCode = form.querySelector('[name="email_code"]').value.trim();
  $('#account-error').textContent = '';
  if (password !== confirmPassword) {
    return $('#account-error').textContent = text('两次输入的密码不一致。','The two passwords do not match.');
  }
  if (!window.turnstile || resetTurnstileWidgetId === null) {
    ensureResetTurnstile();
    return $('#account-error').textContent = text('人机验证正在加载，请稍后重试。','Security check is loading. Please try again.');
  }
  const token = window.turnstile.getResponse(resetTurnstileWidgetId);
  if (!token) return $('#account-error').textContent = text('请先完成人机验证。','Please complete the security check.');
  button.disabled = true;
  try {
    const response = await fetch('/api/user/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, email_code: emailCode, password, confirm_password: confirmPassword, 'cf-turnstile-response': token }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('密码重置失败。','Could not reset the password.')));
    form.reset();
    openAccount('login');
    $('#user-login-form input[name="identity"]').value = email;
    $('#email-code-status').textContent = localizedError(data.message, text('密码已重置，请使用新密码登录。','Password reset. Log in with your new password.'));
  } catch (error) {
    $('#account-error').textContent = error.message || text('密码重置失败。','Could not reset the password.');
  } finally {
    button.disabled = false;
    ensureResetTurnstile(true);
  }
};
function setProfileMenuOpen(open) {
  const menu = $('#profile-popover');
  const button = $('#profile-open');
  const shouldOpen = Boolean(open && currentUser);
  menu.classList.toggle('hidden', !shouldOpen);
  button.setAttribute('aria-expanded', String(shouldOpen));
}
function renderProfileMenu(user) {
  const name = user?.username || text('用户','User');
  $('#profile-menu-name').textContent = name;
  $('#profile-menu-email').textContent = user?.email || '';
  if (!user) setProfileMenuOpen(false);
}
function showUser(user) {
  currentUser = user;
  $('#account-open').classList.toggle('hidden', Boolean(user));
  $('#profile-open').classList.toggle('hidden', !user);
  const profileButton = $('#profile-open');
  profileButton.title = text('个人资料','Your profile');
  profileButton.setAttribute('aria-label', user?.username ? text(`${user.username}的个人资料`, `${user.username}'s profile`) : profileButton.title);
  renderProfileMenu(user);
  if (user) {
    renderUserAvatar($('#profile-avatar-image'), $('#profile-avatar-fallback'), user);
    renderUserAvatar($('#profile-open-image'), $('#profile-open-fallback'), user);
  }
  if (user) renderOAuthAccountSettings(user);
  const favoriteIds = new Set(user?.favorites || []);
  document.querySelectorAll('[data-favorite-post]').forEach((button) => updateFavoriteButton(button, favoriteIds.has(button.dataset.favoritePost)));
  if (thoughtsLoaded) loadThoughts(true);
}
function setProfileModerationStatus(user) {
  const node = $('#profile-moderation-status');
  const muted = Boolean(user?.muted);
  node.classList.toggle('hidden', !muted);
  if (!muted) {
    node.textContent = '';
    return;
  }
  const until = user.muted_until ? formatDate(user.muted_until) : text('管理员解除禁言时', 'an administrator lifts the mute');
  node.textContent = text(`账号当前处于禁言状态，暂时不能发表评论。预计结束：${until}。`, `Your account is muted and cannot post comments. Expected to end: ${until}.`);
}
function fillProfile(user) {
  if (!user) return;
  Object.entries(user).forEach(([key, value]) => {
    const input = $(`#profile-form [name="${key}"]`);
    if (input) input.value = value || '';
  });
  renderUserAvatar($('#profile-avatar-image'), $('#profile-avatar-fallback'), user);
  setProfileModerationStatus(user);
  renderOAuthAccountSettings(user);
}
function renderProfileFavorites(posts = []) {
  const list = $('#profile-favorites-list');
  const count = $('#profile-favorites-count');
  if (!list) return;
  if (count) count.textContent = String(posts.length);
  list.innerHTML = posts.length ? posts.map((post) => {
    const coverUrl = safePostCoverUrl(post.cover_url);
    return `<article class="profile-favorite-card">${coverUrl ? `<a class="profile-favorite-cover" href="/post/${encodeURIComponent(post.slug || post.id)}"><img src="${escapeHtml(coverUrl)}" alt="" loading="lazy"></a>` : ''}<div class="profile-favorite-copy"><span class="post-category-chip">${escapeHtml(post.category || text('未分类','Uncategorized'))}</span><h3><a href="/post/${encodeURIComponent(post.slug || post.id)}">${escapeHtml(post.title)}</a></h3><small>${formatDate(post.published_at || post.updated_at)}</small></div><div class="profile-favorite-actions"><button class="tonal-button favorited" type="button" data-favorite-post="${escapeHtml(post.id)}" aria-pressed="true" data-no-icon>${BlogIcons.svg('bookmark')}<span>${text('已收藏','Saved')}</span></button><a class="text-button" href="/post/${encodeURIComponent(post.slug || post.id)}" data-no-icon>${BlogIcons.svg('right')}<span>${text('阅读','Read')}</span></a></div></article>`;
  }).join('') : `<div class="empty-state">${text('还没有收藏文章。浏览文章时点击“收藏”即可加入这里。','No saved stories yet. Use “Save” on any story to add it here.')}</div>`;
  bindFavoriteButtons(list);
  BlogIcons.iconize(list);
}
async function loadProfileFavorites() {
  if (!currentUser) return renderProfileFavorites([]);
  const list = $('#profile-favorites-list');
  if (list) list.innerHTML = '<div class="empty-state">正在读取收藏…</div>';
  try {
    const response = await fetch('/api/me/favorites', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('收藏读取失败。', 'Could not load your saved stories.')));
    renderProfileFavorites(data.posts || []);
  } catch (error) {
    if (list) list.innerHTML = `<div class="empty-state">${escapeHtml(error.message)}</div>`;
  }
}
function renderProfilePage() {
  if (!currentUser) return false;
  $('#profile-form').classList.remove('hidden');
  $('#oauth-account-settings').classList.remove('hidden');
  $('#profile-error').textContent = '';
  $('#profile-error').classList.remove('success');
  $('#avatar-upload-status').textContent = '';
  fillProfile(currentUser);
  loadProfileFavorites();
  return true;
}
function renderPolicyPage(route) {
  const documentCopy = policyDocuments[route];
  if (!documentCopy) {
    $('#policy-page-content').innerHTML = `<div class="empty-state">${text('条款内容暂时无法载入，请稍后重试。','The policy content is temporarily unavailable. Please try again later.')}</div>`;
    return;
  }
  const english = language === 'en';
  $('#policy-page-title').textContent = english ? documentCopy.titleEn : documentCopy.titleZh;
  const formatPolicyTime = (value) => {
    if (!value) return '—';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(english ? 'en-US' : 'zh-CN', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    }).format(parsed);
  };
  $('#policy-effective-date').textContent = formatPolicyTime(documentCopy.effective_at);
  $('#policy-updated-date').textContent = formatPolicyTime(documentCopy.updated_at);
  $('#policy-page-content').innerHTML = documentCopy.sections.map((section, index) => {
    const heading = english ? section[1] : section[0];
    const paragraphs = section.length >= 4
      ? (english ? section[3] : section[2])
      : [section[2][english ? 1 : 0]];
    return `<section class="policy-section"><span class="policy-index">${String(index + 1).padStart(2, '0')}</span><h2>${escapeHtml(heading)}</h2>${(paragraphs || []).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join('')}</section>`;
  }).join('');
  document.title = `${english ? documentCopy.titleEn : documentCopy.titleZh} · ${text(site.profile?.name, site.profile?.name_en) || 'StarIsle'}`;
}
function renderAnnouncementPage() {
  const list = $('#announcement-page-list');
  if (!list) return;
  list.innerHTML = announcementsCatalog.map((announcement) => {
    const sourceLabel = announcement.source === 'legal' ? text('条款更新','Policy update') : text('网站通知','Site notice');
    return `<article class="announcement-card ${announcement.source === 'legal' ? 'legal-update' : ''}"><header><span class="announcement-type">${sourceLabel}</span><time>${formatDate(announcement.published_at || announcement.created_at)}</time></header><h3>${escapeHtml(text(announcement.title_zh, announcement.title_en))}</h3><p>${escapeHtml(text(announcement.body_zh, announcement.body_en))}</p></article>`;
  }).join('') || `<div class="empty-state">${text('暂时没有网站公告。','No site announcements yet.')}</div>`;
}
function renderAnnouncements() {
  if (document.body.dataset.page === 'announcements') renderAnnouncementPage();
}
async function renderFooterFriends() {
  if (footerFriendsLoaded) return;
  footerFriendsLoaded = true;
  try {
    const response = await fetch('/api/friends');
    if (!response.ok) return;
    const data = await response.json();
    const friends = (data.friends || []).filter((friend) => safeHttpUrl(friend.url)).slice(0, 4);
    if (!friends.length) return;
    $('#footer-friend-links').innerHTML = friends.map((friend) => `<a href="${escapeHtml(safeHttpUrl(friend.url))}" target="_blank" rel="noopener">${escapeHtml(friend.name || friend.url)}</a>`).join('') + `<a href="/friends" data-zh="更多友链" data-en="More friends">${text('更多友链','More friends')}</a>`;
  } catch (_) {
  }
}
async function logoutCurrentUser() {
  await fetch('/api/logout', { method:'POST', headers:{'Content-Type':'application/json'}, body:'{}' });
  showUser(null);
  closeDialogPreservingScroll(accountDialog);
  if (location.pathname === '/profile') {
    location.replace('/');
    return;
  }
  if (articleData) await renderPostPage(decodeURIComponent(location.pathname.split('/').pop()));
}
async function refreshArticleAfterUserChange() {
  if (!articleData) return;
  const identifier = decodeURIComponent(location.pathname.split('/').pop());
  await renderPostPage(identifier, articleData);
}
async function openPublicProfile(identifier) {
  if (!identifier) return;
  activePublicUserId = identifier;
  activePublicUser = null;
  activePublicProfileStats = null;
  showDialogPreservingScroll(accountDialog);
  $('#account-forms').classList.add('hidden');
  $('#public-profile-panel').classList.remove('hidden');
  $('#public-profile-name').textContent = text('正在读取用户资料…', 'Loading user profile…');
  $('#public-profile-signature').textContent = '';
  $('#public-profile-status').innerHTML = '';
  $('#public-profile-joined').textContent = '—';
  $('#public-profile-comments').textContent = '0';
  $('#public-profile-error').textContent = '';
  $('#report-user-button').disabled = true;
  updateAccountTitle();
  try {
    const response = await fetch(`/api/users/${encodeURIComponent(identifier)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('用户资料读取失败。','Could not load this profile.')));
    activePublicUser = data.user;
    activePublicProfileStats = data.stats || {};
    renderPublicProfile();
  } catch (error) {
    $('#public-profile-name').textContent = text('无法读取用户资料', 'Profile unavailable');
    $('#public-profile-error').textContent = error.message || text('用户资料读取失败。','Could not load this profile.');
  }
}
function renderPublicProfile() {
  if (!activePublicUser) return;
  const user = activePublicUser;
  const stats = activePublicProfileStats || {};
  $('#public-profile-name').textContent = user.username || text('用户', 'User');
  $('#public-profile-signature').textContent = user.signature || text('这位用户还没有填写个性签名。', 'This user has not added a bio yet.');
  renderUserAvatar($('#public-profile-image'), $('#public-profile-fallback'), user);
  const status = [];
  if (user.banned) status.push(`<span class="status-chip danger">${text('账号已封禁', 'Account banned')}</span>`);
  if (user.muted) status.push(`<span class="status-chip warning">${text('账号禁言中', 'Account muted')}</span>`);
  if (!status.length) status.push(`<span class="status-chip">${text('账号状态正常', 'Account in good standing')}</span>`);
  $('#public-profile-status').innerHTML = status.join('');
  $('#public-profile-joined').textContent = formatDate(stats.joined_at || user.created_at) || '—';
  $('#public-profile-comments').textContent = String(Number(stats.comments || 0));
  const ownProfile = currentUser?.id === user.id;
  const reportButton = $('#report-user-button');
  reportButton.disabled = ownProfile;
  reportButton.title = ownProfile ? text('不能举报自己','You cannot report yourself') : text('举报用户','Report user');
  reportButton.setAttribute('aria-label', reportButton.title);
  $('#public-profile-error').textContent = '';
  updateAccountTitle();
}
const reportDialog = $('#report-dialog');
const friendApplicationDialog = $('#friend-application-dialog');
[accountDialog, oauthBindDialog, reportDialog, friendApplicationDialog].forEach((dialog) => {
  dialog.addEventListener('close', () => restoreViewportAfterDialog(dialog));
});
function reportVisitorToken() {
  const key = 'blog-report-token';
  try {
    const saved = localStorage.getItem(key);
    if (/^[a-f0-9-]{20,64}$/i.test(saved || '')) return saved;
    const token = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    localStorage.setItem(key, token);
    return token;
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}
function openReportDialog(targetType, targetId) {
  $('#report-target-type').value = targetType;
  $('#report-target-id').value = targetId;
  $('#report-reason').value = '';
  $('#report-details').value = '';
  $('#report-status').textContent = '';
  $('#report-status').classList.remove('success');
  showDialogPreservingScroll(reportDialog);
  setTimeout(() => $('#report-reason').focus(), 0);
}
function openFriendApplication() {
  $('#friend-application-status').textContent = '';
  $('#friend-application-status').classList.remove('success');
  showDialogPreservingScroll(friendApplicationDialog);
  setTimeout(() => $('#friend-application-form input[name="name"]').focus(), 0);
}
function bindProfileActions() {
  $('#choose-avatar').onclick = () => $('#avatar-file').click();
  $('#avatar-file').onchange = async () => {
    const file = $('#avatar-file').files?.[0];
    if (!file) return;
    const status = $('#avatar-upload-status');
    status.classList.remove('error', 'success');
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      status.textContent = text('请选择 JPG、PNG、GIF 或 WebP 图片。', 'Choose a JPG, PNG, GIF, or WebP image.');
      status.classList.add('error');
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      status.textContent = text('头像文件不能超过 4 MB。', 'The profile picture must be 4 MB or smaller.');
      status.classList.add('error');
      return;
    }
    const form = new FormData();
    form.append('file', file, file.name);
    status.textContent = text('正在上传头像…', 'Uploading profile picture…');
    try {
      const response = await fetch('/api/me/avatar', { method: 'POST', body: form });
      const data = await response.json();
      if (response.status === 401) {
        openAccount('login');
        return;
      }
      if (!response.ok) throw new Error(localizedError(data.error, text('头像上传失败。','Could not upload the profile picture.')));
      showUser(data.user);
      fillProfile(data.user);
      status.textContent = text('头像已更新。', 'Profile picture updated.');
      status.classList.add('success');
      await refreshArticleAfterUserChange();
    } catch (error) {
      status.textContent = error.message || text('头像上传失败。','Could not upload the profile picture.');
      status.classList.add('error');
    } finally {
      $('#avatar-file').value = '';
    }
  };
}
let activeThemeTransition = null;
async function toggleThemeFromButton() {
  if (activeThemeTransition) return;
  const root = document.documentElement;
  const theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  const apply = () => { try { localStorage.setItem('blog-theme', theme); } catch (_) {} applyColorTheme(theme); };
  if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {apply();return;}
  const rect = $('#theme-toggle').getBoundingClientRect();
  const x = rect.left + rect.width / 2, y = rect.top + rect.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth-x), Math.max(y, innerHeight-y));
  root.classList.add('theme-circle-transition');
  try {
    activeThemeTransition = document.startViewTransition(apply);
    await activeThemeTransition.ready;
    await root.animate({clipPath:[`circle(0px at ${x}px ${y}px)`,`circle(${radius}px at ${x}px ${y}px)`]}, {duration:520,easing:'cubic-bezier(.2,0,0,1)',pseudoElement:'::view-transition-new(root)'}).finished;
    await activeThemeTransition.finished;
  } catch (_) {
    apply();
  } finally {
    root.classList.remove('theme-circle-transition');
    activeThemeTransition = null;
  }
}
$('#theme-toggle').onclick = toggleThemeFromButton;

$('#language-toggle').onclick = () => { language = language === 'en' ? 'zh' : 'en'; localStorage.setItem('blog-language', language); renderSite(); renderFilters(); renderPosts(); renderHomeCarousel(); renderAnnouncements(); if (activePublicUser) renderPublicProfile(); if (articleData) renderPostPage(decodeURIComponent(location.pathname.split('/').pop()), articleData); else showRoute(); if (turnstileWidgetId !== null && window.turnstile) { window.turnstile.remove(turnstileWidgetId); turnstileWidgetId = null; if (!$('#user-register-form').classList.contains('hidden')) ensureTurnstile(); } if (resetTurnstileWidgetId !== null && window.turnstile) { window.turnstile.remove(resetTurnstileWidgetId); resetTurnstileWidgetId = null; if (!$('#user-reset-form').classList.contains('hidden')) ensureResetTurnstile(); } };
const systemThemeMedia = matchMedia('(prefers-color-scheme: dark)');
function storedThemePreference() { try { const value = localStorage.getItem('blog-theme'); return value === 'dark' || value === 'light' ? value : ''; } catch (_) { return ''; } }
function applyColorTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = theme === 'dark' ? '#141218' : '#fffbfe';
  window.SolarThemes?.syncChrome();
  updateThemeFavicon();
  renderThemeIcon();
}
function applySystemTheme() { applyColorTheme(storedThemePreference() || (systemThemeMedia.matches ? 'dark' : 'light')); }
function syncSystemTheme() { if (!storedThemePreference()) applySystemTheme(); }
applySystemTheme(); if (systemThemeMedia.addEventListener) systemThemeMedia.addEventListener('change', syncSystemTheme); else systemThemeMedia.addListener(syncSystemTheme);
$('#account-open').onclick = () => openAccount('login');
$('#profile-open').onclick = (event) => {
  event.stopPropagation();
  setProfileMenuOpen($('#profile-popover').classList.contains('hidden'));
};
$('#profile-menu-logout').onclick = logoutCurrentUser;
document.addEventListener('click', (event) => {
  if (!event.target.closest('#profile-menu-shell')) setProfileMenuOpen(false);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') setProfileMenuOpen(false);
});
document.querySelectorAll('.account-tab').forEach((tab) => tab.onclick = () => openAccount(tab.dataset.mode));
$('#login-agreement').onchange = renderOAuthProviderButtons;
document.querySelectorAll('[data-oauth-login]').forEach((button) => button.onclick = () => startOAuth(button.dataset.oauthLogin, 'login'));
document.querySelectorAll('[data-oauth-account]').forEach((button) => {
  button.onclick = async () => {
    if (!currentUser) return openAccount('login');
    const provider = button.dataset.oauthAccount;
    if (button.dataset.connected !== 'true') return startOAuth(provider, 'bind');
    const confirmed = await showSiteDialog({
      title: text('解绑第三方账号', 'Unbind account'),
      message: text(`确定解绑 ${provider === 'github' ? 'GitHub' : 'QQ'} 吗？`, `Unbind ${provider === 'github' ? 'GitHub' : 'QQ'}?`),
      confirmText: text('解绑', 'Unbind'),
      danger: true,
    });
    if (!confirmed) return;
    button.disabled = true;
    try {
      const response = await fetch('/api/oauth/unbind', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ provider }) });
      const data = await response.json();
      if (!response.ok) throw new Error(localizedError(data.error, text('解绑失败。', 'Could not unbind this account.')));
      showUser(data.user);
      fillProfile(data.user);
      showOAuthNotice(text('已解除第三方账号绑定。', 'The third-party account was unbound.'));
    } catch (error) {
      showOAuthNotice(error.message || text('解绑失败。', 'Could not unbind this account.'), true);
    } finally {
      button.disabled = false;
    }
  };
});
$('[data-close]').onclick = () => closeDialogPreservingScroll(accountDialog);
$('#oauth-bind-cancel').onclick = () => { closeDialogPreservingScroll(oauthBindDialog); location.replace('/'); };
$('#send-oauth-code').onclick = async () => {
  const email = $('#oauth-bind-email').value.trim();
  const status = $('#oauth-bind-status');
  if (!$('#oauth-bind-email').reportValidity()) return;
  if (!window.turnstile || oauthTurnstileWidgetId === null) {
    ensureOAuthTurnstile();
    return status.textContent = text('人机验证正在加载，请稍后重试。', 'Security check is loading. Please try again.');
  }
  const turnstileToken = window.turnstile.getResponse(oauthTurnstileWidgetId);
  if (!turnstileToken) return status.textContent = text('请先完成人机验证，再获取邮箱验证码。', 'Complete the security check before requesting a code.');
  const button = $('#send-oauth-code');
  button.disabled = true;
  status.classList.remove('success');
  status.textContent = text('正在发送验证码…', 'Sending code…');
  try {
    const response = await fetch('/api/oauth/send-code', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, oauth_token: $('#oauth-bind-token').value, 'cf-turnstile-response': turnstileToken }) });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('验证码发送失败。', 'Could not send the code.')));
    status.classList.add('success');
    status.textContent = text('验证码已发送，请查收邮箱。', 'Code sent. Check your inbox.');
    startOAuthCodeCooldown(60);
    if (response.status === 429) startOAuthCodeCooldown(Number(response.headers.get('Retry-After')) || 60);
  } catch (error) {
    status.textContent = error.message || text('验证码发送失败。', 'Could not send the code.');
    button.disabled = false;
  } finally {
    ensureOAuthTurnstile(true);
  }
};
$('#oauth-bind-form').onsubmit = async (event) => {
  event.preventDefault();
  const status = $('#oauth-bind-status');
  const button = event.target.querySelector('[type="submit"]');
  status.classList.remove('success');
  status.textContent = '';
  button.disabled = true;
  try {
    const response = await fetch('/api/oauth/bind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        oauth_token: $('#oauth-bind-token').value,
        email: $('#oauth-bind-email').value.trim(),
        email_code: $('#oauth-bind-code').value.trim(),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('账号绑定失败。', 'Could not bind this account.')));
    location.replace(`/?oauth=${oauthBindProvider}_login`);
  } catch (error) {
    status.textContent = error.message || text('账号绑定失败。', 'Could not bind this account.');
    button.disabled = false;
  }
};
$('#cookie-accept').onclick = () => hideCookieConsent('accepted');
$('#cookie-essential').onclick = () => hideCookieConsent('essential');
initCookieConsent();
$('#user-login-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!validateLoginFields()) return;
  if (!$('#login-agreement').checked) {
    promptAuthAgreement();
    return;
  }
  const data = await (await fetch('/api/user/login', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) })).json();
  if (!data.user) return $('#account-error').textContent = localizedError(data.error);
  showUser(data.user);
  closeDialogPreservingScroll(accountDialog);
  if (articleData) await renderPostPage(decodeURIComponent(location.pathname.split('/').pop()));
};
$('#user-register-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!$('#register-agreement').checked) {
    $('#account-error').textContent = text('请先阅读并勾选同意服务条款与条件、隐私政策、Cookie 政策和免责声明。','Please read and accept the Terms & Conditions, Privacy Policy, Cookie Policy, and Disclaimer first.');
    return;
  }
  const form = new FormData(event.target);
  if (!form.get('cf-turnstile-response')) { ensureTurnstile(true); return $('#account-error').textContent = text('请先完成人机验证。','Please complete the security check.'); }
  const data = await (await fetch('/api/register', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(form)) })).json();
  if (!data.user) { $('#account-error').textContent = localizedError(data.error); ensureTurnstile(true); return; }
  showUser(data.user);
  closeDialogPreservingScroll(accountDialog);
  if (articleData) await renderPostPage(decodeURIComponent(location.pathname.split('/').pop()));
};
$('#profile-form').onsubmit = async (event) => {
  event.preventDefault();
  const status = $('#profile-error');
  status.classList.remove('success');
  status.textContent = '';
  try {
    const response = await fetch('/api/me', { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(event.target))) });
    const data = await response.json();
    if (response.ok) {
      showUser(data.user);
      fillProfile(data.user);
      status.classList.add('success');
      status.textContent = text('个人资料已保存。','Profile saved.');
    } else {
      status.textContent = localizedError(data.error);
    }
  } catch {
    status.textContent = text('网络异常，请稍后重试。','Network error. Please try again.');
  }
};
$('#user-logout').onclick = logoutCurrentUser;
$('#user-delete').onclick = async () => {
  const keyword = language === 'en' ? 'DELETE' : '注销';
  const answer = await showSiteDialog({
    title: text('永久注销账号', 'Permanently delete account'),
    message: text(`这是永久操作。请键入“${keyword}”确认注销账号及删除评论。`, `This is permanent. Type “${keyword}” to delete your account and comments.`),
    prompt: true,
    placeholder: keyword,
    confirmText: text('永久注销', 'Delete permanently'),
    danger: true,
  });
  if (answer !== keyword) return;
  const response = await fetch('/api/me', { method:'DELETE' }); const result = await response.json();
  if (!response.ok) return $('#profile-error').textContent = localizedError(result.error, text('注销失败，请稍后重试。','Account deletion failed. Please try again.'));
  showUser(null);
  closeDialogPreservingScroll(accountDialog);
  location.replace('/');
};
$('#public-profile-close').onclick = () => closeDialogPreservingScroll(accountDialog);
$('#report-user-button').onclick = () => {
  if (activePublicUserId && currentUser?.id !== activePublicUserId) openReportDialog('user', activePublicUserId);
};
document.querySelectorAll('[data-report-close]').forEach((button) => button.onclick = () => closeDialogPreservingScroll(reportDialog));
$('#report-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const status = $('#report-status');
  button.disabled = true;
  status.classList.remove('success');
  status.textContent = text('正在提交举报…', 'Submitting report…');
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_type: $('#report-target-type').value,
        target_id: $('#report-target-id').value,
        reason: $('#report-reason').value,
        details: $('#report-details').value,
        anonymous_token: currentUser ? '' : reportVisitorToken(),
      }),
    });
    const data = await response.json();
    if (response.status === 401) {
      closeDialogPreservingScroll(reportDialog);
      return openAccount('login');
    }
    if (!response.ok) throw new Error(localizedError(data.error, text('举报提交失败，请稍后重试。','Could not submit the report. Please try again.')));
    status.textContent = localizedError(data.message, text('举报已提交。','Report submitted.'));
    status.classList.add('success');
    setTimeout(() => { if (reportDialog.open) closeDialogPreservingScroll(reportDialog); }, 900);
  } catch (error) {
    status.textContent = error.message || text('举报提交失败，请稍后重试。','Could not submit the report. Please try again.');
  } finally {
    button.disabled = false;
  }
};
bindProfileActions();
$('#search-input').value = currentQuery.q;
$('#search-form').onsubmit = (event) => {
  event.preventDefault();
  const query = new URLSearchParams({q: $('#search-input').value.trim()});
  location.href = '/search?' + query;
};
function applyArticleLayout(singleColumn) {
  const active = Boolean(singleColumn);
  $('#post-grid').classList.toggle('articles-single-column', active);
  const slider = $('#articles-layout-slider');
  slider.classList.toggle('single', Boolean(singleColumn));
  document.querySelectorAll('[data-article-layout]').forEach((button) => {
    const selected = button.dataset.articleLayout === (singleColumn ? 'single' : 'double');
    button.classList.toggle('active', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
}
let savedArticleLayout = false;
try { savedArticleLayout = localStorage.getItem('blog-article-layout') === 'single'; } catch (_) {}
applyArticleLayout(savedArticleLayout);
document.querySelectorAll('[data-article-layout]').forEach((button) => {
  button.onclick = () => {
    const singleColumn = button.dataset.articleLayout === 'single';
    savedArticleLayout = singleColumn;
    try { localStorage.setItem('blog-article-layout', singleColumn ? 'single' : 'double'); } catch (_) {}
    applyArticleLayout(singleColumn);
    currentPage = 1;
    loadPosts();
  };
});
const storyOrientation = matchMedia('(orientation: portrait)');
const refreshStoryLayout = () => {
  if (!['home', 'articles', 'search'].includes(document.body.dataset.page)) return;
  currentPage = 1;
  loadPosts();
};
if (storyOrientation.addEventListener) storyOrientation.addEventListener('change', refreshStoryLayout);
else storyOrientation.addListener(refreshStoryLayout);
$('#category-filter').addEventListener('scroll', positionCategoryThumb, { passive: true });
window.addEventListener('resize', positionCategoryThumb, { passive: true });
new ResizeObserver(positionCategoryThumb).observe($('#category-filter'));
document.fonts.ready.then(positionCategoryThumb);
$('#friend-search').oninput = (event) => { friendState.query = event.target.value; friendState.page = 1; renderFriends(); };
$('#friend-search-form').onsubmit = (event) => { event.preventDefault(); friendState.query = $('#friend-search').value.trim(); friendState.page = 1; renderFriends(); };
$('#friend-apply-open').onclick = openFriendApplication;
document.querySelectorAll('[data-friend-close]').forEach((button) => button.onclick = () => closeDialogPreservingScroll(friendApplicationDialog));
$('#friend-application-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.target.querySelector('[type="submit"]');
  const status = $('#friend-application-status');
  button.disabled = true;
  status.classList.remove('success');
  status.textContent = text('正在提交申请…', 'Submitting application…');
  try {
    const response = await fetch('/api/friend-applications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.target))),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(localizedError(data.error, text('友链申请提交失败。','Could not submit the application.')));
    event.target.reset();
    status.textContent = localizedError(data.message, text('申请已提交，请等待管理员审批。','Application submitted. Please wait for review.'));
    status.classList.add('success');
    setTimeout(() => { if (friendApplicationDialog.open) closeDialogPreservingScroll(friendApplicationDialog); }, 1300);
  } catch (error) {
    status.textContent = error.message || text('友链申请提交失败。','Could not submit the application.');
  } finally {
    button.disabled = false;
  }
};
bindCommentImageUploads($('#about-comment-form'));
$('#about-comment-form').onsubmit = async (event) => {
  event.preventDefault();
  if (!currentUser) return openAccount('login');
  const form = event.target;
  const textarea = form.querySelector('textarea');
  const imageUrls = commentImageUrls(form);
  textarea.setCustomValidity('');
  const response = await fetch('/api/comment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ post_id: 'about', content: textarea.value, image_urls: imageUrls }),
  });
  const result = await response.json();
  if (response.status === 401) return openAccount('login');
  if (!response.ok) {
    textarea.setCustomValidity(localizedError(result.error));
    textarea.reportValidity();
    return;
  }
  notifyPendingComment(result);
  textarea.value = '';
  pendingCommentImageUrls = [];
  clearCommentImagePicker(form);
  aboutCommentData.comments = [...(aboutCommentData.comments || []), result.comment];
  commentPage = Math.max(1, Math.ceil(commentRoots(aboutCommentData).length / COMMENTS_PER_PAGE));
  renderAboutComments();
};
document.querySelectorAll('[data-edition]').forEach((button) => button.onclick = () => {
  if (minecraftState.edition === button.dataset.edition) return;
  minecraftState.edition = button.dataset.edition;
  minecraftState.platform = 'windows';
  minecraftState.channel = 'all';
  minecraftState.build = '';
  minecraftState.page = 1;
  minecraftState.selectedVersion = null;
  updateMinecraftFilters();
  loadMinecraftCatalog(1);
});
$('#minecraft-search-form').onsubmit = (event) => { event.preventDefault(); minecraftState.query = $('#minecraft-search').value.trim(); loadMinecraftCatalog(1); };
$('#minecraft-channel').onchange = (event) => { minecraftState.channel = event.target.value; loadMinecraftCatalog(1); };
$('#minecraft-platform').onchange = (event) => { minecraftState.platform = event.target.value; minecraftState.build = ''; updateMinecraftFilters(); loadMinecraftCatalog(1); };
$('#minecraft-build').onchange = (event) => { minecraftState.build = event.target.value; loadMinecraftCatalog(1); };
$('#mirror-type').onchange = (event) => { mirrorState.type = event.target.value; renderMirrorSystemOptions(''); };
let mirrorSearchTimer = null;
$('#mirror-search').oninput = (event) => { mirrorState.query = event.target.value.trim(); clearTimeout(mirrorSearchTimer); mirrorSearchTimer = setTimeout(() => renderMirrorSystemOptions(''), 160); };
$('#mirror-system').onchange = (event) => { mirrorState.systemId = event.target.value; mirrorState.versionId = ''; mirrorState.archId = ''; renderMirrorVersionOptions(); };
$('#mirror-version').onchange = (event) => { mirrorState.versionId = event.target.value; renderMirrorCards(); };
$('#mirror-arch').onchange = (event) => { mirrorState.archId = event.target.value; renderMirrorCards(); };
$('#carousel-prev').onclick = () => { showCarouselSlide(carouselIndex - 1); startCarousel(true); };
$('#carousel-next').onclick = () => { showCarouselSlide(carouselIndex + 1); startCarousel(true); };
$('#home-carousel').addEventListener('focusin', (event) => {
  if (!event.target.closest('.carousel-link')) return;
  carouselFocusPaused = true;
  stopCarousel();
});
$('#home-carousel').addEventListener('focusout', (event) => {
  if (!event.target.closest('.carousel-link') || event.relatedTarget?.closest('.carousel-link')) return;
  carouselFocusPaused = false;
  if (!carouselPointerPaused && !carouselTouchHeld) startCarousel();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) stopCarousel(); else if (document.body.dataset.page === 'home') startCarousel(); });
['(max-width: 1040px)', '(max-width: 670px)'].forEach((query) => {
  const media = matchMedia(query);
  const refresh = () => { if (thoughtsLoaded) renderThoughts(); };
  if (media.addEventListener) media.addEventListener('change', refresh);
  else media.addListener(refresh);
});
const TRAVELLINGS_URL = 'https://www.travellings.cn/go.html';
const TRAVELLINGS_COUNTDOWN_MS = 5000;
let travellingsFrame = 0;
let travellingsDeadline = 0;
function stopTravellingsCountdown() {
  if (travellingsFrame) cancelAnimationFrame(travellingsFrame);
  travellingsFrame = 0;
}
function closeTravellingsDialog() {
  stopTravellingsCountdown();
  const dialog = $('#travellings-dialog');
  if (dialog?.open) dialog.close();
  if (document.body.dataset.page === 'home') startCarousel();
}
function setTravellingsProgress(value) {
  const meter = $('#travellings-countdown');
  const bar = $('#travellings-countdown-bar');
  if (!meter || !bar) return;
  const normalized = Math.max(0, Math.min(1, Number(value) || 0));
  bar.style.width = `${normalized * 100}%`;
  meter.setAttribute('aria-valuenow', String(Math.round(normalized * 100)));
}
function departTravellings() {
  stopTravellingsCountdown();
  location.assign(TRAVELLINGS_URL);
}
function startTravellingsCountdown() {
  stopTravellingsCountdown();
  travellingsDeadline = performance.now() + TRAVELLINGS_COUNTDOWN_MS;
  const seconds = $('#travellings-countdown-seconds');
  const tick = (now) => {
    const remaining = Math.max(0, travellingsDeadline - now);
    const ratio = remaining / TRAVELLINGS_COUNTDOWN_MS;
    setTravellingsProgress(ratio);
    if (seconds) seconds.textContent = String(Math.max(0, Math.ceil(remaining / 1000)));
    if (remaining <= 0) {
      travellingsFrame = 0;
      departTravellings();
      return;
    }
    travellingsFrame = requestAnimationFrame(tick);
  };
  travellingsFrame = requestAnimationFrame(tick);
}
document.querySelectorAll('.travellings-link').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const dialog = $('#travellings-dialog');
    if (!dialog) return;
    stopCarousel();
    if (!dialog.open) dialog.showModal();
    setTravellingsProgress(1);
    const seconds = $('#travellings-countdown-seconds');
    if (seconds) seconds.textContent = '5';
    startTravellingsCountdown();
  });
});
$('#travellings-cancel').onclick = closeTravellingsDialog;
$('#travellings-continue').onclick = departTravellings;
$('#travellings-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeTravellingsDialog();
});
let imageViewerState = null;
let imageViewerTimer = null;
function ensureImageViewer() {
  let dialog = $('#image-viewer');
  if (dialog) return dialog;
  dialog = document.createElement('dialog');
  dialog.id = 'image-viewer';
  dialog.className = 'image-viewer-dialog';
  dialog.innerHTML = `<header class="image-viewer-header"><div><span class="eyebrow">IMAGE VIEWER</span><strong id="image-viewer-caption"></strong></div><button class="icon-button" type="button" data-viewer-close data-no-icon aria-label="关闭图片查看器"><mdui-icon name="close"></mdui-icon></button></header><div class="image-viewer-stage"><button class="image-viewer-nav previous" type="button" data-viewer-prev data-no-icon aria-label="上一张"><mdui-icon name="chevron_left"></mdui-icon></button><img id="image-viewer-image" alt=""><button class="image-viewer-nav next" type="button" data-viewer-next data-no-icon aria-label="下一张"><mdui-icon name="chevron_right"></mdui-icon></button></div><div class="image-viewer-toolbar"><button type="button" data-viewer-zoom-out data-no-icon aria-label="缩小图片"><mdui-icon name="zoom_out"></mdui-icon></button><span id="image-viewer-zoom-label">100%</span><button type="button" data-viewer-zoom-in data-no-icon aria-label="放大图片"><mdui-icon name="zoom_in"></mdui-icon></button><button type="button" data-viewer-slideshow data-no-icon aria-label="幻灯片播放" aria-pressed="false"><mdui-icon name="slideshow"></mdui-icon><span>幻灯片</span></button><button type="button" data-viewer-fullscreen data-no-icon aria-label="全屏查看"><mdui-icon name="fullscreen"></mdui-icon><span>全屏</span></button><button type="button" class="active" data-viewer-thumbnails data-no-icon aria-label="缩略图" aria-pressed="true"><mdui-icon name="view_carousel"></mdui-icon><span>缩略图</span></button></div><div class="image-viewer-thumbnails" id="image-viewer-thumbnails"></div>`;
  document.body.append(dialog);
  return dialog;
}
function imageViewerImagesFor(element) {
  const gallery = element.closest('.comment-gallery, .thought-gallery');
  if (gallery) return [...gallery.querySelectorAll('.gallery-item img')];
  const article = element.closest('.article-content, .reader-content');
  if (article) return [...article.querySelectorAll('img')];
  return [element];
}
function applyImageViewerZoom() {
  if (!imageViewerState) return;
  const image = $('#image-viewer-image');
  const stage = image.closest('.image-viewer-stage');
  const naturalWidth = image.naturalWidth || 1200;
  const naturalHeight = image.naturalHeight || 800;
  const availableWidth = Math.max(120, stage.clientWidth - 80);
  const availableHeight = Math.max(120, stage.clientHeight - 60);
  const fit = Math.min(availableWidth / naturalWidth, availableHeight / naturalHeight, 1);
  image.style.width = `${Math.max(80, Math.round(naturalWidth * fit * imageViewerState.zoom))}px`;
  image.style.height = 'auto';
  $('#image-viewer-zoom-label').textContent = `${Math.round(imageViewerState.zoom * 100)}%`;
}
function showImageViewerImage(index) {
  if (!imageViewerState?.images.length) return;
  imageViewerState.index = (index + imageViewerState.images.length) % imageViewerState.images.length;
  const item = imageViewerState.images[imageViewerState.index];
  const image = $('#image-viewer-image');
  image.src = item.src;
  image.alt = item.alt || '';
  $('#image-viewer-caption').textContent = `${imageViewerState.index + 1} / ${imageViewerState.images.length}${item.alt ? ` · ${item.alt}` : ''}`;
  $('#image-viewer-thumbnails').querySelectorAll('button').forEach((button, itemIndex) => button.classList.toggle('active', itemIndex === imageViewerState.index));
  imageViewerState.zoom = 1;
  applyImageViewerZoom();
}
function stopImageViewerSlideshow() {
  clearInterval(imageViewerTimer);
  imageViewerTimer = null;
  const button = $('#image-viewer [data-viewer-slideshow]');
  if (button) {
    button.classList.remove('active');
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-label', '幻灯片播放');
    button.querySelector('mdui-icon')?.setAttribute('name', 'slideshow');
  }
}
function toggleImageViewerSlideshow() {
  if (imageViewerTimer) return stopImageViewerSlideshow();
  const button = $('#image-viewer [data-viewer-slideshow]');
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  button.setAttribute('aria-label', '暂停幻灯片');
  button.querySelector('mdui-icon')?.setAttribute('name', 'pause_circle');
  imageViewerTimer = setInterval(() => showImageViewerImage(imageViewerState.index + 1), 3000);
}
function openImageViewer(element) {
  const images = imageViewerImagesFor(element);
  const index = Math.max(0, images.indexOf(element));
  imageViewerState = {
    images: images.map((image) => ({ src: image.currentSrc || image.src, alt: image.alt || '' })),
    index,
    zoom: 1,
    thumbnails: true,
  };
  const dialog = ensureImageViewer();
  stopImageViewerSlideshow();
  $('#image-viewer-thumbnails').innerHTML = imageViewerState.images.map((image, itemIndex) => `<button type="button" data-viewer-thumb="${itemIndex}" data-no-icon><img src="${escapeHtml(image.src)}" alt=""><span>${itemIndex + 1}</span></button>`).join('');
  $('#image-viewer-thumbnails').querySelectorAll('[data-viewer-thumb]').forEach((button) => {
    button.onclick = () => showImageViewerImage(Number(button.dataset.viewerThumb));
  });
  const thumbnailButton = dialog.querySelector('[data-viewer-thumbnails]');
  thumbnailButton.classList.toggle('active', imageViewerState.thumbnails);
  thumbnailButton.setAttribute('aria-pressed', String(imageViewerState.thumbnails));
  dialog.classList.toggle('thumbnails-hidden', !imageViewerState.thumbnails);
  showImageViewerImage(index);
  if (!dialog.open) dialog.showModal();
}
document.addEventListener('click', (event) => {
  const image = event.target.closest('.comment-gallery img, .thought-gallery img, .article-content img, .reader-content img, .article-cover-backdrop img');
  if (!image) return;
  event.preventDefault();
  openImageViewer(image);
});
$('#image-viewer')?.remove();
const viewerDialog = ensureImageViewer();
viewerDialog.querySelector('[data-viewer-close]').onclick = () => { stopImageViewerSlideshow(); viewerDialog.close(); };
viewerDialog.querySelector('[data-viewer-prev]').onclick = () => showImageViewerImage(imageViewerState.index - 1);
viewerDialog.querySelector('[data-viewer-next]').onclick = () => showImageViewerImage(imageViewerState.index + 1);
viewerDialog.querySelector('[data-viewer-zoom-out]').onclick = () => { imageViewerState.zoom = Math.max(0.25, imageViewerState.zoom - 0.25); applyImageViewerZoom(); };
viewerDialog.querySelector('[data-viewer-zoom-in]').onclick = () => { imageViewerState.zoom = Math.min(2, imageViewerState.zoom + 0.25); applyImageViewerZoom(); };
viewerDialog.querySelector('[data-viewer-slideshow]').onclick = toggleImageViewerSlideshow;
viewerDialog.querySelector('[data-viewer-thumbnails]').onclick = (event) => {
  imageViewerState.thumbnails = !imageViewerState.thumbnails;
  event.currentTarget.classList.toggle('active', imageViewerState.thumbnails);
  event.currentTarget.setAttribute('aria-pressed', String(imageViewerState.thumbnails));
  viewerDialog.classList.toggle('thumbnails-hidden', !imageViewerState.thumbnails);
};
viewerDialog.querySelector('[data-viewer-fullscreen]').onclick = async (event) => {
  if (!document.fullscreenElement) await viewerDialog.requestFullscreen?.();
  else await document.exitFullscreen?.();
};
document.addEventListener('fullscreenchange', () => {
  const button = viewerDialog.querySelector('[data-viewer-fullscreen]');
  if (!button) return;
  button.classList.toggle('active', Boolean(document.fullscreenElement));
  button.querySelector('mdui-icon')?.setAttribute('name', document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen');
});
$('#image-viewer-image').addEventListener('load', applyImageViewerZoom);
viewerDialog.addEventListener('cancel', (event) => { event.preventDefault(); stopImageViewerSlideshow(); viewerDialog.close(); });
viewerDialog.addEventListener('close', stopImageViewerSlideshow);
document.addEventListener('keydown', (event) => {
  if (!viewerDialog.open || !imageViewerState) return;
  if (event.key === 'ArrowLeft') showImageViewerImage(imageViewerState.index - 1);
  if (event.key === 'ArrowRight') showImageViewerImage(imageViewerState.index + 1);
});
document.querySelectorAll('.nav-links a[data-route]').forEach((link) => link.addEventListener('click', () => { if (mobileSidebar?.matches) setSidebarOpen(false); }));
window.onhashchange = () => { const route = location.hash.slice(1).split('?')[0]; if (Object.prototype.hasOwnProperty.call(PUBLIC_ROUTES, route)) location.replace(PUBLIC_ROUTES[route] + location.search); else showRoute(); };
function setupBackToTop() {
  const button = $('#back-to-top');
  if (!button) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    button.classList.toggle('visible', window.scrollY > Math.max(420, window.innerHeight * 0.6));
    const footer = document.querySelector('.footer-bottom');
    const overlap = footer ? Math.max(0, innerHeight - footer.getBoundingClientRect().top) : 0;
    const lift = overlap ? Math.min(overlap + 16, innerHeight - button.offsetHeight - 32) : 0;
    button.style.setProperty('--footer-button-lift', `${Math.max(0, lift)}px`);

  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  new ResizeObserver(scheduleUpdate).observe(document.body);
  button.onclick = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  update();
}
setupBackToTop();
BlogIcons.iconize();
const mobileSidebar = matchMedia('(max-width: 1099px), (orientation: portrait)');
const portraitSidebar = matchMedia('(orientation: portrait)');
function setSidebarOpen(open) { document.body.classList.toggle('sidebar-collapsed', !open); const button = $('#sidebar-toggle'); button.setAttribute('aria-expanded', String(open)); button.setAttribute('aria-pressed', String(open)); button.classList.toggle('active', open); button.classList.toggle('sidebar-open', open); }
function syncSidebarViewport() { setSidebarOpen(false); }
syncSidebarViewport(); mobileSidebar.addEventListener('change', syncSidebarViewport);
$('#sidebar-toggle').onclick = () => setSidebarOpen(document.body.classList.contains('sidebar-collapsed'));
document.addEventListener('click', (event) => { if (!portraitSidebar.matches || document.body.classList.contains('sidebar-collapsed')) return; if (!event.target.closest('.nav-links') && !event.target.closest('#sidebar-toggle')) setSidebarOpen(false); });
function consumeOAuthRedirectNotice() {
  const params = new URLSearchParams(location.search);
  const success = params.get('oauth');
  const error = params.get('oauth_error');
  const successLabels = {
    github_login: text('已通过 GitHub 登录。', 'Signed in with GitHub.'),
    qq_login: text('已通过 QQ 登录。', 'Signed in with QQ.'),
    github_bound: text('GitHub 账号已绑定。', 'GitHub account connected.'),
    qq_bound: text('QQ 账号已绑定。', 'QQ account connected.'),
  };
  const errorLabels = {
    not_configured: text('该第三方登录尚未配置。', 'This sign-in provider is not configured.'),
    session_required: text('请先登录邮箱账号，再绑定第三方账号。', 'Log in with your email account before connecting a provider.'),
    binding_expired: text('邮箱绑定请求已过期，请重新发起授权。', 'The binding request expired. Please authorize again.'),
    provider_denied: text('第三方授权已取消或未获批准。', 'The provider authorization was cancelled or denied.'),
    provider_error: text('第三方登录服务暂时不可用，请稍后重试。', 'The provider is temporarily unavailable. Please try again.'),
    state_expired: text('登录请求已过期，请重新发起。', 'The sign-in request expired. Please try again.'),
    account_banned: text('该账号已被封禁，请联系管理员。', 'This account is banned. Please contact the administrator.'),
    oauth_conflict: text('该第三方账号已绑定其他邮箱账号。', 'This provider is already linked to another email account.'),
    provider_already_bound: text('当前邮箱账号已绑定其他第三方身份。', 'This email account is already linked to a different provider identity.'),
    agreement_required: text('请先阅读并同意相关条款，再使用第三方账号登录。', 'Read and accept the policies before using third-party sign-in.'),
  };
  if (success && successLabels[success]) showOAuthNotice(successLabels[success]);
  if (error) showOAuthNotice(errorLabels[error] || text('第三方登录失败，请稍后重试。', 'Third-party sign-in failed. Please try again.'), true);
  if (success || error) {
    const cleanUrl = new URL(location.href);
    cleanUrl.searchParams.delete('oauth');
    cleanUrl.searchParams.delete('oauth_error');
    history.replaceState(null, '', cleanUrl.pathname + cleanUrl.search + cleanUrl.hash);
  }
}
const appLoadStarted = performance.now();
function finishInitialLoading() {
  const loader = $('#app-loading');
  const delay = Math.max(0, 420 - (performance.now() - appLoadStarted));
  setTimeout(() => {
    document.documentElement.dataset.appLoading = 'false';
    loader?.addEventListener('transitionend', () => loader.remove(), { once: true });
    setTimeout(() => loader?.remove(), 380);
  }, delay);
}
renderDailyMotionArt();
syncTopicPlacement();
if (portraitTopicMedia.addEventListener) portraitTopicMedia.addEventListener('change', syncTopicPlacement);
else portraitTopicMedia.addListener(syncTopicPlacement);
Promise.all([
  fetch('/api/site').then((response) => response.json()),
  fetch('/api/me').then((response) => response.json()),
  fetch('/api/legal-documents').then((response) => response.json()).catch(() => ({ documents: {} })),
  fetch('/api/announcements').then((response) => response.json()).catch(() => ({ announcements: [] })),
])
  .then(async ([data, me, legalData, announcementData]) => {
    site = data;
    policyDocuments = legalData.documents || {};
    announcementsCatalog = announcementData.announcements || [];
    announcementsLoaded = true;
    renderSite();
    renderFilters();
    renderAnnouncements();
    showUser(me.user);
    consumeOAuthRedirectNotice();
    loadServerRuntime();
    renderFooterFriends();
    setInterval(loadServerRuntime, 60000);
    if (location.pathname === '/auth/bind') {
      openOAuthBindPage();
      return;
    }
    if (location.pathname === '/profile') {
      showRoute();
      return;
    }
    if (['/privacy','/cookies','/terms','/copyright','/disclaimer'].includes(location.pathname)) {
      showRoute();
      return;
    }
    await loadPosts();
    if (location.pathname.startsWith('/post/')) await renderPostPage(decodeURIComponent(location.pathname.split('/').pop()));
    else showRoute();
  })
  .catch((error) => console.error('Initial page load failed', error))
  .finally(finishInitialLoading);

/* Retained navigation drawer accessibility and keyboard support. */
(() => {
  if (document.body.dataset.ui !== 'material3') return;
  const drawerMode = matchMedia('(max-width: 1099px), (orientation: portrait)');
  const nav = document.querySelector('#site-navigation');
  const menu = document.querySelector('#sidebar-toggle');
  function syncDrawerAccessibility() {
    const closed = drawerMode.matches && document.body.classList.contains('sidebar-collapsed');
    nav.inert = closed;
    nav.setAttribute('aria-hidden', String(closed));
  }
  new MutationObserver(syncDrawerAccessibility).observe(document.body, {attributes:true,attributeFilter:['class']});
  drawerMode.addEventListener('change', syncDrawerAccessibility);
  syncDrawerAccessibility();
  document.addEventListener('keydown', event => {
    if (!drawerMode.matches || document.body.classList.contains('sidebar-collapsed') || document.querySelector('dialog[open]')) return;
    if (event.key === 'Escape') {setSidebarOpen(false);menu.focus();event.preventDefault();}
    if (event.key === 'Tab') {
      const items = [menu, ...nav.querySelectorAll('a,button')].filter(el => el.checkVisibility() && el.tabIndex >= 0);
      const index = items.indexOf(document.activeElement);
      if (index < 0 || (!event.shiftKey && index === items.length-1)) {items[0]?.focus();event.preventDefault();}
      else if (event.shiftKey && index === 0) {items.at(-1)?.focus();event.preventDefault();}
    }
  });
  document.addEventListener('click', event => {
    if (!drawerMode.matches || document.body.classList.contains('sidebar-collapsed')) return;
    if (!event.target.closest('.nav-links,#sidebar-toggle')) setSidebarOpen(false);
  });
  menu.addEventListener('click', event => {
    syncDrawerAccessibility();
    if (drawerMode.matches && !document.body.classList.contains('sidebar-collapsed') && event.detail === 0) nav.querySelector('a')?.focus();
  });
})();

// Login validation uses themed, accessible field messages instead of native popups.
function clearLoginFieldError(field) {
  const message = document.getElementById(`login-${field.name}-error`);
  message?.remove();
  field.removeAttribute('aria-invalid');
  field.removeAttribute('aria-describedby');
}
function validateLoginFields() {
  const form = document.querySelector('#user-login-form');
  let firstInvalid = null;
  for (const field of form.querySelectorAll('input[required]')) {
    clearLoginFieldError(field);
    const missing = field.name === 'password' ? !field.value : !field.value.trim();
    if (!missing) continue;
    const error = document.createElement('span');
    error.id = `login-${field.name}-error`;
    error.className = 'login-field-error';
    error.setAttribute('role', 'alert');
    error.textContent = field.name === 'identity' ? text('请输入用户名或邮箱。','Enter your username or email.') : text('请输入密码。','Enter your password.');
    field.insertAdjacentElement('afterend', error);
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', error.id);
    firstInvalid ||= field;
  }
  if (firstInvalid) {
    document.querySelector('#account-error').textContent = '';
    firstInvalid.focus();
    return false;
  }
  return true;
}
document.querySelectorAll('#user-login-form input').forEach(field => field.addEventListener('input', () => clearLoginFieldError(field)));

// Play the transparent source as a compact frame sheet, with no manual pause control.
(() => {
  const character = $('#about-character');
  const stage = $('#about-character-stage');
  const action = $('#about-character-action');
  const player = $('#about-character-frame-player');
  if (!character || !stage || !action || !player) return;
  const frameCount = Number(player.dataset.frameCount) || 61;
  const columns = Number(player.dataset.frameColumns) || 8;
  const rows = Number(player.dataset.frameRows) || 8;
  const bubbleIdle = character.querySelector('.about-bubble-idle');
  const bubbleActive = character.querySelector('.about-bubble-active');
  const defaultDialogues = {
    zh: [
      '很高兴认识你',
      '今天也去试试看！',
      '这机器……要不先拆开看看？',
      '新模型排队中，我先替你测。',
      '翻车不可怕，记得先备份。',
      '问题解决时，会有一声“原来如此”。',
      '屏幕之外，也要认真吃饭。',
      '你好呀，今天过得怎么样？',
      '世界很大，我们慢慢逛。',
    ],
    en: [
      'Nice to meet you',
      'Let’s try something new today!',
      'Should we see what’s inside this machine?',
      'The new model is queued. I’ll test it first.',
      'Things break. Backups save the day.',
      'That little “now I get it” moment is worth it.',
      'Good food matters outside the screen too.',
      'Hi! How’s your day going?',
      'The world is big. Let’s take it one step at a time.',
    ],
  };
  function configuredDialogues() {
    const p = site.profile || {};
    const key = document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
    const raw = p[`about_dialogues_${key}`];
    const fallback = defaultDialogues[key].slice(1);
    const custom = String(raw || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const idle = text(p.about_dialog_idle, p.about_dialog_idle_en) || defaultDialogues[key][0];
    return [idle, ...(custom.length ? custom : fallback)];
  }
  const frameDuration = 1000 / 12;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let inViewport = !('IntersectionObserver' in window);
  let sheetReady = false;
  let frame = 0;
  let animationFrame = 0;
  let previousTime = 0;
  let responseTimer = 0;
  let celebrationTimer = 0;
  let dialogueIndex = 0;
  let pointerFrame = 0;
  let pointerX = 0;
  let pointerY = 0;

  function setFrame(index) {
    frame = ((index % frameCount) + frameCount) % frameCount;
    const column = frame % columns;
    const row = Math.floor(frame / columns);
    player.style.backgroundPosition = `${column * 100 / (columns - 1)}% ${row * 100 / (rows - 1)}%`;
  }

  function shouldPause() {
    return reducedMotion.matches || document.body.dataset.uiMotion === 'reduced' ||
      !inViewport || document.hidden;
  }

  function syncPlayback() {
    const paused = shouldPause();
    character.classList.toggle('motion-reduced', paused);
    if (paused || !sheetReady) {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      previousTime = 0;
      return;
    }
    animationFrame ||= requestAnimationFrame(play);
  }

  function play(time) {
    animationFrame = 0;
    if (shouldPause() || !sheetReady) return;
    if (!previousTime) previousTime = time;
    const elapsed = time - previousTime;
    if (elapsed >= frameDuration) {
      const advance = Math.max(1, Math.floor(elapsed / frameDuration));
      setFrame(frame + advance);
      previousTime += advance * frameDuration;
    }
    animationFrame = requestAnimationFrame(play);
  }

  const sheet = new Image();
  sheet.decoding = 'async';
  sheet.onload = () => {
    sheetReady = true;
    player.classList.add('sheet-ready');
    character.classList.add('is-ready');
    setFrame(0);
    syncPlayback();
  };
  sheet.onerror = () => {
    sheetReady = false;
    player.classList.remove('sheet-ready');
    character.classList.remove('is-ready');
  };
  sheet.src = '/about-avatar-frames.webp';
  setFrame(0);

  function activeDialogues() {
    return configuredDialogues();
  }

  function refreshDialogue() {
    if (!bubbleActive.classList.contains('hidden')) {
      bubbleActive.textContent = activeDialogues()[dialogueIndex];
    }
  }

  function greetCharacter() {
    clearTimeout(responseTimer);
    clearTimeout(celebrationTimer);
    dialogueIndex = (dialogueIndex + 1) % configuredDialogues().length;
    bubbleActive.textContent = activeDialogues()[dialogueIndex];
    bubbleIdle.classList.add('hidden');
    bubbleActive.classList.remove('hidden');
    character.classList.remove('is-celebrating');
    void character.offsetWidth;
    character.classList.add('is-celebrating');
    celebrationTimer = setTimeout(() => character.classList.remove('is-celebrating'), 900);
    responseTimer = setTimeout(() => {
      bubbleIdle.classList.remove('hidden');
      bubbleActive.classList.add('hidden');
    }, 3400);
  }

  character.addEventListener('click', greetCharacter);
  action.addEventListener('click', greetCharacter);
  character.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    greetCharacter();
  });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      inViewport = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.08 }).observe(character);
  } else {
    syncPlayback();
  }
  document.addEventListener('visibilitychange', syncPlayback);
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncPlayback);
  else reducedMotion.addListener(syncPlayback);
  new MutationObserver(syncPlayback).observe(document.body, { attributes: true, attributeFilter: ['data-ui-motion'] });
  new MutationObserver(refreshDialogue).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });

  if (matchMedia('(pointer: fine)').matches) {
    stage.addEventListener('pointermove', (event) => {
      if (shouldPause()) return;
      const bounds = character.getBoundingClientRect();
      pointerX = ((event.clientX - bounds.left) / bounds.width - 0.5) * 10;
      pointerY = ((event.clientY - bounds.top) / bounds.height - 0.5) * 8;
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        character.style.setProperty('--look-x', `${pointerX.toFixed(2)}px`);
        character.style.setProperty('--look-y', `${pointerY.toFixed(2)}px`);
        pointerFrame = 0;
      });
    });
    stage.addEventListener('pointerleave', () => {
      character.style.setProperty('--look-x', '0px');
      character.style.setProperty('--look-y', '0px');
    });
  }
  syncPlayback();
})();
