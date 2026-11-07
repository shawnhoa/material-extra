let posts = [];
let selectedId = null;
let selectedPinned = false;
let selectedCarousel = false;
let savedRange = null;
let coverCropState = null;
let homeThemeCatalog = null;
let adminReports = [];
let adminUsers = [];
let adminFriendApplications = [];
let adminThoughts = [];
let editingThoughtId = '';
let thoughtImageUrls = [];
let adminAnnouncements = [];
let editingAnnouncementId = '';
let adminComments = [];
let selectedEditorImage = null;
let adminCurrentTheme = null;
let adminSaveFeedbackTimer = null;
const CONTENT_WORKSPACE = Boolean(window.ADMIN_CONTENT_WORKSPACE);
const MAX_ABOUT_TAGS = 12;
const DEFAULT_ABOUT_TAGS = [
  { zh: '网站部署', en: 'Website deployment' },
  { zh: 'AI 应用', en: 'AI applications' },
  { zh: '系统刷写', en: 'OS tinkering' },
  { zh: '硬件拆解', en: 'Hardware teardown' },
  { zh: '单片机烧录', en: 'Microcontroller flashing' },
  { zh: '日常记录', en: 'Everyday notes' },
  { zh: '吃遍天下', en: 'Taste the world' },
];
let aboutTags = [];
document.body.classList.toggle('admin-content-page', CONTENT_WORKSPACE);
const adminCommentViews = {
  article: { filter: 'all', query: '' },
  guestbook: { filter: 'all', query: '' },
};
const $ = (selector) => document.querySelector(selector);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const safeAdminMedia = (value) => /^(?:https?:\/\/|\/uploads\/[a-f0-9]{32}(?:_(?:32|48|64|96|128|192|256))?\.(?:jpg|jpeg|png|gif|webp))/i.test(String(value || '')) ? String(value) : '';
function showAdminSaveFeedback(message = '保存成功') {
  let toast = $('#admin-save-feedback');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'admin-save-feedback';
    toast.className = 'admin-save-feedback';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    toast.innerHTML = '<span class="admin-save-feedback-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg></span><span class="admin-save-feedback-message"></span>';
    document.body.append(toast);
  }
  toast.querySelector('.admin-save-feedback-message').textContent = message;
  clearTimeout(adminSaveFeedbackTimer);
  requestAnimationFrame(() => toast.classList.add('is-visible'));
  adminSaveFeedbackTimer = setTimeout(() => toast.classList.remove('is-visible'), 3200);
}
const MAX_ADMIN_GALLERY_IMAGES = 9;
function adminGalleryUrls(item) {
  const urls = [];
  for (const value of [...(Array.isArray(item?.image_urls) ? item.image_urls : []), item?.image_url]) {
    const url = safeAdminMedia(value);
    if (url && !urls.includes(url)) urls.push(url);
  }
  return urls.slice(0, MAX_ADMIN_GALLERY_IMAGES);
}
function adminGalleryMarkup(urls, className, label) {
  if (!urls.length) return '';
  return `<div class="${className}" aria-label="${escapeHtml(label)}">${urls.map((url, index) => `<a class="gallery-item" href="${escapeHtml(url)}" target="_blank" rel="noopener"><img src="${escapeHtml(url)}" alt="${escapeHtml(label)} ${index + 1}" loading="lazy"></a>`).join('')}</div>`;
}
const reportReasonLabels = { spam: '垃圾信息或广告', harassment: '骚扰或攻击', hate: '仇恨言论', privacy: '泄露隐私', impersonation: '冒充他人', other: '其他违规行为' };
const reportStatusLabels = { open: '待处理', resolved: '已处理', dismissed: '已驳回' };
const moderationActionLabels = { mute: '已禁言', unmute: '已解除禁言', ban: '已封禁', unban: '已解除封禁' };
const formatAdminDate = (value) => value ? new Intl.DateTimeFormat('zh-CN', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(value)) : '—';
function showAdminDialog({ title, message, confirmText = '确定', cancelText = '取消', danger = false, showCancel = true, prompt = false, placeholder = '', value = '' }) {
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'reader-dialog app-action-dialog admin-action-dialog';
    dialog.innerHTML = `<div class="app-dialog-icon ${danger ? 'danger' : ''}"><mdui-icon name="${danger ? 'warning' : 'info'}"></mdui-icon></div><h2>${escapeHtml(title)}</h2><p class="app-dialog-message">${escapeHtml(message)}</p>${prompt ? `<label class="app-dialog-field"><span>${escapeHtml(placeholder)}</span><input type="text" autocomplete="off" value="${escapeHtml(value)}"></label>` : ''}<div class="app-dialog-actions">${showCancel ? `<button class="text-button" type="button" data-dialog-cancel data-no-icon><mdui-icon name="close"></mdui-icon><span>${escapeHtml(cancelText)}</span></button>` : ''}<button class="filled-button ${danger ? 'danger-button' : ''}" type="button" data-dialog-confirm data-no-icon><mdui-icon name="${danger ? 'delete' : 'check'}"></mdui-icon><span>${escapeHtml(confirmText)}</span></button></div>`;
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
    dialog.addEventListener('close', () => { if (!settled) { settled = true; resolve(prompt ? null : false); dialog.remove(); } });
    dialog.showModal();
    setTimeout(() => (prompt ? dialog.querySelector('input') : dialog.querySelector('[data-dialog-confirm]'))?.focus(), 0);
  });
}
function showAdminSaveDialog(title = '保存成功', message = '配置已保存并生效。') {
  document.querySelector('#admin-save-dialog')?.remove();
  return new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.id = 'admin-save-dialog';
    dialog.className = 'reader-dialog app-action-dialog admin-action-dialog admin-save-dialog';
    dialog.setAttribute('role', 'alertdialog');
    dialog.innerHTML = `<div class="app-dialog-icon success"><mdui-icon name="check_circle"></mdui-icon></div><h2>${escapeHtml(title)}</h2><p class="app-dialog-message">${escapeHtml(message)}</p><div class="app-dialog-actions"><button class="filled-button" type="button" data-save-dialog-confirm data-no-icon><mdui-icon name="check"></mdui-icon><span>知道了</span></button></div>`;
    document.body.append(dialog);
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve(true);
      dialog.close();
      dialog.remove();
    };
    dialog.querySelector('[data-save-dialog-confirm]').onclick = finish;
    dialog.addEventListener('cancel', (event) => {
      event.preventDefault();
      finish();
    });
    dialog.addEventListener('close', () => {
      if (settled) return;
      settled = true;
      resolve(false);
      dialog.remove();
    });
    dialog.showModal();
    requestAnimationFrame(() => {
      dialog.querySelector('[data-save-dialog-confirm]')?.focus();
      BlogIcons.iconize(dialog);
    });
  });
}
function adminAvatarMarkup(user) {
  const username = user?.username || '用户';
  const url = /^\/uploads\/[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp)$/i.test(String(user?.avatar_url || '')) ? user.avatar_url : '';
  return `<span class="admin-user-avatar">${url ? `<img src="${escapeHtml(url)}" alt="${escapeHtml(username)}的头像">` : escapeHtml(username.slice(0, 1).toUpperCase())}</span>`;
}
async function runUserModeration(userId, action, reason = '', durationHours = 0) {
  const response = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/moderation`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, reason, duration_hours: durationHours }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '账号处置失败');
  return data;
}
async function resolveReport(reportId, action) {
  const response = await fetch(`/api/admin/reports/${encodeURIComponent(reportId)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '举报处理失败');
  return data;
}

