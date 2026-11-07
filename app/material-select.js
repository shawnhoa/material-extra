(() => {
  let nextId = 0;
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  const instances = new Map();

  function closeAll(except = null) {
    for (const [select, instance] of instances) {
      if (select !== except) instance.close();
    }
  }

  function enhance(select) {
    if (!(select instanceof HTMLSelectElement) || select.multiple || select.dataset.materialSelectReady === 'true' || select.closest('.material-select')) return;
    select.dataset.materialSelectReady = 'true';
    const wrapper = document.createElement('div');
    wrapper.className = 'material-select material-select-auto';
    select.parentNode.insertBefore(wrapper, select);
    wrapper.append(select);
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'material-select-trigger';
    trigger.dataset.noIcon = '';
    trigger.setAttribute('aria-haspopup', 'listbox');
    trigger.setAttribute('aria-expanded', 'false');
    const label = document.createElement('span');
    label.className = 'material-select-label';
    const chevron = document.createElement('span');
    chevron.className = 'material-select-chevron';
    chevron.setAttribute('aria-hidden', 'true');
    trigger.append(label, chevron);
    const menu = document.createElement('div');
    menu.className = 'material-select-menu hidden';
    menu.id = `material-select-menu-${++nextId}`;
    menu.setAttribute('role', 'listbox');
    menu.setAttribute('aria-labelledby', trigger.id || '');
    trigger.setAttribute('aria-controls', menu.id);
    wrapper.append(trigger, menu);
    select.classList.add('native-select-hidden');
    select.tabIndex = -1;

    const sync = () => {
      const options = [...select.options];
      const selected = options.find((option) => option.selected) || options[0];
      label.textContent = selected?.textContent || '';
      trigger.disabled = select.disabled;
      menu.innerHTML = options.map((option) => `<button class="material-select-option" type="button" role="option" aria-selected="${String(option.selected)}" data-value="${esc(option.value)}" ${option.disabled ? 'disabled' : ''}><span>${esc(option.textContent)}</span></button>`).join('');
      menu.querySelectorAll('[data-value]').forEach((optionButton) => {
        optionButton.onclick = () => {
          select.value = optionButton.dataset.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
          sync();
          close();
          trigger.focus();
        };
      });
    };
    const positionMenu = () => {
      const triggerRect = trigger.getBoundingClientRect();
      const availableBelow = window.innerHeight - triggerRect.bottom;
      const estimatedHeight = Math.min(300, Math.max(1, select.options.length) * 46 + 12);
      wrapper.classList.toggle(
        'material-select-up',
        availableBelow < estimatedHeight + 10 && triggerRect.top > availableBelow,
      );
    };
    const open = () => {
      if (select.disabled) return;
      closeAll(select);
      wrapper.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      menu.classList.remove('hidden');
      sync();
      requestAnimationFrame(positionMenu);
      menu.querySelector('[aria-selected="true"]')?.focus();
    };
    const close = () => {
      wrapper.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      menu.classList.add('hidden');
    };
    trigger.onclick = () => wrapper.classList.contains('open') ? close() : open();
    trigger.onkeydown = (event) => {
      if (event.key === 'Escape') { close(); return; }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        open();
        const options = [...menu.querySelectorAll('[role="option"]')];
        (event.key === 'ArrowUp' ? options.at(-1) : options[0])?.focus();
      }
    };
    menu.onkeydown = (event) => {
      const options = [...menu.querySelectorAll('[role="option"]')];
      const index = options.indexOf(document.activeElement);
      if (event.key === 'Escape') { event.preventDefault(); close(); trigger.focus(); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const target = event.key === 'ArrowDown' ? Math.min(options.length - 1, index + 1) : Math.max(0, index - 1);
        options[target]?.focus();
      }
    };
    select.addEventListener('change', sync);
    new MutationObserver(sync).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected', 'disabled', 'label'] });
    instances.set(select, { sync, close });
    sync();
  }

  function refreshAll(root = document) {
    root.querySelectorAll('select').forEach(enhance);
  }
  function refresh(select) {
    instances.get(select)?.sync();
  }
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.material-select-auto')) closeAll();
  });
  window.addEventListener('resize', () => closeAll(), { passive: true });
  document.addEventListener('DOMContentLoaded', () => refreshAll());
  window.MaterialSelect = { enhance, refresh, refreshAll };
})();
