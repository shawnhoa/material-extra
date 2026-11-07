(() => {
  const names = {
    home: 'home',
    archive: 'inventory_2',
    cube: 'view_in_ar',
    server: 'dns',
    person: 'person',
    people: 'group',
    search: 'search',
    sun: 'brightness_low',
    moon: 'brightness_2',
    translate: 'translate',
    add: 'add',
    edit: 'edit',
    delete: 'delete',
    save: 'save',
    close: 'close',
    logout: 'logout',
    refresh: 'refresh',
    check: 'check',
    left: 'chevron_left',
    right: 'chevron_right',
    heart: 'favorite',
    bookmark: 'bookmark',
    share: 'share',
    upload: 'upload',
    download: 'download',
    book: 'menu_book',
    code: 'code',
    bold: 'format_bold',
    italic: 'format_italic',
    underline: 'format_underlined',
    strike: 'format_strikethrough',
    format: 'format_list_bulleted',
    numbered: 'format_list_numbered',
    heading2: 'format_h2',
    heading3: 'format_h3',
    quote: 'format_quote',
    link: 'link',
    clearFormat: 'format_clear',
    rule: 'horizontal_rule',
    textColor: 'format_color_text',
    fillColor: 'format_color_fill',
    undo: 'undo',
    redo: 'redo',
    terminal: 'terminal',
    alignLeft: 'format_align_left',
    alignCenter: 'format_align_center',
    alignRight: 'format_align_right',
    send: 'send',
    flag: 'flag',
    pin: 'push_pin',
    more: 'more_horiz',
  };
  const exactPaths = {
    train: 'M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h2.23l2-2H14l2 2h2v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zM7.5 17c-.83 0-1.5-.67-1.5-1.5S6.67 14 7.5 14s1.5.67 1.5 1.5S8.33 17 7.5 17zm3.5-7H6V6h5v4zm2 0V6h5v4h-5zm3.5 7c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z',
    cookie: 'M21.95 10.99c-1.79-.03-3.7-1.95-2.68-4.22-2.98 1-5.77-1.59-5.19-4.56C6.95.71 2 6.58 2 12c0 5.52 4.48 10 10 10 5.89 0 10.54-5.08 9.95-11.01zM8.5 15c-.83 0-1.5-.67-1.5-1.5S7.67 12 8.5 12s1.5.67 1.5 1.5S9.33 15 8.5 15zm2-5C9.67 10 9 9.33 9 8.5S9.67 7 10.5 7s1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4.5 6c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z',
  };

  class MduiIcon extends HTMLElement {
    static get observedAttributes() { return ['name']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      const rawName = String(this.getAttribute('name') || 'help');
      const outlined = !this.classList.contains('icon-filled');
      const glyph = rawName
        .replace(/--(?:outlined|rounded|sharp|two-tone)$/i, '')
        .trim() || 'help';
      if (exactPaths[glyph]) {
        this.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${exactPaths[glyph]}"/></svg>`;
        return;
      }
      this.innerHTML = `<i class="material-symbols-rounded mdui-glyph${outlined ? ' outlined' : ' filled'}" aria-hidden="true">${glyph.replace(/[<>&"']/g, '')}</i>`;
    }
  }
  if (!customElements.get('mdui-icon')) customElements.define('mdui-icon', MduiIcon);

  const iconName = (name) => names[name] || names.more;
  const svg = (name) => {
    const resolved = iconName(name);
    return `<mdui-icon class="icon-outline" name="${resolved}--outlined"></mdui-icon><mdui-icon class="icon-filled" name="${resolved}"></mdui-icon>`;
  };
  const choose = (label, element) => {
    if (element?.dataset?.icon && names[element.dataset.icon]) return element.dataset.icon;
    const command = element?.dataset?.command || '';
    if (command) return ({ bold: 'bold', underline: 'underline', strikeThrough: 'strike', fontSize: 'format', foreColor: 'format', hiliteColor: 'format', insertCode: 'code' })[command] || 'format';
    const value = String(label || '').toLowerCase();
    if (/home|首页/.test(value)) return 'home';
    if (/archive|归档|calendar/.test(value)) return 'archive';
    if (/login|register|登录|注册|账号|account/.test(value)) return 'people';
    if (/profile|个人资料|个人信息/.test(value)) return 'person';
    if (/language|语言|中文|简体|english|translate/.test(value)) return 'translate';
    if (/theme|主题|dark|light|明暗|深浅/.test(value)) return 'sun';
    if (/search|搜索/.test(value)) return 'search';
    if (/delete|删除|注销|移除|清除/.test(value)) return 'delete';
    if (/new|新文章|添加|新增|发布/.test(value)) return 'add';
    if (/edit|编辑|设置|修改/.test(value)) return 'edit';
    if (/save|保存/.test(value)) return 'save';
    if (/logout|退出/.test(value)) return 'logout';
    if (/refresh|刷新/.test(value)) return 'refresh';
    if (/favorite|bookmark|收藏/.test(value)) return 'bookmark';
    if (/pin|置顶/.test(value)) return 'pin';
    if (/like|点赞|赞/.test(value)) return 'heart';
    if (/share|分享|复制/.test(value)) return 'share';
    if (/upload|上传|插入文件/.test(value)) return 'upload';
    if (/close|关闭|取消/.test(value)) return 'close';
    if (/next|下一页/.test(value)) return 'right';
    if (/previous|prev|上一页/.test(value)) return 'left';
    if (/code|代码/.test(value)) return 'code';
    if (/read|阅读|open|打开/.test(value)) return 'right';
    if (/approve|审核|置顶|通过/.test(value)) return 'check';
    if (/send|发送|获取验证码|留言|评论|回复/.test(value)) return 'send';
    if (/report|举报/.test(value)) return 'flag';
    return 'more';
  };
  function iconize(root = document) {
    root.querySelectorAll('span.material-symbols-rounded').forEach((span) => {
      if (span.closest('mdui-icon')) return;
      let name = String(span.textContent || '').trim();
      if (span.parentElement?.closest('.support-pills') && span.parentElement.textContent.includes('服务器维护')) name = 'dns';
      if (!name) return;
      const icon = document.createElement('mdui-icon');
      icon.setAttribute('name', name);
      icon.className = [...span.classList].filter((className) => className !== 'material-symbols-rounded').join(' ');
      if (span.getAttribute('aria-hidden')) icon.setAttribute('aria-hidden', span.getAttribute('aria-hidden'));
      span.replaceWith(icon);
    });
    root.querySelectorAll('button:not([data-no-icon]),a[data-route]').forEach((element) => {
      if (element.classList.contains('filter-tag') || element.classList.contains('archive-post') || element.classList.contains('sidebar-post')) return;
      if (element.querySelector('mdui-icon,svg')) return;
      const label = element.getAttribute('aria-label') || element.title || element.textContent.trim();
      if (!label) return;
      const name = choose(label, element);
      element.dataset.iconLabel = label;
      element.setAttribute('aria-label', label);
      element.title = label;
      element.classList.add('icon-only');
      element.innerHTML = svg(name);
    });
    root.querySelectorAll('button.filled-button, button.tonal-button, button.outlined-button, button.text-button').forEach((element) => {
      if (element.hasAttribute('data-no-icon')) return;
      if (element.querySelector('mdui-icon,svg')) return;
      const label = element.getAttribute('aria-label') || element.title || element.textContent.trim();
      if (!label) return;
      element.insertAdjacentHTML('afterbegin', svg(choose(label, element)));
    });
  }
  function setupMaterialScrollbar() {
    if (document.querySelector('.material-scrollbar')) return;
    const rail = document.createElement('div');
    rail.className = 'material-scrollbar';
    rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<span class="material-scrollbar-thumb"></span>';
    document.body.append(rail);
    const thumb = rail.querySelector('.material-scrollbar-thumb');
    let frame = 0;
    let dragging = null;
    const update = () => {
      frame = 0;
      const viewport = document.documentElement.clientHeight;
      const total = Math.max(viewport, document.documentElement.scrollHeight);
      const scrollable = total - viewport;
      rail.classList.toggle('visible', scrollable > 2);
      if (scrollable <= 2) return;
      const railHeight = rail.clientHeight;
      const thumbHeight = Math.max(48, Math.round(railHeight * Math.min(1, viewport / total)));
      const top = Math.round((Number(document.documentElement.scrollTop) / scrollable) * Math.max(0, railHeight - thumbHeight));
      thumb.style.height = `${thumbHeight}px`;
      thumb.style.transform = `translateY(${top}px)`;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'hidden'] });
    rail.addEventListener('pointerdown', (event) => {
      if (event.button !== 0) return;
      const track = rail.getBoundingClientRect();
      const thumbRect = thumb.getBoundingClientRect();
      const scrollRange = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const previousBehavior = document.documentElement.style.scrollBehavior;
      if (event.target !== thumb) {
        const ratio = Math.max(0, Math.min(1, (event.clientY - track.top) / Math.max(1, track.height)));
        document.documentElement.style.scrollBehavior = 'auto';
        document.documentElement.scrollTop = ratio * scrollRange;
      }
      dragging = { startY: event.clientY, startScroll: document.documentElement.scrollTop, railHeight: track.height, thumbHeight: thumb.getBoundingClientRect().height, previousBehavior };
      document.documentElement.style.scrollBehavior = 'auto';
      document.documentElement.classList.add('material-scrollbar-dragging');
      rail.classList.add('dragging');
      event.preventDefault();
      event.stopPropagation();
    });
    document.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      const scrollRange = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const railRange = Math.max(1, dragging.railHeight - dragging.thumbHeight);
      const nextScroll = Math.max(0, Math.min(scrollRange, dragging.startScroll + ((event.clientY - dragging.startY) / railRange) * scrollRange));
      document.documentElement.scrollTop = nextScroll;
      thumb.style.transform = `translateY(${(nextScroll / Math.max(1, scrollRange)) * railRange}px)`;
      event.preventDefault();
    }, { passive: false });
    const finishDrag = () => {
      if (dragging) document.documentElement.style.scrollBehavior = dragging.previousBehavior;
      dragging = null;
      rail.classList.remove('dragging');
      document.documentElement.classList.remove('material-scrollbar-dragging');
    };
    document.addEventListener('pointerup', finishDrag);
    document.addEventListener('pointercancel', finishDrag);
    update();
  }
  window.BlogIcons = { svg, iconize, names };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setupMaterialScrollbar, { once: true });
  else setupMaterialScrollbar();
})();