const ADMIN_UI_PALETTES = {
  forest: { accent: '#32694d', light: '#32694d', dark: '#b3d5be' },
  ocean: { accent: '#315f8a', light: '#315f8a', dark: '#b7d4ef' },
  violet: { accent: '#6750a4', light: '#6750a4', dark: '#d0bcff' },
  rose: { accent: '#8e4158', light: '#8e4158', dark: '#ffb3c5' },
  amber: { accent: '#8b5e14', light: '#8b5e14', dark: '#ffd38a' },
};
function applyAdminAppearance(profile = {}) {
  const customAccent = /^#[0-9a-f]{6}$/i.test(profile.ui_accent || '') ? profile.ui_accent : '#32694d';
  const paletteKey = profile.ui_palette === 'custom' || Object.hasOwn(ADMIN_UI_PALETTES, profile.ui_palette) ? profile.ui_palette : 'seasonal';
  const settings = {
    width: ['focus', 'standard', 'wide', 'custom'].includes(profile.ui_width) ? profile.ui_width : 'standard',
    corner: ['soft', 'rounded', 'expressive', 'custom'].includes(profile.ui_corner) ? profile.ui_corner : 'rounded',
    cards: ['tonal', 'elevated', 'outlined'].includes(profile.ui_card_style) ? profile.ui_card_style : 'tonal',
    density: ['comfortable', 'compact', 'airy'].includes(profile.ui_density) ? profile.ui_density : 'comfortable',
    hero: ['art', 'focus', 'compact'].includes(profile.ui_hero_layout) ? profile.ui_hero_layout : 'art',
    motion: ['full', 'subtle', 'reduced'].includes(profile.ui_motion) ? profile.ui_motion : 'full',
  };
  const body = document.body;
  body.dataset.uiPalette = paletteKey;
  body.dataset.uiWidth = settings.width;
  body.dataset.uiCorner = settings.corner;
  body.dataset.uiCards = settings.cards;
  body.dataset.uiDensity = settings.density;
  body.dataset.uiHeroLayout = settings.hero;
  body.dataset.uiMotion = settings.motion;
  document.documentElement.style.setProperty('--admin-custom-width', `${Math.min(1540, Math.max(900, Number(profile.ui_width_custom) || 1120))}px`);
  const managedRadius = Math.min(40, Math.max(0, (Number.isFinite(Number(profile.ui_corner_custom ?? 20)) ? Number(profile.ui_corner_custom ?? 20) : 20)));
  document.documentElement.style.setProperty('--ui-managed-radius', `${managedRadius}px`);
  document.documentElement.style.setProperty('--admin-custom-radius', `${managedRadius}px`);
  if (paletteKey !== 'seasonal') {
    const palette = paletteKey === 'custom'
      ? { accent: customAccent, light: `color-mix(in srgb,${customAccent} 76%,#18231d)`, dark: `color-mix(in srgb,${customAccent} 44%,#ffffff)` }
      : ADMIN_UI_PALETTES[paletteKey];
    document.documentElement.style.setProperty('--term-accent', palette.accent);
    document.documentElement.style.setProperty('--theme-primary-light', palette.light);
    document.documentElement.style.setProperty('--theme-primary-dark', palette.dark);
  } else if (adminCurrentTheme) {
    SolarThemes.apply(adminCurrentTheme, 'zh');
  }
  const preview = $('#admin-appearance-preview');
  if (preview) {
    preview.dataset.uiWidth = settings.width;
    preview.dataset.uiCorner = settings.corner;
    preview.dataset.uiCardStyle = settings.cards;
    preview.dataset.uiDensity = settings.density;
    preview.dataset.uiHeroLayout = settings.hero;
    preview.dataset.uiMotion = settings.motion;
  }
}
function sanitizePreviewMarkup(markup) {
  const doc = new DOMParser().parseFromString(String(markup || ''), 'text/html');
  doc.querySelectorAll('script,style,iframe,object,embed,link,meta').forEach((node) => node.remove());
  doc.querySelectorAll('*').forEach((node) => {
    for (const attribute of [...node.attributes]) {
      if (/^on/i.test(attribute.name) || /javascript:/i.test(attribute.value)) node.removeAttribute(attribute.name);
    }
  });
  return doc.body.innerHTML;
}
function renderPostPreview() {
  const editor = $('#post-content');
  const title = $('#post-title')?.value.trim() || '未命名文章';
  const excerpt = $('#post-excerpt')?.value.trim() || '文章摘要会显示在这里。';
  const category = $('#post-category')?.value.trim() || '未分类';
  const author = $('#post-author')?.value.trim() || 'StarIsle';
  const cover = safePostCover($('#post-cover-url')?.value || '');
  $('#editor-preview-title').textContent = title;
  $('#editor-preview-excerpt').textContent = excerpt;
  $('#editor-preview-meta').textContent = `${category} · ${author}`;
  const coverHost = $('#editor-preview-cover');
  const coverImage = $('#editor-preview-cover-image');
  coverHost.classList.toggle('has-image', Boolean(cover));
  coverImage.classList.toggle('hidden', !cover);
  if (cover) coverImage.src = cover;
  else coverImage.removeAttribute('src');
  const format = $('#post-format')?.value || 'html';
  const content = $('#post-preview-content');
  if (format === 'markdown') {
    content.innerHTML = String(editor?.innerText || '').split(/\n+/).filter(Boolean).map((line) => `<p>${escapeHtml(line)}</p>`).join('');
  } else {
    content.innerHTML = sanitizePreviewMarkup(editor?.innerHTML || '');
  }
  schedulePreviewScrollSync();
}
let previewScrollFrame = 0;
function syncPreviewScroll() {
  const editor = $('#post-content');
  const preview = $('#editor-article-preview');
  const content = $('#post-preview-content');
  if (!editor || !preview || !content) return;
  const editorRect = editor.getBoundingClientRect();
  const previewRect = preview.getBoundingClientRect();
  if (preview.clientHeight <= 0 || editor.clientHeight <= 0) return;
  if (editor.scrollTop <= 1) { preview.scrollTop = 0; return; }
  if (editor.scrollTop >= editor.scrollHeight - editor.clientHeight - 1) {
    preview.scrollTop = preview.scrollHeight - preview.clientHeight;
    return;
  }
  const anchor = editor.scrollTop + editor.clientHeight * 0.36;
  const sourceBlocks = [...editor.children].filter((block) => block.getBoundingClientRect().height > 0);
  const previewBlocks = [...content.children].filter((block) => block.getBoundingClientRect().height > 0);
  let target = 0;
  if (sourceBlocks.length && sourceBlocks.length === previewBlocks.length) {
    const index = Math.max(0, sourceBlocks.findIndex((block) => {
      const rect = block.getBoundingClientRect();
      return rect.bottom - editorRect.top + editor.scrollTop > anchor;
    }));
    const source = sourceBlocks[index] || sourceBlocks.at(-1);
    const destination = previewBlocks[index] || previewBlocks.at(-1);
    const sourceRect = source.getBoundingClientRect();
    const sourceTop = sourceRect.top - editorRect.top + editor.scrollTop;
    const ratio = Math.max(0, Math.min(1, (anchor - sourceTop) / Math.max(sourceRect.height, 1)));
    const destinationTop = destination.getBoundingClientRect().top - previewRect.top + preview.scrollTop;
    const nextDestination = previewBlocks[index + 1];
    const destinationHeight = nextDestination
      ? nextDestination.getBoundingClientRect().top - destination.getBoundingClientRect().top
      : destination.getBoundingClientRect().height;
    target = destinationTop + Math.max(0, destinationHeight) * ratio - preview.clientHeight * 0.36;
  } else {
    const progress = Math.max(0, Math.min(1, editor.scrollTop / Math.max(1, editor.scrollHeight - editor.clientHeight)));
    target = progress * Math.max(0, preview.scrollHeight - preview.clientHeight);
  }
  preview.scrollTop = Math.max(0, Math.min(preview.scrollHeight - preview.clientHeight, target));
}
function schedulePreviewScrollSync() {
  cancelAnimationFrame(previewScrollFrame);
  previewScrollFrame = requestAnimationFrame(syncPreviewScroll);
}
function setupEditorFloatingDock() {
  const authoring = $('#editor-import-zone');
  const components = $('#editor-component-library');
  const toolbar = $('#rich-toolbar');
  if (!authoring || !components || !toolbar || authoring.querySelector('.editor-floating-dock')) return;
  const dock = document.createElement('div');
  dock.className = 'editor-floating-dock';
  dock.setAttribute('aria-label', '悬浮编辑工具');
  const head = document.createElement('div');
  head.className = 'editor-floating-head';
  head.innerHTML = '<div><span class="material-symbols-rounded">build</span><strong>编辑工具</strong><small>组件与格式</small></div><div class="editor-floating-actions"><button type="button" id="show-editor-preview" aria-controls="editor-article-preview" aria-expanded="false" hidden><span class="material-symbols-rounded">visibility</span><span>显示预览</span></button><button type="button" id="toggle-editor-tools" aria-expanded="true"><span class="material-symbols-rounded">expand_less</span><span>收起</span></button></div>';
  const workspace = $('.editor-workspace');
  workspace.before(dock);
  const importPanel = document.createElement('details');
  importPanel.className = 'editor-import-panel';
  const importSummary = document.createElement('summary');
  importSummary.textContent = '导入 HTML 文件';
  const importRow = authoring.querySelector('.html-import-row');
  importPanel.append(importSummary, importRow);
  dock.append(head, toolbar, components, importPanel);
  const hint = authoring.querySelector('.editor-drag-hint');
  if (hint) dock.append(hint);
  const mediaTools = $('#editor-media-tools');
  if (mediaTools) workspace.after(mediaTools);
  const toggle = $('#toggle-editor-tools');
  const setCollapsed = (collapsed) => {
    dock.classList.toggle('collapsed', collapsed);
    toggle.setAttribute('aria-expanded', String(!collapsed));
    toggle.innerHTML = `<span class="material-symbols-rounded">${collapsed ? 'expand_more' : 'expand_less'}</span><span>${collapsed ? '展开' : '收起'}</span>`;
    try { localStorage.setItem('admin-editor-tools-collapsed', String(collapsed)); } catch (_) {}
    schedulePreviewScrollSync();
  };
  let collapsed = false;
  try { collapsed = localStorage.getItem('admin-editor-tools-collapsed') === 'true'; } catch (_) {}
  setCollapsed(collapsed);
  toggle.onclick = () => setCollapsed(!dock.classList.contains('collapsed'));
}
function setupEditorLayoutControls() {
  const workspace = $('.editor-workspace');
  const toc = $('.admin-toc-panel');
  const sidebar = $('.post-sidebar');
  if (!workspace) return;
  const directory = sidebar?.querySelector('.post-directory');
  if (directory && toc) directory.after(toc);
  const previewToggle = $('#toggle-preview-pane');
  const showPreviewButton = $('#show-editor-preview');
  const setPreviewCollapsed = (collapsed) => {
    workspace.classList.toggle('preview-collapsed', collapsed);
    if (showPreviewButton) {
      showPreviewButton.hidden = !collapsed;
      showPreviewButton.setAttribute('aria-expanded', String(!collapsed));
    }
    previewToggle?.setAttribute('aria-expanded', String(!collapsed));
    requestAnimationFrame(schedulePreviewScrollSync);
  };
  previewToggle?.addEventListener('click', () => setPreviewCollapsed(true));
  showPreviewButton?.addEventListener('click', () => setPreviewCollapsed(false));
  // Each visit opens the preview, including browsers with an older saved preference.
  setPreviewCollapsed(false);
  const portraitMode = matchMedia('(max-width: 900px), (orientation: portrait)');
  const applyResponsivePreviewMode = () => {
    workspace.classList.toggle('preview-stacked', portraitMode.matches);
    requestAnimationFrame(schedulePreviewScrollSync);
  };
  applyResponsivePreviewMode();
  if (portraitMode.addEventListener) portraitMode.addEventListener('change', applyResponsivePreviewMode);
  else portraitMode.addListener(applyResponsivePreviewMode);
  new ResizeObserver(schedulePreviewScrollSync).observe(workspace);
  $('#post-content')?.addEventListener('scroll', schedulePreviewScrollSync, { passive: true });
}
function showEditorImageTools(image) {
  selectedEditorImage = image || null;
  document.querySelectorAll('#post-content img.selected-media').forEach((item) => item.classList.remove('selected-media'));
  if (selectedEditorImage) selectedEditorImage.classList.add('selected-media');
  $('#editor-media-tools')?.classList.toggle('hidden', !selectedEditorImage);
}
async function uploadAdminMedia(file) {
  const form = new FormData();
  form.append('file', file);
  const response = await fetch('/api/uploads', { method: 'POST', body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '文件上传失败');
  return data;
}
async function replaceSelectedEditorImage(file) {
  if (!selectedEditorImage || !file) return;
  $('#replace-editor-image').disabled = true;
  try {
    const data = await uploadAdminMedia(file);
    selectedEditorImage.src = data.url;
    selectedEditorImage.alt = file.name;
    selectedEditorImage.dataset.assetName = file.name;
    $('#save-status').textContent = '图片已替换，保存文章后生效。';
    renderPostPreview();
  } catch (error) {
    $('#save-status').textContent = error.message;
  } finally {
    $('#replace-editor-image').disabled = false;
    $('#replace-image-file').value = '';
  }
}
async function importHtmlDocument(file) {
  if (!file) return;
  const isHtml = /\.html?$/i.test(file.name) || ['text/html', 'application/xhtml+xml'].includes(file.type);
  if (!isHtml) throw new Error('请选择 .html 或 .htm 文件');
  if (file.size > 5 * 1024 * 1024) throw new Error('HTML 文件不能超过 5 MB');
  const raw = await file.text();
  const doc = new DOMParser().parseFromString(raw, 'text/html');
  const importedTitle = doc.title.trim() || doc.querySelector('h1')?.textContent.trim() || '';
  const content = sanitizePreviewMarkup(doc.body.innerHTML);
  $('#post-content').innerHTML = content;
  if (!$('#post-title').value.trim() && importedTitle) $('#post-title').value = importedTitle;
  $('#post-format').value = 'html';
  $('#html-import-status').textContent = `已导入 ${file.name}`;
  $('#html-import-status').classList.add('success');
  refreshAdminToc();
  renderPostPreview();
}

function setLoggedIn(value) { $('#login-panel').classList.toggle('hidden', value); $('#editor-panel').classList.toggle('hidden', !value); }
function renderThemeIcon() {
  const dark = document.documentElement.dataset.theme === 'dark';
  const button = $('#theme-toggle');
  button.setAttribute('aria-label', '切换深浅色'); button.title = '切换深浅色'; button.setAttribute('aria-pressed', String(dark)); button.classList.add('icon-only');
  button.innerHTML = `<mdui-icon name="${dark ? 'brightness_2' : 'brightness_low'}"></mdui-icon>`;
}
function safePostCover(value) {
  const url = String(value || '');
  return /^(?:https?:\/\/|\/uploads\/[a-f0-9]{32}\.(?:jpg|jpeg|png|gif|webp)$)/i.test(url) ? url : '';
}
function renderPostCoverPreview(value) {
  const url = safePostCover(value);
  const preview = $('#post-cover-preview');
  const image = preview.querySelector('img');
  const label = preview.querySelector('span');
  image.classList.toggle('hidden', !url);
  label.classList.toggle('hidden', Boolean(url));
  if (url) image.src = url;
  else image.removeAttribute('src');
}
function setPostCoverStatus(message, state = '') {
  const status = $('#post-cover-status');
  status.textContent = message;
  status.classList.toggle('success', state === 'success');
  status.classList.toggle('error', state === 'error');
}
const COVER_CROP_WIDTH = 1600;
const COVER_CROP_HEIGHT = 900;
function setCoverCropStatus(message, state = '') {
  const status = $('#post-cover-crop-status');
  status.textContent = message;
  status.classList.toggle('success', state === 'success');
  status.classList.toggle('error', state === 'error');
}
function clampCoverCrop() {
  if (!coverCropState) return;
  const stage = $('#post-cover-crop-stage');
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const imageWidth = coverCropState.image.naturalWidth * coverCropState.scale;
  const imageHeight = coverCropState.image.naturalHeight * coverCropState.scale;
  coverCropState.x = Math.min(0, Math.max(width - imageWidth, coverCropState.x));
  coverCropState.y = Math.min(0, Math.max(height - imageHeight, coverCropState.y));
}
function renderCoverCrop() {
  if (!coverCropState) return;
  clampCoverCrop();
  const image = $('#post-cover-crop-image');
  image.style.width = `${coverCropState.image.naturalWidth * coverCropState.scale}px`;
  image.style.height = `${coverCropState.image.naturalHeight * coverCropState.scale}px`;
  image.style.transform = `translate3d(${coverCropState.x}px,${coverCropState.y}px,0)`;
}
function layoutCoverCrop() {
  if (!coverCropState) return;
  const stage = $('#post-cover-crop-stage');
  const width = stage.clientWidth;
  const height = stage.clientHeight;
  const fit = Math.max(width / coverCropState.image.naturalWidth, height / coverCropState.image.naturalHeight);
  coverCropState.baseScale = fit;
  coverCropState.zoom = 1;
  coverCropState.scale = fit;
  coverCropState.x = (width - coverCropState.image.naturalWidth * fit) / 2;
  coverCropState.y = (height - coverCropState.image.naturalHeight * fit) / 2;
  $('#post-cover-crop-zoom').value = '100';
  $('#post-cover-crop-zoom-value').textContent = '100%';
  renderCoverCrop();
}
function closeCoverCrop() {
  const dialog = $('#post-cover-crop-dialog');
  if (dialog.open) dialog.close();
  coverCropState = null;
  $('#post-cover-crop-image').removeAttribute('src');
  $('#post-cover-file').value = '';
}
function openCoverCrop(file) {
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    setPostCoverStatus('请选择 JPG、PNG、GIF 或 WebP 图片。', 'error');
    return;
  }
  if (file.size > 12 * 1024 * 1024) {
    setPostCoverStatus('封面文件不能超过 12 MB。', 'error');
    return;
  }
  const dialog = $('#post-cover-crop-dialog');
  const image = $('#post-cover-crop-image');
  const objectUrl = URL.createObjectURL(file);
  image.onload = () => {
    coverCropState = { image, zoom: 1, baseScale: 1, scale: 1, x: 0, y: 0, pointerId: null };
    setCoverCropStatus('');
    dialog.showModal();
    requestAnimationFrame(layoutCoverCrop);
    URL.revokeObjectURL(objectUrl);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    coverCropState = null;
    setPostCoverStatus('图片读取失败，请更换文件。', 'error');
  };
  image.src = objectUrl;
}
async function uploadCroppedCover(blob) {
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg';
  const file = new File([blob], `article-cover-${Date.now()}.${extension}`, { type: blob.type });
  const body = new FormData();
  body.append('file', file);
  const response = await fetch('/api/uploads', { method: 'POST', body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '封面上传失败');
  return data.url;
}
function refreshAdminToc() {
  const editor = $('#post-content');
  const list = $('#admin-toc-list');
  if (!editor || !list) return;
  const format = $('#post-format')?.value || 'html';
  const headings = format === 'markdown'
    ? [...editor.innerText.matchAll(/^(#{1,4})\s+(.+)$/gm)].map((match, index) => ({ level: match[1].length + 1, title: match[2].trim(), index })).filter((item) => item.title)
    : [...editor.querySelectorAll('h2,h3,h4')].map((heading, index) => ({ level: Number(heading.tagName.slice(1)), title: heading.textContent.trim(), element: heading, index })).filter((item) => item.title);
  list.innerHTML = headings.length ? headings.map((heading) => `<button type="button" class="level-${heading.level}" data-admin-toc-index="${heading.index}" data-no-icon><span>${String(heading.index + 1).padStart(2, '0')}</span>${escapeHtml(heading.title)}</button>`).join('') : '<p>正文中还没有 H2 / H3 / H4 标题。文章目录会根据这些标题自动生成。</p>';
  list.querySelectorAll('[data-admin-toc-index]').forEach((button) => {
    button.onclick = () => {
      const heading = headings[Number(button.dataset.adminTocIndex)];
      if (heading?.element) {
        heading.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heading.element.setAttribute('tabindex', '-1');
        heading.element.focus({ preventScroll: true });
      } else {
        editor.focus();
      }
    };
  });
}
function fillForm(post) {
  selectedId = post?.id || null; selectedPinned = Boolean(post?.pinned); selectedCarousel = Boolean(post?.carousel); $('#editor-eyebrow').textContent = post ? 'EDIT STORY' : 'NEW STORY'; $('#editor-title').textContent = post ? '编辑文章' : '写一篇新文章'; $('#post-title').value = post?.title || ''; $('#post-excerpt').value = post?.excerpt || ''; $('#post-cover-url').value = post?.cover_url || ''; renderPostCoverPreview(post?.cover_url); $('#post-content').innerHTML = post?.format === 'markdown' ? escapeHtml(post.source_content || '') : (post?.content || ''); $('#post-tags').value = (post?.tags || []).join(', '); $('#post-category').value = post?.category || ''; $('#post-author').value = post?.author || 'StarIsle'; $('#post-slug').value = post?.slug || ''; $('#post-format').value = post?.format || 'html'; $('#post-scheduled').value = post?.scheduled_at ? post.scheduled_at.slice(0, 16) : ''; $('#post-published').checked = Boolean(post?.published); $('#delete-post').hidden = !post; $('#pin-post').hidden = !post; $('#carousel-post').hidden = !post; $('#pin-post').classList.toggle('active', selectedPinned); $('#pin-post').textContent = selectedPinned ? '取消置顶' : '置顶文章'; $('#carousel-post').classList.toggle('active', selectedCarousel); $('#carousel-post').textContent = selectedCarousel ? '移出首页轮播' : '加入首页轮播'; $('#save-status').textContent = ''; window.MaterialSelect?.refreshAll();
  refreshAdminToc();
  showEditorImageTools(null);
  renderPostPreview();
}
function renderList() {
  $('#admin-post-list').innerHTML = posts.length ? posts.map((post) => `<button class="sidebar-post ${post.id === selectedId ? 'selected' : ''}" type="button" data-id="${escapeHtml(post.id)}" aria-pressed="${post.id === selectedId}"><span class="status-dot ${post.published ? 'published' : ''}"></span><span><strong>${post.pinned ? '置顶 · ' : ''}${escapeHtml(post.title)}</strong><small>${post.carousel ? '轮播 · ' : ''}${post.published ? '已发布' : '草稿'} · ${escapeHtml(post.category || '未分类')}</small></span><span class="sidebar-post-state" aria-hidden="true">${post.id === selectedId ? '当前' : ''}</span></button>`).join('') : '<div class="empty-sidebar">暂无文章</div>';
  document.querySelectorAll('.sidebar-post').forEach((button) => button.onclick = () => { fillForm(posts.find((post) => post.id === button.dataset.id)); renderList(); openAdminFold('writing'); });
  BlogIcons.iconize($('#admin-post-list'));
  requestAnimationFrame(() => {
    const list = $('#admin-post-list');
    const selected = list.querySelector('.sidebar-post.selected');
    if (selected && list.scrollWidth > list.clientWidth) selected.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  });
}
function previewHomeTheme() {
  if (!homeThemeCatalog) return;
  const selected = $('#home-theme-select').value;
  const theme = selected === 'auto' ? homeThemeCatalog.active : homeThemeCatalog.themes.find(item => item.key === selected);
  if (!theme) return;
  SolarThemes.render($('#home-theme-preview'), theme, 'zh');
  $('#home-theme-preview-label').textContent = `${theme.label} · ${theme.label_en}`;
  $('#home-theme-preview-title').textContent = theme.title;
  $('#home-theme-preview-description').textContent = theme.description;
  $('#home-theme-active').textContent = `当前已应用：${homeThemeCatalog.selected === 'auto' ? '自动 · ' : '手动 · '}${homeThemeCatalog.active.label}。${selected !== homeThemeCatalog.selected ? '此处为预览，点击“应用主题”后生效。' : '访客首页正在使用此主题。'}`;
}
function renderHomeThemes(data) {
  homeThemeCatalog = data;
  const select = $('#home-theme-select');
  const groups = [
    ['solar', 'spring', '节气 · 春 / Solar Terms · Spring'],
    ['solar', 'summer', '节气 · 夏 / Solar Terms · Summer'],
    ['solar', 'autumn', '节气 · 秋 / Solar Terms · Autumn'],
    ['solar', 'winter', '节气 · 冬 / Solar Terms · Winter'],
    ['traditional', null, '传统节日 / Traditional Festivals'],
    ['world', null, '世界节日 / World Festivals'],
  ].filter((group) => CONTENT_WORKSPACE ? ['writing', 'article-comments'].includes(group.id) : !['writing', 'article-comments'].includes(group.id));
  select.innerHTML = '<option value="auto">自动随节气切换（北京时间）</option>' + groups.map(([category, season, label]) => `<optgroup label="${label}">${data.themes.filter(theme => theme.category === category && (!season || theme.season === season)).map(theme => `<option value="${escapeHtml(theme.key)}">${escapeHtml(theme.label)} · ${escapeHtml(theme.label_en)}</option>`).join('')}</optgroup>`).join('');
  select.value = data.selected;
  previewHomeTheme();
}
async function loadHomeThemes() {
  try {
    const response = await fetch('/api/admin/themes');
    if (!response.ok) throw new Error('主题配置读取失败');
    renderHomeThemes(await response.json());
  } catch (error) { $('#home-theme-status').textContent = error.message || '主题配置读取失败，请刷新后重试。'; }
}
function setAccountSettingsStatus(message, isError = false) {
  const status = $('#account-settings-status');
  status.textContent = message;
  status.classList.toggle('error', isError);
}
async function loadAdminAccount() {
  try {
    const response = await fetch('/api/admin/account');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '管理员账号读取失败');
    $('#admin-username').value = data.username || '';
    $('#account-current-username').textContent = `当前账号：${data.username || '未命名'}`;
  } catch (error) {
    setAccountSettingsStatus(error.message || '管理员账号读取失败，请刷新后重试。', true);
  }
}
$('#account-settings-toggle').onclick = () => {
  openAdminFold('security');
  const form = $('#admin-account-form');
  form.classList.remove('hidden');
  $('#account-settings-toggle').setAttribute('aria-expanded', 'true');
  setAccountSettingsStatus('');
  requestAnimationFrame(() => $('#admin-username').focus());
};
$('#admin-account-form').onsubmit = async event => {
  event.preventDefault();
  const button = $('#save-admin-account');
  const status = $('#account-settings-status');
  const newPassword = $('#admin-new-password').value;
  if (newPassword !== $('#admin-confirm-password').value) {
    setAccountSettingsStatus('两次输入的新密码不一致', true);
    $('#admin-confirm-password').focus();
    return;
  }
  button.disabled = true;
  setAccountSettingsStatus('正在保存账号设置…');
  try {
    const response = await fetch('/api/admin/account', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: $('#admin-username').value,
        current_password: $('#admin-current-password').value,
        new_password: newPassword,
        confirm_password: $('#admin-confirm-password').value,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '账号设置保存失败');
    setAccountSettingsStatus('账号设置已保存，正在使用新凭据重新登录…');
    await showAdminSaveDialog('账号设置已保存', '新的管理员凭据已经生效。关闭提示后将重新加载管理页。');
    location.reload();
  } catch (error) {
    setAccountSettingsStatus(error.message || '网络异常，账号设置保存失败。', true);
    $('#admin-current-password').value = '';
    $('#admin-current-password').focus();
    button.disabled = false;
  }
};
$('#home-theme-select').onchange = () => { $('#home-theme-status').textContent = ''; previewHomeTheme(); };
$('#home-theme-form').onsubmit = async event => {
  event.preventDefault();
  const button = $('#save-home-theme'); button.disabled = true;
  const selected = $('#home-theme-select').value;
  $('#home-theme-status').textContent = '正在应用主题…';
  try {
    const response = await fetch('/api/admin/theme', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({theme:selected})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '主题保存失败');
    renderHomeThemes(data);
    $('#home-theme-status').textContent = `已应用${data.selected === 'auto' ? '自动节气模式，当前为' : '主题：'}${data.active.label}。刷新访客首页即可查看。`;
    showAdminSaveDialog('主题设置已保存', '新的首页主题已经应用。刷新访客首页即可查看完整效果。');
  } catch (error) { $('#home-theme-status').textContent = error.message || '网络异常，主题保存失败。'; }
  finally { button.disabled = false; }
};
$('#save-home-theme').insertAdjacentHTML('afterbegin', BlogIcons.svg('check'));
function renderReports() {
  $('#admin-report-list').innerHTML = adminReports.length ? adminReports.map((report) => {
    const targetUser = report.target_user;
    const comment = report.target_comment;
    const open = report.status === 'open';
    const targetLabel = report.target_type === 'comment' ? '评论' : '用户';
    return `<article class="admin-report-card" data-report-id="${escapeHtml(report.id)}">
      <header><div><span class="status-chip ${open ? 'warning' : ''}">${reportStatusLabels[report.status] || escapeHtml(report.status)}</span><h3>${targetLabel}举报 · ${escapeHtml(reportReasonLabels[report.reason] || report.reason)}</h3></div><span class="admin-report-meta">${formatAdminDate(report.created_at)}</span></header>
      <div class="admin-report-meta"><span>举报人：${escapeHtml(report.reporter?.username || (String(report.reporter_id || '').startsWith('anonymous:') ? '匿名访客' : '已注销用户'))}</span><span>被举报用户：${escapeHtml(targetUser?.username || '已注销用户')}</span>${comment ? `<span>评论 ID：${escapeHtml(comment.id)}</span>` : ''}</div>
      ${comment ? `<blockquote class="admin-report-quote">${escapeHtml(comment.content || '')}</blockquote>` : ''}
      ${report.details ? `<p><b>补充说明：</b>${escapeHtml(report.details)}</p>` : ''}
      ${open && targetUser ? `<div class="admin-moderation-form"><select data-moderation-hours aria-label="禁言时长"><option value="1">禁言 1 小时</option><option value="24" selected>禁言 24 小时</option><option value="168">禁言 7 天</option><option value="720">禁言 30 天</option></select><input data-moderation-reason maxlength="300" placeholder="处置原因（禁言或封禁时必填）"><span class="muted">禁言仍可登录与浏览</span></div><div class="admin-card-actions"><button class="filled-button" data-report-action="mute" data-user-id="${escapeHtml(targetUser.id)}">禁言</button><button class="outlined-button danger-text" data-report-action="ban" data-user-id="${escapeHtml(targetUser.id)}">封禁账号</button><button class="tonal-button" data-report-action="resolve">标记已处理</button><button class="text-button" data-report-action="dismiss">驳回举报</button>${comment && comment.approved ? `<button class="text-button danger-text" data-report-action="delete-comment" data-comment-id="${escapeHtml(comment.id)}">删除违规评论</button>` : ''}</div>` : ''}
      <p class="save-status" data-report-status role="status"></p>
    </article>`;
  }).join('') : '<div class="admin-empty">暂无举报记录</div>';
  BlogIcons.iconize($('#admin-report-list'));
  document.querySelectorAll('#admin-report-list [data-report-action]').forEach((button) => {
    button.onclick = async () => {
      const card = button.closest('.admin-report-card');
      const report = adminReports.find((item) => item.id === card.dataset.reportId);
      const status = card.querySelector('[data-report-status]');
      const action = button.dataset.reportAction;
      if (!report) return;
      if (action === 'ban' && !(await showAdminDialog({ title: '封禁用户', message: `确定封禁用户“${report.target_user?.username || ''}”吗？`, confirmText: '封禁', danger: true }))) return;
      if (action === 'delete-comment' && !(await showAdminDialog({ title: '删除评论', message: '确定删除这条被举报评论及其直接回复吗？', confirmText: '删除', danger: true }))) return;
      button.disabled = true;
      status.textContent = '正在处理…';
      try {
        if (action === 'resolve' || action === 'dismiss') {
          await resolveReport(report.id, action);
        } else if (action === 'delete-comment') {
          const response = await fetch(`/api/admin/comments/${encodeURIComponent(button.dataset.commentId)}`, { method: 'DELETE' });
          if (!response.ok) throw new Error('评论删除失败');
          await resolveReport(report.id, 'resolve');
        } else {
          const reason = card.querySelector('[data-moderation-reason]').value.trim();
          if (reason.length < 2) throw new Error('请填写至少 2 个字符的处置原因');
          const hours = Number(card.querySelector('[data-moderation-hours]').value) || 24;
          await runUserModeration(button.dataset.userId, action, reason, action === 'mute' ? hours : 0);
        }
        await Promise.all([loadReports(), loadUsers(), loadComments()]);
      } catch (error) {
        status.textContent = error.message || '处理失败，请稍后重试';
        button.disabled = false;
      }
    };
  });
}
async function loadReports() {
  const response = await fetch('/api/admin/reports');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '举报队列读取失败');
  adminReports = data.reports || [];
  renderReports();
}
function renderFriendApplications() {
  $('#admin-friend-application-list').innerHTML = adminFriendApplications.length ? adminFriendApplications.map((application) => {
    const pending = application.status === 'pending';
    return `<article class="admin-report-card" data-friend-application-id="${escapeHtml(application.id)}">
      <header><div><span class="status-chip ${pending ? 'warning' : ''}">${pending ? '待审批' : application.status === 'approved' ? '已通过' : '已驳回'}</span><h3>${escapeHtml(application.name)}</h3></div><span class="admin-report-meta">${formatAdminDate(application.created_at)}</span></header>
      <p>${escapeHtml(application.description || '未填写简介')}</p>
      <div class="admin-user-meta"><a href="${escapeHtml(application.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(application.url)}</a><span>邮箱：${escapeHtml(application.email || '未填写')}</span></div>
      ${pending ? `<div class="admin-card-actions"><button class="filled-button" data-no-icon data-friend-application-action="approve">通过并添加</button><button class="outlined-button danger-text" data-no-icon data-friend-application-action="reject">驳回</button></div>` : ''}
      <p class="save-status" data-friend-application-status role="status"></p>
    </article>`;
  }).join('') : '<div class="admin-empty">暂无友链申请</div>';
  BlogIcons.iconize($('#admin-friend-application-list'));
  document.querySelectorAll('#admin-friend-application-list [data-friend-application-action]').forEach((button) => {
    button.onclick = async () => {
      const card = button.closest('[data-friend-application-id]');
      const status = card.querySelector('[data-friend-application-status]');
      const action = button.dataset.friendApplicationAction;
      button.disabled = true;
      status.textContent = action === 'approve' ? '正在通过并添加…' : '正在驳回…';
      try {
        const response = await fetch(`/api/admin/friend-applications/${encodeURIComponent(card.dataset.friendApplicationId)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '友链审批失败');
        await loadFriendApplications();
        if (action === 'approve') {
          const updatedStatus = document.querySelector(`[data-friend-application-id="${card.dataset.friendApplicationId}"] [data-friend-application-status]`);
          if (updatedStatus) updatedStatus.textContent = data.email_sent ? '已通过并发送邮箱通知' : '已通过，但邮箱通知发送失败';
        }
      } catch (error) {
        status.textContent = error.message || '友链审批失败';
        button.disabled = false;
      }
    };
  });
}
async function loadFriendApplications() {
  try {
    const response = await fetch('/api/admin/friend-applications');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '友链申请读取失败');
    adminFriendApplications = data.applications || [];
    renderFriendApplications();
  } catch (error) {
    $('#admin-friend-application-list').innerHTML = `<div class="admin-empty">${escapeHtml(error.message)}</div>`;
  }
}
function renderThoughtImagePreviews() {
  const host = $('#thought-image-previews');
  if (!host) return;
  host.innerHTML = thoughtImageUrls.map((url, index) => `<div class="thought-image-preview-item"><img src="${escapeHtml(url)}" alt="日常照片预览 ${index + 1}"><button class="thought-image-remove" type="button" data-thought-image-remove="${index}" data-no-icon aria-label="移除第 ${index + 1} 张照片">×</button></div>`).join('');
  $('#clear-thought-image').disabled = !thoughtImageUrls.length;
  $('#upload-thought-image').disabled = thoughtImageUrls.length >= MAX_ADMIN_GALLERY_IMAGES;
}
function setThoughtImages(values) {
  thoughtImageUrls = [...new Set((Array.isArray(values) ? values : [values]).map(safeAdminMedia).filter(Boolean))].slice(0, MAX_ADMIN_GALLERY_IMAGES);
  $('#thought-image-urls').value = JSON.stringify(thoughtImageUrls);
  renderThoughtImagePreviews();
}
function renderAdminThoughts() {
  $('#admin-thought-list').innerHTML = adminThoughts.length ? adminThoughts.map((thought) => {
    const gallery = adminGalleryMarkup(adminGalleryUrls(thought), 'admin-thought-gallery', '日常照片');
    return `<article class="admin-report-card" data-thought-id="${escapeHtml(thought.id)}"><header><div><span class="status-chip ${thought.published ? '' : 'warning'}">${thought.published ? '已发布' : '草稿'}</span><h3>${escapeHtml(thought.mood || '日常')}</h3></div><span class="admin-report-meta">${formatAdminDate(thought.created_at)}</span></header>${thought.content ? `<p>${escapeHtml(thought.content)}</p>` : ''}${gallery}<div class="admin-card-actions"><button class="tonal-button" data-no-icon data-thought-action="edit">编辑</button><button class="outlined-button" data-no-icon data-thought-action="toggle">${thought.published ? '设为草稿' : '公开发布'}</button><button class="text-button danger-text" data-no-icon data-thought-action="delete">删除</button></div><p class="save-status" data-thought-status role="status"></p></article>`;
  }).join('') : '<div class="admin-empty">还没有日常记录</div>';
  document.querySelectorAll('#admin-thought-list [data-thought-action]').forEach((button) => {
    button.onclick = async () => {
      const card = button.closest('[data-thought-id]');
      const thought = adminThoughts.find((item) => item.id === card.dataset.thoughtId);
      const action = button.dataset.thoughtAction;
      const status = card.querySelector('[data-thought-status]');
      if (action === 'edit') {
        editingThoughtId = thought.id;
        $('#thought-content').value = thought.content || '';
        setThoughtImages(adminGalleryUrls(thought));
        $('#thought-mood').value = thought.mood || '日常';
        $('#thought-published').checked = Boolean(thought.published);
        $('#save-thought').textContent = '保存修改';
        $('#cancel-thought-edit').classList.remove('hidden');
        $('#thought-content').focus();
        return;
      }
      if (action === 'delete' && !(await showAdminDialog({ title: '删除日常', message: '确定删除这条日常记录吗？此操作无法撤销。', confirmText: '删除', danger: true }))) return;
      button.disabled = true;
      try {
        let response;
        if (action === 'delete') {
          response = await fetch(`/api/admin/thoughts/${encodeURIComponent(thought.id)}`, { method: 'DELETE' });
        } else {
          response = await fetch(`/api/admin/thoughts/${encodeURIComponent(thought.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: !thought.published }),
          });
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '日常更新失败');
        await loadAdminThoughts();
        showAdminSaveFeedback(action === 'delete' ? '日常已删除' : thought.published ? '日常已设为草稿' : '日常已发布');
      } catch (error) {
        status.textContent = error.message || '日常更新失败';
        button.disabled = false;
      }
    };
  });
}
async function loadAdminThoughts() {
  try {
    const response = await fetch('/api/thoughts');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '日常读取失败');
    adminThoughts = data.thoughts || [];
    renderAdminThoughts();
  } catch (error) {
    $('#admin-thought-list').innerHTML = `<div class="admin-empty">${escapeHtml(error.message)}</div>`;
  }
}
function resetThoughtEditor() {
  editingThoughtId = '';
  $('#admin-thought-form').reset();
  setThoughtImages([]);
  $('#thought-mood').value = '日常';
  $('#thought-published').checked = true;
  $('#save-thought').textContent = '添加日常';
  $('#save-thought').disabled = false;
  $('#cancel-thought-edit').classList.add('hidden');
  $('#thought-editor-status').textContent = '';
}
function resetAnnouncementEditor() {
  editingAnnouncementId = '';
  $('#announcement-form').reset();
  $('#announcement-published').checked = true;
  $('#save-announcement').textContent = '发布公告';
  $('#cancel-announcement-edit').classList.add('hidden');
  $('#announcement-editor-status').textContent = '';
}
function renderAdminAnnouncements() {
  $('#admin-announcement-list').innerHTML = adminAnnouncements.length ? adminAnnouncements.map((announcement) => {
    const source = announcement.source === 'legal' ? '条款自动公告' : '手动公告';
    return `<article class="admin-report-card admin-announcement-card" data-announcement-id="${escapeHtml(announcement.id)}"><header><div><span class="status-chip ${announcement.published ? '' : 'warning'}">${announcement.published ? '已发布' : '草稿'}</span><span class="status-chip">${source}</span><h3>${escapeHtml(announcement.title_zh || announcement.title_en || '未命名公告')}</h3></div><span class="admin-report-meta">${formatAdminDate(announcement.updated_at || announcement.created_at)}</span></header><p>${escapeHtml(announcement.body_zh || announcement.body_en || '')}</p>${announcement.title_en || announcement.body_en ? `<details class="admin-announcement-en"><summary>英文版本</summary><strong>${escapeHtml(announcement.title_en || '')}</strong><p>${escapeHtml(announcement.body_en || '')}</p></details>` : ''}<div class="admin-card-actions"><button class="tonal-button" data-no-icon data-announcement-action="edit">编辑</button><button class="outlined-button" data-no-icon data-announcement-action="toggle">${announcement.published ? '转为草稿' : '立即发布'}</button><button class="text-button danger-text" data-no-icon data-announcement-action="delete">删除</button></div><p class="save-status" data-announcement-status role="status"></p></article>`;
  }).join('') : '<div class="admin-empty">还没有网站公告</div>';
  document.querySelectorAll('#admin-announcement-list [data-announcement-action]').forEach((button) => {
    button.onclick = async () => {
      const card = button.closest('[data-announcement-id]');
      const announcement = adminAnnouncements.find((item) => item.id === card.dataset.announcementId);
      const action = button.dataset.announcementAction;
      const status = card.querySelector('[data-announcement-status]');
      if (!announcement) return;
      if (action === 'edit') {
        editingAnnouncementId = announcement.id;
        $('#announcement-form [name="title_zh"]').value = announcement.title_zh || '';
        $('#announcement-form [name="title_en"]').value = announcement.title_en || '';
        $('#announcement-form [name="body_zh"]').value = announcement.body_zh || '';
        $('#announcement-form [name="body_en"]').value = announcement.body_en || '';
        $('#announcement-published').checked = Boolean(announcement.published);
        $('#save-announcement').textContent = '保存修改';
        $('#cancel-announcement-edit').classList.remove('hidden');
        $('#announcement-form [name="title_zh"]').focus();
        return;
      }
      if (action === 'delete' && !(await showAdminDialog({ title: '删除公告', message: '确定删除这条网站公告吗？此操作无法撤销。', confirmText: '删除', danger: true }))) return;
      button.disabled = true;
      status.textContent = '正在更新…';
      try {
        let response;
        if (action === 'delete') {
          response = await fetch(`/api/admin/announcements/${encodeURIComponent(announcement.id)}`, { method: 'DELETE' });
        } else {
          response = await fetch(`/api/admin/announcements/${encodeURIComponent(announcement.id)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ published: !announcement.published }),
          });
        }
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '公告更新失败');
        await loadAdminAnnouncements();
        showAdminSaveFeedback(action === 'delete' ? '公告已删除' : announcement.published ? '公告已转为草稿' : '公告已发布');
      } catch (error) {
        status.textContent = error.message || '公告更新失败';
        button.disabled = false;
      }
    };
  });
}
async function loadAdminAnnouncements() {
  try {
    const response = await fetch('/api/admin/announcements');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '公告读取失败');
    adminAnnouncements = data.announcements || [];
    renderAdminAnnouncements();
  } catch (error) {
    $('#admin-announcement-list').innerHTML = `<div class="admin-empty">${escapeHtml(error.message || '公告读取失败')}</div>`;
  }
}
function setupAdminFolds() {
  const main = $('.editor-main');
  if (!main || $('.admin-fold')) return;
  const overview = $('.admin-overview');
  const groups = [
    { id: 'writing', title: '内容创作', description: '文章编辑与发布', nodes: [$('.editor-head'), $('#post-form')], open: true },
    { id: 'thoughts', title: '日常', description: '日常记录、照片与发布状态', nodes: [$('.admin-thoughts')] },
    { id: 'announcements', title: '网站公告', description: '手动公告、草稿与条款自动公告', nodes: [$('.admin-announcements')] },
    { id: 'article-comments', title: '文章评论', description: '文章评论审核、置顶与删除', nodes: [$('[data-comment-section="article"]')] },
    { id: 'guestbook', title: '留言区', description: '关于页留言审核与回复管理', nodes: [$('[data-comment-section="guestbook"]')] },
    { id: 'reports', title: '举报队列', description: '处理举报与账号违规', nodes: [$('.admin-reports')] },
    { id: 'users', title: '用户账号', description: '用户资料、禁言与封禁', nodes: [$('.admin-users')] },
    { id: 'friends', title: '友链审核', description: '审批或驳回友链申请', nodes: [$('.admin-friend-applications')] },
    { id: 'site', title: '站点与主题', description: '首页主题、站点文案和收款配置', nodes: [$('.theme-settings'), $('#site-profile-form')] },
    { id: 'about', title: '关于页内容', description: '介绍、称呼、互动文案与标签', nodes: [$('#about-admin-panel')] },
    { id: 'security', title: '账号安全', description: '管理员名称与密码', nodes: [$('#admin-account-form')] },
  ];
  const visibleGroups = groups.filter((group) => CONTENT_WORKSPACE
    ? ['writing', 'article-comments'].includes(group.id)
    : group.id !== 'writing');
  for (const group of visibleGroups) {
    const details = document.createElement('details');
    details.className = 'admin-fold surface';
    details.id = `admin-fold-${group.id}`;
    details.open = Boolean(group.open);
    const summary = document.createElement('summary');
    summary.innerHTML = `<span class="admin-fold-copy"><strong>${group.title}</strong><small>${group.description}</small></span><span class="admin-fold-chevron" aria-hidden="true"></span>`;
    const body = document.createElement('div');
    body.className = 'admin-fold-body';
    for (const node of group.nodes) if (node) body.append(node);
    details.append(summary, body);
    main.append(details);
    details.addEventListener('toggle', () => {
      document.querySelectorAll(`[data-admin-jump="${group.id}"]`).forEach((button) => {
        button.setAttribute('aria-expanded', String(details.open));
        button.classList.toggle('active', details.open);
      });
      if (!details.open) return;
      document.querySelectorAll('.admin-fold').forEach((other) => {
        if (other !== details && !(CONTENT_WORKSPACE && other.id === 'admin-fold-writing')) other.open = false;
      });
    });
  }
  if (!CONTENT_WORKSPACE) {
    $('#site-profile-form')?.classList.remove('hidden');
    const heading = $('.admin-page-heading');
    if (heading) main.prepend(heading);
    const logout = $('#logout');
    logout.classList.remove('logout-button');
    logout.setAttribute('data-no-icon', '');
    logout.removeAttribute('data-icon');
    logout.textContent = '退出';
    $('.topbar').append(logout);
  }
}
function openAdminFold(id) {
  const fold = $(`#admin-fold-${id}`);
  if (fold) fold.open = true;
}
function setupAdminQuickNav() {
  document.querySelectorAll('[data-admin-jump]').forEach((button) => {
    button.setAttribute('aria-controls', `admin-fold-${button.dataset.adminJump}`);
    button.setAttribute('aria-expanded', 'false');
    button.onclick = () => {
      const fold = $(`#admin-fold-${button.dataset.adminJump}`);
      if (!fold) return;
      fold.open = true;
      requestAnimationFrame(() => fold.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    };
  });
}
function renderUsers() {
  $('#admin-user-list').innerHTML = adminUsers.length ? adminUsers.map((user) => {
    const banned = Boolean(user.banned);
    const muted = Boolean(user.muted);
    const actions = banned
      ? '<button class="outlined-button" data-user-action="unban">解除封禁</button>'
      : `<select data-user-hours aria-label="${escapeHtml(user.username)}的禁言时长"><option value="1">1 小时</option><option value="24" selected>24 小时</option><option value="168">7 天</option><option value="720">30 天</option></select><input data-user-reason maxlength="300" placeholder="禁言或封禁原因（必填）"><button class="filled-button" data-user-action="mute">禁言</button><button class="outlined-button danger-text" data-user-action="ban">封禁账号</button>${muted ? '<button class="text-button" data-user-action="unmute">解除禁言</button>' : ''}`;
    return `<article class="admin-user-card" data-user-id="${escapeHtml(user.id)}">
      <header><div class="admin-user-identity">${adminAvatarMarkup(user)}<div><h3>${escapeHtml(user.username)}</h3><p>${escapeHtml(user.email || '')}</p></div></div><div class="profile-status-row">${banned ? '<span class="status-chip danger">已封禁</span>' : muted ? '<span class="status-chip warning">禁言中</span>' : '<span class="status-chip">正常</span>'}</div></header>
      <div class="admin-user-meta"><span>加入：${formatAdminDate(user.created_at)}</span><span>评论：${Number(user.comment_count || 0)}</span>${muted && user.muted_until ? `<span>禁言至：${formatAdminDate(user.muted_until)}</span>` : ''}${user.signature ? `<span>签名：${escapeHtml(user.signature)}</span>` : ''}</div>
      ${user.moderation_reason ? `<p><b>最近处置原因：</b>${escapeHtml(user.moderation_reason)}</p>` : ''}
      <div class="admin-moderation-form">${actions}</div><p class="save-status" data-user-status role="status"></p>
    </article>`;
  }).join('') : '<div class="admin-empty">暂无注册用户</div>';
  BlogIcons.iconize($('#admin-user-list'));
  document.querySelectorAll('#admin-user-list [data-user-action]').forEach((button) => {
    button.onclick = async () => {
      const card = button.closest('.admin-user-card');
      const user = adminUsers.find((item) => item.id === card.dataset.userId);
      const status = card.querySelector('[data-user-status]');
      const action = button.dataset.userAction;
      const reasonInput = card.querySelector('[data-user-reason]');
      const reason = reasonInput?.value.trim() || '';
      if (['mute', 'ban'].includes(action) && reason.length < 2) {
        status.textContent = '请填写至少 2 个字符的处置原因';
        reasonInput?.focus();
        return;
      }
      if (action === 'ban' && !(await showAdminDialog({ title: '封禁账号', message: `封禁后“${user.username}”的所有现有会话将立即失效，确定继续吗？`, confirmText: '封禁', danger: true }))) return;
      button.disabled = true;
      status.textContent = '正在更新账号状态…';
      try {
        const hours = Number(card.querySelector('[data-user-hours]')?.value) || 24;
        await runUserModeration(user.id, action, reason, action === 'mute' ? hours : 0);
        await Promise.all([loadUsers(), loadReports()]);
      } catch (error) {
        status.textContent = error.message || '账号状态更新失败';
        button.disabled = false;
      }
    };
  });
}
async function loadUsers() {
  const response = await fetch('/api/admin/users');
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '用户列表读取失败');
  adminUsers = data.users || [];
  renderUsers();
}
function parseAboutTags(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string' || !value.trim()) return DEFAULT_ABOUT_TAGS.map((tag) => ({ ...tag }));
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((tag) => ({ zh: String(tag?.zh || '').trim().slice(0, 24), en: String(tag?.en || '').trim().slice(0, 36) }))
      .filter((tag) => tag.zh || tag.en)
      .slice(0, MAX_ABOUT_TAGS);
  } catch (_) {
    return [];
  }
}
function renderAboutTags() {
  const list = $('#about-tag-list');
  if (!list) return;
  list.innerHTML = aboutTags.map((tag, index) => `
    <article class="about-tag-item" data-tag-index="${index}">
      <span class="about-tag-index">${String(index + 1).padStart(2, '0')}</span>
      <span class="about-tag-copy"><strong>${escapeHtml(tag.zh || tag.en)}</strong><small>${escapeHtml(tag.en || '未填写英文标签')}</small></span>
      <span class="about-tag-actions">
        <button class="icon-button" type="button" data-tag-action="up" aria-label="上移标签" title="上移标签" ${index === 0 ? 'disabled' : ''} data-no-icon><mdui-icon name="arrow_upward" aria-hidden="true"></mdui-icon></button>
        <button class="icon-button" type="button" data-tag-action="down" aria-label="下移标签" title="下移标签" ${index === aboutTags.length - 1 ? 'disabled' : ''} data-no-icon><mdui-icon name="arrow_downward" aria-hidden="true"></mdui-icon></button>
        <button class="icon-button danger-text" type="button" data-tag-action="remove" aria-label="删除标签" title="删除标签" data-no-icon><mdui-icon name="delete" aria-hidden="true"></mdui-icon></button>
      </span>
    </article>`).join('');
  const data = $('#about-tag-data');
  if (data) data.value = JSON.stringify(aboutTags);
  const count = $('#about-tag-count');
  if (count) count.textContent = `${aboutTags.length} / ${MAX_ABOUT_TAGS}`;
  $('#about-tag-empty')?.classList.toggle('hidden', aboutTags.length > 0);
}
function populateAboutAdminForm(profile = {}) {
  const form = $('#about-page-admin-form');
  if (!form) return;
  form.querySelectorAll('[name]').forEach((input) => {
    const value = profile[input.name];
    input.value = typeof value === 'string' ? value : '';
  });
  aboutTags = parseAboutTags(profile.about_tags);
  renderAboutTags();
}
function addAboutTag() {
  const zh = $('#about-tag-zh')?.value.trim() || '';
  const en = $('#about-tag-en')?.value.trim() || '';
  const status = $('#about-tag-status');
  status?.classList.remove('error', 'success');
  if (!zh && !en) {
    status.textContent = '请至少填写一种语言的标签。';
    status?.classList.add('error');
    $('#about-tag-zh')?.focus();
    return;
  }
  if (aboutTags.length >= MAX_ABOUT_TAGS) {
    status.textContent = `最多添加 ${MAX_ABOUT_TAGS} 个标签。`;
    status?.classList.add('error');
    return;
  }
  if (aboutTags.some((tag) => tag.zh === zh && tag.en === en)) {
    status.textContent = '这个标签已经存在。';
    status?.classList.add('error');
    return;
  }
  aboutTags.push({ zh: zh.slice(0, 24), en: en.slice(0, 36) });
  $('#about-tag-zh').value = '';
  $('#about-tag-en').value = '';
  renderAboutTags();
  status.textContent = '标签已添加，保存后同步到关于页。';
  status?.classList.add('success');
  $('#about-tag-zh').focus();
}
$('#about-tag-add')?.addEventListener('click', addAboutTag);
$('#about-tag-zh')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); $('#about-tag-en').focus(); } });
$('#about-tag-en')?.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); addAboutTag(); } });
$('#about-tag-list')?.addEventListener('click', (event) => {
  const button = event.target.closest('[data-tag-action]');
  const item = button?.closest('[data-tag-index]');
  if (!button || !item) return;
  const index = Number(item.dataset.tagIndex);
  const action = button.dataset.tagAction;
  if (action === 'remove') aboutTags.splice(index, 1);
  if (action === 'up' && index > 0) [aboutTags[index - 1], aboutTags[index]] = [aboutTags[index], aboutTags[index - 1]];
  if (action === 'down' && index < aboutTags.length - 1) [aboutTags[index], aboutTags[index + 1]] = [aboutTags[index + 1], aboutTags[index]];
  renderAboutTags();
  const status = $('#about-tag-status');
  status.textContent = '标签顺序已更新，保存后同步到关于页。';
  status.classList.remove('error');
  status.classList.add('success');
});
async function loadAdminPostsData() {
  const response = await fetch('/api/posts?page=1&page_size=100', { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || '文章目录读取失败');
  const allPosts = Array.isArray(data.posts) ? [...data.posts] : [];
  const pages = Math.max(1, Number(data.pagination?.pages || 1));
  for (let page = 2; page <= pages; page += 1) {
    const pageResponse = await fetch(`/api/posts?page=${page}&page_size=100`, { cache: 'no-store' });
    const pageData = await pageResponse.json();
    if (!pageResponse.ok) throw new Error(pageData.error || '文章目录读取失败');
    allPosts.push(...(Array.isArray(pageData.posts) ? pageData.posts : []));
  }
  return { ...data, posts: allPosts };
}
async function load() {
  const data = await loadAdminPostsData(); adminCurrentTheme = data.theme || null; if (adminCurrentTheme) SolarThemes.apply(adminCurrentTheme, 'zh'); applyAdminAppearance(data.profile || {}); posts = data.posts || []; if (data.visitor_port) { const target = new URL(location.href); target.port = String(data.visitor_port); target.pathname = '/'; target.search = ''; target.hash = ''; $('#visitor-link').href = target.toString(); } setLoggedIn(true); if (!selectedId && posts.length) fillForm(posts[0]); renderList();
  const summary = await (await fetch('/api/admin/summary')).json(); $('#registered-count').textContent = summary.users; $('#published-count').textContent = summary.published; $('#view-count').textContent = summary.views; $('#comment-count').textContent = summary.comments; $('#like-count').textContent = summary.likes;
  Object.entries(summary.profile || {}).forEach(([key, value]) => { const input = $(`#site-profile-form [name="${key}"]`); if (input) input.value = typeof value === 'string' ? value : ''; }); populateAboutAdminForm(summary.profile || {}); window.MaterialSelect?.refreshAll(); await Promise.all(CONTENT_WORKSPACE ? [loadComments()] : [loadComments(),loadHomeThemes(),loadAdminAccount(),loadReports(),loadUsers(),loadFriendApplications(),loadAdminThoughts(),loadAdminAnnouncements()]); BlogIcons.iconize();
}
async function savePost() {
  const format = $('#post-format').value; const payload = { title: $('#post-title').value, excerpt: $('#post-excerpt').value, cover_url: $('#post-cover-url').value.trim(), content: format === 'markdown' ? $('#post-content').innerText : $('#post-content').innerHTML, format, tags: $('#post-tags').value.split(',').map((tag) => tag.trim()).filter(Boolean), category: $('#post-category').value, author: $('#post-author').value, slug: $('#post-slug').value, scheduled_at: $('#post-scheduled').value ? new Date($('#post-scheduled').value).toISOString() : '', published: $('#post-published').checked, pinned: selectedPinned, carousel: selectedCarousel };
  const response = await fetch(selectedId ? `/api/posts/${selectedId}` : '/api/posts', { method: selectedId ? 'PUT' : 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) }); const data = await response.json(); if (!response.ok) return $('#save-status').textContent = data.error || '保存失败'; selectedId = data.post.id; await load(); fillForm(data.post); renderList(); $('#save-status').textContent = '已保存'; showAdminSaveFeedback('文章已保存');
}
function saveEditorRange() {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return;
  const range = selection.getRangeAt(0);
  if ($('#post-content').contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
}
function restoreEditorRange() {
  const editor = $('#post-content'); editor.focus();
  if (!savedRange || !editor.contains(savedRange.commonAncestorContainer)) return null;
  const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(savedRange); return savedRange;
}
function insertNodeAtSelection(node) {
  const editor = $('#post-content'); const range = restoreEditorRange();
  if (range) { range.deleteContents(); range.insertNode(node); range.setStartAfter(node); range.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedRange = range.cloneRange(); }
  else { editor.append(node); }
}
async function insertFiles(files) {
  for (const file of files) {
    const form = new FormData(); form.append('file', file);
    const response = await fetch('/api/uploads', { method:'POST', body:form }); const result = await response.json();
    if (!response.ok) { $('#save-status').textContent = result.error || '文件上传失败'; continue; }
    const type = file.type || '';
    let node;
    if (type.startsWith('image/')) { node = document.createElement('img'); node.src = result.url; node.alt = file.name; node.loading = 'lazy'; node.style.maxWidth = '100%'; node.style.maxHeight = '70vh'; node.style.height = 'auto'; node.style.objectFit = 'contain'; }
    else if (type.startsWith('video/')) { node = document.createElement('video'); node.src = result.url; node.controls = true; node.preload = 'metadata'; }
    else if (type.startsWith('audio/')) { node = document.createElement('audio'); node.src = result.url; node.controls = true; node.preload = 'metadata'; }
    else { node = document.createElement('a'); node.href = result.url; node.textContent = file.name; node.title = file.name; }
    insertNodeAtSelection(node); $('#save-status').textContent = `已插入：${file.name}`;
  }
  $('#insert-file-input').value = '';
}
function createCodeBlock() {
  const range = restoreEditorRange();
  if (!range || range.collapsed) { $('#save-status').textContent = '请先选择要放入代码框的文本'; return; }
  const codeText = range.toString(); const block = document.createElement('pre'); block.className = 'macos-code'; const code = document.createElement('code'); code.textContent = codeText; block.append(code); range.deleteContents(); range.insertNode(block); range.setStartAfter(block); range.collapse(true); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); savedRange = range.cloneRange(); $('#post-format').value = 'html'; $('#post-content').focus();
}
function createInlineCode() {
  const range = restoreEditorRange();
  if (!range || range.collapsed) { $('#save-status').textContent = '请先选择要设置为行内代码的文本'; return; }
  const code = document.createElement('code');
  code.textContent = range.toString();
  range.deleteContents();
  range.insertNode(code);
  range.setStartAfter(code);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
  $('#post-format').value = 'html';
  $('#post-content').focus();
}
function insertHorizontalRule() {
  const range = restoreEditorRange();
  if (!range) return;
  const rule = document.createElement('hr');
  const after = document.createElement('p');
  after.append(document.createElement('br'));
  range.deleteContents();
  range.insertNode(rule);
  rule.after(after);
  range.setStart(after, 0);
  range.collapse(true);
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
  savedRange = range.cloneRange();
  $('#post-content').focus();
}
async function insertEditorLink() {
  const range = restoreEditorRange();
  if (!range) return;
  const label = range.toString().trim();
  const address = await showAdminDialog({
    title: '插入链接',
    message: label ? `为“${label}”设置链接地址。` : '输入链接地址，未选择文本时将使用地址作为显示文字。',
    prompt: true,
    placeholder: 'https://example.com',
    confirmText: '插入',
  });
  if (!address) return;
  const url = /^(?:https?:\/\/|mailto:)/i.test(address) ? address : `https://${address}`;
  restoreEditorRange();
  if (label) {
    document.execCommand('createLink', false, url);
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.textContent = address;
    range.insertNode(link);
    range.setStartAfter(link);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  }
  saveEditorRange();
  $('#post-format').value = 'html';
  $('#post-content').focus();
}
$('#save-post').onclick = (event) => { event.preventDefault(); savePost(); };
$('#post-cover-url').oninput = () => {
  const value = $('#post-cover-url').value.trim();
  const valid = Boolean(safePostCover(value));
  renderPostCoverPreview(value);
  setPostCoverStatus(!value ? '尚未设置封面' : valid ? '封面地址有效，保存文章后生效。' : '请输入 /uploads/ 图片地址或 http(s) 图片地址。', !value ? '' : valid ? 'success' : 'error');
};
$('#upload-post-cover').onclick = () => $('#post-cover-file').click();
$('#post-cover-file').onchange = () => {
  const file = $('#post-cover-file').files?.[0];
  if (!file) return;
  openCoverCrop(file);
};
$('#post-cover-crop-zoom').oninput = (event) => {
  if (!coverCropState) return;
  const stage = $('#post-cover-crop-stage');
  const oldScale = coverCropState.scale;
  const centerX = (stage.clientWidth / 2 - coverCropState.x) / oldScale;
  const centerY = (stage.clientHeight / 2 - coverCropState.y) / oldScale;
  const zoom = Number(event.target.value) / 100;
  coverCropState.zoom = zoom;
  coverCropState.scale = coverCropState.baseScale * zoom;
  coverCropState.x = stage.clientWidth / 2 - centerX * coverCropState.scale;
  coverCropState.y = stage.clientHeight / 2 - centerY * coverCropState.scale;
  $('#post-cover-crop-zoom-value').textContent = `${Math.round(zoom * 100)}%`;
  renderCoverCrop();
};
$('#post-cover-crop-stage').onpointerdown = (event) => {
  if (!coverCropState) return;
  coverCropState.pointerId = event.pointerId;
  coverCropState.startX = event.clientX;
  coverCropState.startY = event.clientY;
  coverCropState.originX = coverCropState.x;
  coverCropState.originY = coverCropState.y;
  event.currentTarget.setPointerCapture(event.pointerId);
  event.currentTarget.classList.add('dragging');
};
$('#post-cover-crop-stage').onpointermove = (event) => {
  if (!coverCropState || coverCropState.pointerId !== event.pointerId) return;
  coverCropState.x = coverCropState.originX + event.clientX - coverCropState.startX;
  coverCropState.y = coverCropState.originY + event.clientY - coverCropState.startY;
  renderCoverCrop();
};
$('#post-cover-crop-stage').onpointerup = (event) => {
  if (!coverCropState || coverCropState.pointerId !== event.pointerId) return;
  coverCropState.pointerId = null;
  event.currentTarget.classList.remove('dragging');
};
$('#post-cover-crop-stage').onpointercancel = (event) => {
  if (!coverCropState) return;
  coverCropState.pointerId = null;
  event.currentTarget.classList.remove('dragging');
};
$('#post-cover-crop-dialog').addEventListener('cancel', (event) => {
  event.preventDefault();
  closeCoverCrop();
});
$('#close-post-cover-crop').onclick = closeCoverCrop;
$('#cancel-post-cover-crop').onclick = closeCoverCrop;
window.addEventListener('resize', () => {
  if ($('#post-cover-crop-dialog').open) layoutCoverCrop();
});
$('#apply-post-cover-crop').onclick = async () => {
  if (!coverCropState) return;
  const button = $('#apply-post-cover-crop');
  const stage = $('#post-cover-crop-stage');
  button.disabled = true;
  setCoverCropStatus('正在生成 1600 × 900 封面…');
  try {
    const canvas = document.createElement('canvas');
    canvas.width = COVER_CROP_WIDTH;
    canvas.height = COVER_CROP_HEIGHT;
    const context = canvas.getContext('2d');
    const sourceX = Math.max(0, -coverCropState.x / coverCropState.scale);
    const sourceY = Math.max(0, -coverCropState.y / coverCropState.scale);
    const sourceWidth = Math.min(stage.clientWidth / coverCropState.scale, coverCropState.image.naturalWidth - sourceX);
    const sourceHeight = Math.min(stage.clientHeight / coverCropState.scale, coverCropState.image.naturalHeight - sourceY);
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(coverCropState.image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, COVER_CROP_WIDTH, COVER_CROP_HEIGHT);
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92));
    if (!blob) throw new Error('无法生成裁剪后的封面');
    setCoverCropStatus('正在上传裁剪后的封面…');
    const url = await uploadCroppedCover(blob);
    $('#post-cover-url').value = url;
    renderPostCoverPreview(url);
    setPostCoverStatus('封面已裁剪为 1600 × 900，保存文章后生效。', 'success');
    closeCoverCrop();
  } catch (error) {
    setCoverCropStatus(error.message || '封面上传失败', 'error');
  } finally {
    button.disabled = false;
  }
};
$('#clear-post-cover').onclick = () => {
  $('#post-cover-url').value = '';
  renderPostCoverPreview('');
  setPostCoverStatus('封面已移除，保存文章后生效。');
};
$('#carousel-post').onclick = async () => {
  if (!selectedId) return;
  const button = $('#carousel-post');
  button.disabled = true;
  const response = await fetch(`/api/posts/${encodeURIComponent(selectedId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ carousel: !selectedCarousel }),
  });
  const data = await response.json();
  if (!response.ok) {
    $('#save-status').textContent = data.error || '首页轮播状态更新失败';
    button.disabled = false;
    return;
  }
  selectedCarousel = Boolean(data.post.carousel);
  posts = posts.map((post) => post.id === selectedId ? { ...post, carousel: selectedCarousel } : post);
  button.disabled = false;
  fillForm(posts.find((post) => post.id === selectedId));
  renderList();
  $('#save-status').textContent = selectedCarousel ? '已加入首页轮播' : '已移出首页轮播';
  showAdminSaveFeedback('首页轮播设置已保存');
};
$('#pin-post').onclick = async () => {
  if (!selectedId) return;
  const button = $('#pin-post');
  button.disabled = true;
  const response = await fetch(`/api/posts/${encodeURIComponent(selectedId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pinned: !selectedPinned }),
  });
  const data = await response.json();
  if (!response.ok) {
    $('#save-status').textContent = data.error || '置顶状态更新失败';
    button.disabled = false;
    return;
  }
  selectedPinned = Boolean(data.post.pinned);
  posts = posts.map((post) => post.id === selectedId ? { ...post, pinned: selectedPinned } : post);
  button.disabled = false;
  fillForm(posts.find((post) => post.id === selectedId));
  renderList();
  $('#save-status').textContent = selectedPinned ? '文章已置顶' : '已取消文章置顶';
  showAdminSaveFeedback('置顶设置已保存');
};
$('#new-post').onclick = () => { fillForm(null); renderList(); openAdminFold('writing'); };
$('#delete-post').onclick = async () => { if (!selectedId || !(await showAdminDialog({ title: '删除文章', message: '确定删除这篇文章吗？此操作无法撤销。', confirmText: '删除', danger: true }))) return; await fetch(`/api/posts/${selectedId}`, { method:'DELETE' }); selectedId = null; await load(); };
$('#logout').onclick = () => setLoggedIn(false);
$('#save-post-footer')?.addEventListener('click', () => $('#save-post').click());

$('#import-html-file').onclick = () => $('#html-file-input').click();
$('#html-file-input').onchange = async (event) => {
  const file = event.target.files?.[0];
  try { await importHtmlDocument(file); } catch (error) { $('#html-import-status').textContent = error.message; $('#html-import-status').classList.add('error'); }
  event.target.value = '';
};
const editorDropZone = $('#editor-import-zone');
let editorDragDepth = 0;
const hasDraggedFiles = (event) => [...(event.dataTransfer?.types || [])].includes('Files');
editorDropZone.addEventListener('dragenter', (event) => { if (!hasDraggedFiles(event)) return; event.preventDefault(); editorDragDepth += 1; editorDropZone.classList.add('dragging-files'); });
editorDropZone.addEventListener('dragover', (event) => { if (!hasDraggedFiles(event)) return; event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
editorDropZone.addEventListener('dragleave', () => { editorDragDepth = Math.max(0, editorDragDepth - 1); if (!editorDragDepth) editorDropZone.classList.remove('dragging-files'); });
editorDropZone.addEventListener('drop', async (event) => {
  if (!hasDraggedFiles(event)) return;
  event.preventDefault(); editorDragDepth = 0; editorDropZone.classList.remove('dragging-files');
  const files = [...(event.dataTransfer?.files || [])];
  const htmlFile = files.find((file) => /\.html?$/i.test(file.name) || ['text/html', 'application/xhtml+xml'].includes(file.type));
  try {
    if (htmlFile) await importHtmlDocument(htmlFile);
    else if (selectedEditorImage && files.length === 1 && files[0].type.startsWith('image/')) await replaceSelectedEditorImage(files[0]);
    else await insertFiles(files);
  } catch (error) { $('#html-import-status').textContent = error.message; $('#html-import-status').classList.add('error'); }
});
$('#replace-editor-image').onclick = () => $('#replace-image-file').click();
$('#replace-image-file').onchange = (event) => replaceSelectedEditorImage(event.target.files?.[0]);
$('#edit-image-alt').onclick = async () => {
  if (!selectedEditorImage) return;
  const alt = await showAdminDialog({ title: '图片说明', message: '填写图片替代文本，方便无障碍阅读和搜索。', prompt: true, placeholder: '图片内容说明', value: selectedEditorImage.alt || '', confirmText: '保存说明' });
  if (alt === null) return;
  selectedEditorImage.alt = alt;
  renderPostPreview();
};
$('#remove-editor-image').onclick = () => { if (!selectedEditorImage) return; selectedEditorImage.remove(); showEditorImageTools(null); renderPostPreview(); };
['post-title', 'post-excerpt', 'post-category', 'post-author', 'post-tags', 'post-cover-url', 'post-format'].forEach((id) => { const field = $('#' + id); field.addEventListener('input', renderPostPreview); field.addEventListener('change', renderPostPreview); });
document.querySelectorAll('#site-profile-form [name^="ui_"]').forEach((field) => field.addEventListener('change', () => applyAdminAppearance(Object.fromEntries(new FormData($('#site-profile-form')).entries()))));

document.querySelectorAll('#rich-toolbar [data-command]').forEach((button) => { button.onmousedown = (event) => event.preventDefault(); button.onclick = () => { restoreEditorRange(); document.execCommand(button.dataset.command, false, button.querySelector('input')?.value || null); saveEditorRange(); }; });
document.querySelectorAll('#rich-toolbar [data-block]').forEach((button) => {
  button.onmousedown = (event) => event.preventDefault();
  button.onclick = () => {
    restoreEditorRange();
    document.execCommand('formatBlock', false, button.dataset.block);
    saveEditorRange();
    $('#post-format').value = 'html';
    refreshAdminToc();
  };
});
document.querySelectorAll('.color-control input').forEach((input) => { input.oninput = () => { restoreEditorRange(); document.execCommand(input.dataset.command, false, input.value); saveEditorRange(); }; });
$('#insert-file').onmousedown = (event) => { event.preventDefault(); saveEditorRange(); };
$('#insert-file').onclick = () => { saveEditorRange(); if ($('#post-format').value === 'markdown') { $('#post-format').value = 'html'; $('#save-status').textContent = '插入媒体后将以富文本格式保存'; } $('#insert-file-input').click(); };
$('#insert-file-input').onchange = (event) => insertFiles([...event.target.files]);
$('#insert-link').onclick = insertEditorLink;
$('#insert-inline-code').onclick = createInlineCode;
$('#insert-code-block').onclick = createCodeBlock;

const EDITOR_COMPONENTS = {
  lead: '<div class="article-lead"><strong>核心导语</strong><p>用一段简洁文字概括文章重点。</p></div>',
  callout: '<div class="article-callout"><p><strong>提示：</strong>在这里补充需要注意的信息。</p></div>',
  warning: '<div class="article-callout-warning"><p><strong>注意：</strong>在这里填写风险或操作警告。</p></div>',
  step: '<div class="article-step-list"><div class="article-step"><span class="article-step-number">01</span><div class="article-step-body"><h3>操作步骤</h3><p>填写这一阶段的说明。</p></div></div></div>',
  'image-pair': '<div class="article-figure-pair"><figure><img src="/brand.svg" alt="点击替换第一张图片"><figcaption>图片说明一</figcaption></figure><figure><img src="/brand.svg" alt="点击替换第二张图片"><figcaption>图片说明二</figcaption></figure></div>',
  code: '<pre class="macos-code"><code>在这里输入命令</code></pre><p><br></p>',
};
function insertEditorComponent(type) {
  const markup = EDITOR_COMPONENTS[type];
  if (!markup) return;
  restoreEditorRange();
  // Give the component a block boundary so Chromium keeps its semantic wrapper.
  document.execCommand('insertParagraph', false, null);
  document.execCommand('insertHTML', false, markup);
  saveEditorRange();
  $('#post-format').value = 'html';
  refreshAdminToc();
  renderPostPreview();
}

$('#insert-horizontal-rule').onclick = insertHorizontalRule;
document.querySelectorAll('[data-editor-component]').forEach((button) => { button.onmousedown = (event) => event.preventDefault(); button.onclick = () => insertEditorComponent(button.dataset.editorComponent); });
$('#refresh-post-preview').onclick = renderPostPreview;
const editor = $('#post-content');
['keyup', 'mouseup', 'input'].forEach((name) => editor.addEventListener(name, saveEditorRange));
editor.addEventListener('input', () => { refreshAdminToc(); renderPostPreview(); });
editor.addEventListener('click', (event) => {
  const image = event.target.closest('img');
  if (image) {
    saveEditorRange();
    showEditorImageTools(image);
  } else if (!event.target.closest('#editor-media-tools')) {
    showEditorImageTools(null);
  }
});
let editorPreviewFrame = 0;
new MutationObserver(() => {
  cancelAnimationFrame(editorPreviewFrame);
  editorPreviewFrame = requestAnimationFrame(() => {
    refreshAdminToc();
    renderPostPreview();
  });
}).observe(editor, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['src', 'alt', 'href'] });
window.addEventListener('resize', schedulePreviewScrollSync, { passive: true });
$('#post-format').addEventListener('change', refreshAdminToc);
$('#refresh-admin-toc').onclick = refreshAdminToc;
editor.oncontextmenu = (event) => {
  event.preventDefault(); saveEditorRange(); document.querySelector('.context-menu')?.remove();
  const menu = document.createElement('div'); menu.className = 'context-menu';
  const menuButton = (action, icon, label) => `<button data-editor-action="${action}" data-no-icon>${BlogIcons.svg(icon)}<span>${label}</span></button>`;
  menu.innerHTML = [
    menuButton('undo', 'undo', '撤销'), menuButton('redo', 'redo', '重做'),
    menuButton('bold', 'bold', '粗体'), menuButton('italic', 'italic', '斜体'), menuButton('underline', 'underline', '下划线'), menuButton('strikeThrough', 'strike', '删除线'),
    menuButton('h2', 'heading2', '二级标题'), menuButton('h3', 'heading3', '三级标题'),
    menuButton('insertUnorderedList', 'format', '无序列表'), menuButton('insertOrderedList', 'numbered', '有序列表'),
    menuButton('blockquote', 'quote', '引用'), menuButton('justifyLeft', 'alignLeft', '左对齐'), menuButton('justifyCenter', 'alignCenter', '居中'), menuButton('justifyRight', 'alignRight', '右对齐'),
    menuButton('link', 'link', '插入链接'), menuButton('inline-code', 'code', '行内代码'), menuButton('code-block', 'terminal', '代码块'), menuButton('clear-format', 'clearFormat', '清除格式'), menuButton('horizontal-rule', 'rule', '分割线'),
  ].join('');
  document.body.append(menu); menu.style.left = Math.min(event.clientX, innerWidth - 230) + 'px'; menu.style.top = Math.min(event.clientY, innerHeight - 470) + 'px';
  menu.querySelectorAll('button').forEach((button) => { button.onclick = () => { const action = button.dataset.editorAction; menu.remove(); if (action === 'link') return insertEditorLink(); if (action === 'inline-code') return createInlineCode(); if (action === 'code-block') return createCodeBlock(); if (action === 'horizontal-rule') return insertHorizontalRule(); if (action === 'clear-format') { restoreEditorRange(); document.execCommand('removeFormat', false, null); saveEditorRange(); return; } if (['h2','h3','blockquote'].includes(action)) { restoreEditorRange(); document.execCommand('formatBlock', false, action); saveEditorRange(); refreshAdminToc(); return; } restoreEditorRange(); document.execCommand(action, false, null); saveEditorRange(); refreshAdminToc(); }; });
  setTimeout(() => document.addEventListener('click', () => menu.remove(), { once:true }), 0);
};
$('#profile-edit-toggle').onclick = () => { openAdminFold('site'); $('#site-profile-form').classList.remove('hidden'); };
let qrUploadTarget = '';
document.querySelectorAll('[data-qr-target]').forEach((button) => {
  button.onclick = () => {
    qrUploadTarget = button.dataset.qrTarget;
    $('#qr-file-input').click();
  };
});
$('#qr-file-input').onchange = async () => {
  const file = $('#qr-file-input').files?.[0];
  if (!file || !qrUploadTarget) return;
  const status = $('#qr-upload-status');
  status.classList.remove('error', 'success');
  status.textContent = '正在上传收款码…';
  const body = new FormData();
  body.append('file', file);
  try {
    const response = await fetch('/api/uploads', { method: 'POST', body });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '收款码上传失败');
    $(`#site-profile-form [name="${qrUploadTarget}"]`).value = data.url;
    status.textContent = '收款码已上传，请保存访客页内容使其公开。';
    status.classList.add('success');
  } catch (error) {
    status.textContent = error.message || '收款码上传失败';
    status.classList.add('error');
  } finally {
    $('#qr-file-input').value = '';
  }
};
$('#site-profile-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"], button:not([type])');
  const status = $('#save-profile-status');
  button.disabled = true;
  status.textContent = '正在保存…';
  try {
    const response = await fetch('/api/admin/profile', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget))) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '访客页内容保存失败');
    status.textContent = '访客页内容已保存';
    await load();
    showAdminSaveDialog('配置保存成功', '访客页内容与界面外观设置已经保存并生效。');
  } catch (error) {
    status.textContent = error.message || '访客页内容保存失败';
  } finally {
    button.disabled = false;
  }
};
$('#about-page-admin-form')?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = event.currentTarget.querySelector('button[type="submit"]');
  const status = $('#about-page-save-status');
  status.textContent = '正在保存…';
  status.classList.remove('success', 'error');
  button.disabled = true;
  $('#about-tag-data').value = JSON.stringify(aboutTags);
  try {
    const response = await fetch('/api/admin/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '关于页内容保存失败');
    status.textContent = '关于页内容已保存';
    status.classList.add('success');
    showAdminSaveDialog('关于页保存成功', '关于页内容、标签与展示设置已经保存。');
  } catch (error) {
    status.textContent = error.message || '关于页内容保存失败';
    status.classList.add('error');
  } finally {
    button.disabled = false;
  }
});
const commentSourceLabels = { article: '文章评论', guestbook: '留言区' };
const commentFilterLabels = { advertising: '广告', political: '政治类', 'weapons-explosives': '涉枪涉爆违法信息', sexual: '色情类' };
function commentSection(source) {
  return $(`[data-comment-section="${source}"]`);
}
async function loadComments() {
  document.querySelectorAll('[data-comment-section] [data-comment-status-text]').forEach((node) => { node.textContent = '正在读取…'; });
  try {
    const response = await fetch('/api/admin/comments');
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '评论读取失败');
    adminComments = data.comments || [];
    renderAdminComments('article');
    renderAdminComments('guestbook');
    document.querySelectorAll('[data-comment-section]').forEach((section) => {
      const source = section.dataset.commentSection;
      const total = adminComments.filter((comment) => comment.source === source).length;
      section.querySelector('[data-comment-status-text]').textContent = `已读取 ${total} 条${commentSourceLabels[source]}`;
    });
  } catch (error) {
    document.querySelectorAll('[data-comment-section]').forEach((section) => {
      section.querySelector('[data-comment-list]').innerHTML = `<div class="admin-empty">${escapeHtml(error.message || '评论读取失败')}</div>`;
      section.querySelector('[data-comment-status-text]').textContent = '读取失败，请稍后重试';
    });
  }
}
function adminCommentCardMarkup(comment) {
  const images = adminGalleryUrls(comment);
  const sourceLabel = comment.source === 'guestbook' ? '留言区' : '文章评论';
  const flags = Array.isArray(comment.moderation_flags) ? comment.moderation_flags : [];
  const pendingReview = comment.review_status === 'pending';
  const statusLabel = pendingReview ? '待审核' : comment.approved ? '已公开' : '已隐藏';
  const statusClass = pendingReview ? 'warning' : comment.approved ? '' : 'danger';
  const flagMarkup = flags.length ? `<div class="admin-comment-flags"><span>${pendingReview ? '违禁词命中 · 已打码' : '人工复核 · 原文已恢复'}</span>${flags.map((flag) => `<b>${escapeHtml(commentFilterLabels[flag] || flag)}</b>`).join('')}</div>` : '';
  const originalReview = pendingReview && comment.moderation_original ? `<details class="admin-comment-original"><summary>查看审核原文</summary><div>${escapeHtml(comment.moderation_original)}</div></details>` : '';
  const primaryAction = pendingReview
    ? `<button class="filled-button" type="button" data-comment-action="review" data-id="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('check')}<span>审核通过并解除星号</span></button>`
    : `<button class="text-button" type="button" data-comment-action="approve" data-id="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('check')}<span>${comment.approved ? '隐藏评论' : '公开评论'}</span></button>`;
  return `<article class="admin-comment-card" data-comment-id="${escapeHtml(comment.id)}">
    <header>
      <div class="admin-comment-author"><span class="admin-comment-avatar">${escapeHtml((comment.username || '用').slice(0, 1).toUpperCase())}</span><div class="admin-comment-author-copy"><strong>${escapeHtml(comment.username || '已注销用户')}</strong><small>${escapeHtml(comment.post_title || sourceLabel)} · ${formatAdminDate(comment.created_at)}</small></div></div>
      <div class="admin-comment-state"><span class="status-chip ${statusClass}">${statusLabel}</span>${comment.review_requested ? '<span class="status-chip warning">发布者已催审</span>' : ''}${comment.pinned ? '<span class="status-chip">已置顶</span>' : ''}</div>
    </header>
    ${flagMarkup}
    ${originalReview}
    <p class="admin-comment-content">${escapeHtml(comment.content || (images.length ? `[${images.length} 张图片评论]` : '（空评论）'))}</p>
    ${adminGalleryMarkup(images, 'admin-comment-gallery', '评论图片')}
    <div class="admin-comment-meta"><span>${sourceLabel}</span><span>评论 ID：${escapeHtml(comment.id)}</span>${Number(comment.likes || 0) ? `<span>${Number(comment.likes)} 个赞</span>` : ''}</div>
    <div class="admin-comment-card-actions">${primaryAction}<button class="text-button" type="button" data-comment-action="pin" data-id="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('flag')}<span>${comment.pinned ? '取消置顶' : '置顶'}</span></button><button class="text-button danger-text" type="button" data-comment-action="delete" data-id="${escapeHtml(comment.id)}" data-no-icon>${BlogIcons.svg('delete')}<span>删除</span></button></div>
  </article>`;
}
function renderAdminComments(source) {
  const section = commentSection(source);
  const view = adminCommentViews[source];
  if (!section || !view) return;
  const sourceComments = adminComments.filter((comment) => comment.source === source);
  const counts = {
    all: sourceComments.length,
    pending: sourceComments.filter((comment) => comment.review_status === 'pending').length,
    approved: sourceComments.filter((comment) => comment.approved && comment.review_status !== 'pending').length,
  };
  section.querySelectorAll('[data-comment-count]').forEach((node) => {
    node.textContent = String(counts[node.dataset.commentCount] || 0);
  });
  section.querySelectorAll('[data-comment-filter]').forEach((button) => {
    const active = button.dataset.commentFilter === view.filter;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  section.querySelector('[data-comment-summary]').textContent = `${counts.all} 条 · 待审核 ${counts.pending}`;
  const term = view.query.trim().toLowerCase();
  const filtered = sourceComments.filter((comment) => {
    if (view.filter === 'pending' && comment.review_status !== 'pending') return false;
    if (view.filter === 'approved' && (!comment.approved || comment.review_status === 'pending')) return false;
    if (!term) return true;
    return [comment.username, comment.content, comment.post_title].some((value) => String(value || '').toLowerCase().includes(term));
  });
  section.querySelector('[data-comment-list]').innerHTML = filtered.length ? filtered.map(adminCommentCardMarkup).join('') : `<div class="admin-empty">${term || view.filter !== 'all' ? '没有符合条件的评论' : '暂无评论'}</div>`;
  section.querySelectorAll('[data-comment-action]').forEach((button) => {
    button.onclick = async () => {
      const id = button.dataset.id;
      const action = button.dataset.commentAction;
      const comment = adminComments.find((item) => item.id === id);
      if (!comment) return;
      if (action === 'delete' && !(await showAdminDialog({ title: '删除评论', message: `确定删除 ${comment.username || '该用户'} 的这条评论吗？直接回复也会一并删除。`, confirmText: '删除', danger: true }))) return;
      button.disabled = true;
      const status = section.querySelector('[data-comment-status-text]');
      status.textContent = '正在保存…';
      try {
        let response;
        if (action === 'delete') {
          response = await fetch(`/api/admin/comments/${encodeURIComponent(id)}`, { method: 'DELETE' });
        } else {
          const key = action === 'approve' ? 'approved' : 'pinned';
          response = await fetch(`/api/admin/comments/${encodeURIComponent(id)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(action === 'review' ? { review_action: 'approve' } : { [key]: !comment[key] }),
          });
        }
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || '评论操作失败');
        await loadComments();
        commentSection(source).querySelector('[data-comment-status-text]').textContent = action === 'delete' ? '评论已删除' : '评论状态已更新';
      } catch (error) {
        button.disabled = false;
        status.textContent = error.message || '评论操作失败';
      }
    };
  });
}
document.querySelectorAll('[data-comment-section] [data-comment-filter]').forEach((button) => {
  button.onclick = () => {
    const source = button.closest('[data-comment-section]').dataset.commentSection;
    adminCommentViews[source].filter = button.dataset.commentFilter;
    renderAdminComments(source);
  };
});
document.querySelectorAll('[data-comment-section] [data-comment-search]').forEach((input) => {
  input.oninput = () => {
    const source = input.closest('[data-comment-section]').dataset.commentSection;
    adminCommentViews[source].query = input.value;
    renderAdminComments(source);
  };
});
document.querySelectorAll('[data-refresh-comments]').forEach((button) => button.onclick = loadComments);
$('#refresh-reports').onclick = loadReports;
$('#refresh-users').onclick = loadUsers;
$('#refresh-friend-applications').onclick = loadFriendApplications;
$('#refresh-thoughts').onclick = loadAdminThoughts;
$('#refresh-announcements').onclick = loadAdminAnnouncements;
$('#cancel-announcement-edit').onclick = resetAnnouncementEditor;
$('#announcement-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = $('#save-announcement');
  const status = $('#announcement-editor-status');
  const form = new FormData(event.target);
  const payload = {
    title_zh: form.get('title_zh'),
    title_en: form.get('title_en'),
    body_zh: form.get('body_zh'),
    body_en: form.get('body_en'),
    published: $('#announcement-published').checked,
  };
  button.disabled = true;
  status.textContent = '正在保存…';
  try {
    const response = await fetch(editingAnnouncementId ? `/api/admin/announcements/${encodeURIComponent(editingAnnouncementId)}` : '/api/admin/announcements', {
      method: editingAnnouncementId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '公告保存失败');
    resetAnnouncementEditor();
    await loadAdminAnnouncements();
    status.textContent = payload.published ? '公告已发布' : '公告草稿已保存';
    showAdminSaveFeedback(payload.published ? '公告已发布' : '公告草稿已保存');
  } catch (error) {
    status.textContent = error.message || '公告保存失败';
    button.disabled = false;
  } finally {
    button.disabled = false;
  }
};
$('#cancel-thought-edit').onclick = resetThoughtEditor;
$('#upload-thought-image').onclick = () => $('#thought-image-file').click();
$('#clear-thought-image').onclick = () => {
  setThoughtImages([]);
  $('#thought-image-file').value = '';
  $('#thought-image-status').textContent = '全部照片已移除，保存后生效。';
};
$('#thought-image-previews').onclick = (event) => {
  const button = event.target.closest('[data-thought-image-remove]');
  if (!button) return;
  const index = Number(button.dataset.thoughtImageRemove);
  setThoughtImages(thoughtImageUrls.filter((_, itemIndex) => itemIndex !== index));
  $('#thought-image-status').textContent = `已选择 ${thoughtImageUrls.length} 张照片`;
};
$('#thought-image-file').onchange = async () => {
  const files = [...($('#thought-image-file').files || [])];
  const status = $('#thought-image-status');
  if (!files.length) return;
  const available = Math.max(0, MAX_ADMIN_GALLERY_IMAGES - thoughtImageUrls.length);
  if (!available) {
    status.textContent = `最多上传 ${MAX_ADMIN_GALLERY_IMAGES} 张照片`;
    status.classList.add('error');
    return;
  }
  status.textContent = '正在上传照片…';
  status.classList.remove('success', 'error');
  let failed = '';
  for (const [index, file] of files.slice(0, available).entries()) {
    status.textContent = `正在上传 ${index + 1} / ${Math.min(files.length, available)}…`;
    try {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/uploads', { method: 'POST', body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || '照片上传失败');
      setThoughtImages([...thoughtImageUrls, data.url]);
    } catch (error) {
      failed = error.message || '照片上传失败';
    }
  }
  if (files.length > available) failed = `最多上传 ${MAX_ADMIN_GALLERY_IMAGES} 张，多出的照片未处理`;
  status.textContent = failed || `已上传 ${thoughtImageUrls.length} 张照片，请保存日常记录`;
  status.classList.add(failed ? 'error' : 'success');
  $('#thought-image-file').value = '';
};
$('#admin-thought-form').onsubmit = async (event) => {
  event.preventDefault();
  const button = $('#save-thought');
  const status = $('#thought-editor-status');
  button.disabled = true;
  status.textContent = '正在保存…';
  try {
    const payload = {
      content: $('#thought-content').value,
      image_urls: thoughtImageUrls,
      mood: $('#thought-mood').value,
      published: $('#thought-published').checked,
    };
    const response = await fetch(editingThoughtId ? `/api/admin/thoughts/${encodeURIComponent(editingThoughtId)}` : '/api/admin/thoughts', {
      method: editingThoughtId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || '日常保存失败');
    resetThoughtEditor();
    await loadAdminThoughts();
    status.textContent = '日常已保存';
    showAdminSaveFeedback('日常已保存');
  } catch (error) {
    status.textContent = error.message || '日常保存失败';
    button.disabled = false;
  } finally {
    button.disabled = false;
  }
};
$('#theme-toggle').onclick = () => { document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('blog-theme', document.documentElement.dataset.theme); renderThemeIcon(); };
const systemThemeMedia = matchMedia('(prefers-color-scheme: dark)');
function storedThemePreference() { try { const value = localStorage.getItem('blog-theme'); return value === 'dark' || value === 'light' ? value : ''; } catch (_) { return ''; } }
function applySystemTheme() { const theme = storedThemePreference() || (systemThemeMedia.matches ? 'dark' : 'light'); document.documentElement.dataset.theme = theme; document.documentElement.style.colorScheme = theme; renderThemeIcon(); }
function syncSystemTheme() { if (!storedThemePreference()) applySystemTheme(); }
function setupBackToTop() {
  const button = $('#back-to-top');
  if (!button) return;
  let frame = 0;
  const update = () => {
    frame = 0;
    button.classList.toggle('visible', window.scrollY > Math.max(420, window.innerHeight * 0.6));
  };
  const scheduleUpdate = () => {
    if (!frame) frame = requestAnimationFrame(update);
  };
  window.addEventListener('scroll', scheduleUpdate, { passive: true });
  window.addEventListener('resize', scheduleUpdate, { passive: true });
  button.onclick = () => window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  update();
}
applySystemTheme(); if (systemThemeMedia.addEventListener) systemThemeMedia.addEventListener('change', syncSystemTheme); else systemThemeMedia.addListener(syncSystemTheme); setupAdminFolds(); setupAdminQuickNav(); setupEditorFloatingDock(); setupEditorLayoutControls(); setupBackToTop(); BlogIcons.iconize(); refreshAdminToc(); setLoggedIn(true); load();
