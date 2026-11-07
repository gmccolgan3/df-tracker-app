'use strict';
/* Shared interface pieces: icons, app bar, sheets and dialogs, photos, small components. */

const ICONS = {
  home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',
  sprout: '<path d="M12 21v-9"/><path d="M12 12C12 7.6 9.3 5 4 5c0 5.2 3 7 8 7z"/><path d="M12 14.5c0-4.4 2.7-7 8-7 0 5.2-3 7-8 7z"/>',
  cross: '<circle cx="6" cy="5" r="2.5"/><circle cx="18" cy="5" r="2.5"/><circle cx="12" cy="19" r="2.5"/><path d="M6 7.5c0 5 6 4.5 6 9M18 7.5c0 5-6 4.5-6 9"/>',
  chart: '<path d="M3 21h18"/><rect x="5" y="11" width="3" height="7" rx="1"/><rect x="10.5" y="5" width="3" height="13" rx="1"/><rect x="16" y="13" width="3" height="5" rx="1"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  back: '<path d="M15 18l-6-6 6-6"/>',
  right: '<path d="M9 6l6 6-6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  more: '<circle cx="5" cy="12" r="1.2" fill="currentColor"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><circle cx="19" cy="12" r="1.2" fill="currentColor"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  camera: '<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13.5" r="3.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  fruit: '<path d="M12 21c-4.4 0-7-3.4-7-7.8C5 8.6 8 5 12 5s7 3.6 7 8.2c0 4.4-2.6 7.8-7 7.8z"/><path d="M12 5 9.5 2.5M12 5l2.5-2.5M7.2 10.2 4.8 9M16.8 10.2 19.2 9M9 15.5l-2 .8M15 15.5l2 .8"/>',
  note: '<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5M9 13h7M9 17h5"/>',
  tag: '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8" r="1.5"/>',
  download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
  table: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M9 10v10"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 19V5M8 7h7"/>',
  scissors: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
  award: '<circle cx="12" cy="9" r="6"/><path d="M8.5 14 7 22l5-3 5 3-1.5-8"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-5"/>',
  flask: '<path d="M9 3h6M10 3v6L4.5 19a1.5 1.5 0 0 0 1.3 2h12.4a1.5 1.5 0 0 0 1.3-2L14 9V3"/><path d="M7 15h10"/>',
  sliders: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="var(--surface)"/><circle cx="15" cy="12" r="2" fill="var(--surface)"/><circle cx="7" cy="18" r="2" fill="var(--surface)"/>',
  seed: '<path d="M12 3c5 3 7 7 7 11a7 7 0 0 1-14 0c0-4 2-8 7-11z"/><path d="M12 9v9"/>',
  graft: '<path d="M12 21v-8M8 13h8M12 13 7 4M12 13l5-9"/>',
  minus: '<path d="M5 12h14"/>',
  star: '<path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z"/>',
  drop: '<path d="M12 3s7 7.2 7 12a7 7 0 0 1-14 0c0-4.8 7-12 7-12z"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* ---------- app bar ---------- */

const bar = document.getElementById('bar');
let barParent = '#/home';

// Top-level pages get a large title; detail pages get a back button and actions.
function setBar({ title = '', sub = '', large = false, back = null, actions = '' } = {}) {
  barParent = back || '#/home';
  bar.className = 'bar' + (large ? ' large' : '');
  bar.innerHTML = `
    ${back ? `<button class="bar-btn" data-act="back" aria-label="Back">${icon('back')}</button>` : ''}
    <div class="bar-title"><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div>
    <div class="bar-actions">${actions}</div>`;
  document.title = title && title !== 'Today' ? `${title} · Dragon Fruit Tracker` : 'Dragon Fruit Tracker';
}

// Forms: Cancel on the left, Save on the right, no tab bar.
function setFormBar(title) {
  bar.className = 'bar form-bar';
  bar.innerHTML = `
    <button class="bar-text" data-act="cancel">Cancel</button>
    <div class="bar-title"><h1>${esc(title)}</h1></div>
    <button class="bar-text strong" type="submit" form="form">Save</button>`;
  document.title = `${title} · Dragon Fruit Tracker`;
}

const barBtn = (ic, label, attrs) => `<button class="bar-btn" aria-label="${esc(label)}" title="${esc(label)}" ${attrs}>${icon(ic)}</button>`;
const barLink = (ic, label, href) => `<a class="bar-btn" aria-label="${esc(label)}" title="${esc(label)}" href="${href}">${icon(ic)}</a>`;

/* ---------- toast ---------- */

function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

/* ---------- sheets and dialogs ---------- */

const layer = document.getElementById('layer');
let layerClose = null;
let layerTimer = null;

function openLayer(html, { kind = 'sheet', onClick, label = 'Menu' } = {}) {
  clearTimeout(layerTimer); // a dialog opened right after another closes must not be cleared by it
  closeLayer(true);
  layer.innerHTML = `<div class="scrim" data-close></div><div class="${kind}" role="dialog" aria-modal="true" aria-label="${esc(label)}">${html}</div>`;
  layer.hidden = false;
  document.body.classList.add('locked');
  requestAnimationFrame(() => layer.classList.add('open'));
  const panel = layer.querySelector('[role=dialog]');
  layer.onclick = (e) => {
    if (e.target.closest('[data-close]')) { closeLayer(); return; }
    if (onClick) onClick(e);
  };
  const first = panel.querySelector('input, button:not([data-close])');
  if (first) setTimeout(() => first.focus(), 60);
  return panel;
}

function closeLayer(immediate = false) {
  if (layer.hidden) return;
  const done = () => { layer.hidden = true; layer.innerHTML = ''; document.body.classList.remove('locked'); };
  layer.classList.remove('open');
  clearTimeout(layerTimer);
  if (immediate) done(); else layerTimer = setTimeout(done, 180);
  if (layerClose) { const fn = layerClose; layerClose = null; fn(); }
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !layer.hidden) closeLayer(); });

// A list of actions sliding up from the bottom. items: {icon, label, sub, href | run, danger} or {section}.
function openSheet({ title, sub, items }) {
  const html = `
    <div class="grip"></div>
    ${title ? `<div class="sheet-head"><b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>` : ''}
    <div class="sheet-items">${items.map((it, i) => it.section
      ? `<div class="sheet-section">${esc(it.section)}</div>`
      : `<button class="sheet-item${it.danger ? ' danger' : ''}" data-i="${i}"><span class="ico">${icon(it.icon)}</span><span class="txt"><b>${esc(it.label)}</b>${it.sub ? `<small>${esc(it.sub)}</small>` : ''}</span></button>`).join('')}</div>`;
  openLayer(html, {
    label: title || 'Menu',
    onClick: (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const it = items[+b.dataset.i];
      closeLayer(true);
      if (it.href) location.hash = it.href;
      else if (it.run) it.run();
    },
  });
}

// Promise-based dialog. buttons: [{label, value, primary, danger}]. With `input`, resolves to the typed text.
function dialog({ title, body = '', buttons = [{ label: 'OK', value: true, primary: true }], input = null }) {
  return new Promise((resolve) => {
    let result = null;
    const html = `
      <h2>${esc(title)}</h2>
      ${body ? `<div class="dialog-body">${body}</div>` : ''}
      ${input ? `<input class="dialog-input" type="text" placeholder="${esc(input.placeholder || '')}" value="${esc(input.value || '')}" aria-label="${esc(input.label || title)}">` : ''}
      <div class="dialog-actions">${buttons.map((b, i) => `<button class="btn${b.primary ? ' primary' : ''}${b.danger ? ' danger-fill' : ''}" data-b="${i}">${esc(b.label)}</button>`).join('')}</div>`;
    const panel = openLayer(html, {
      kind: 'dialog',
      label: title,
      onClick: (e) => {
        const b = e.target.closest('[data-b]');
        if (!b) return;
        const btn = buttons[+b.dataset.b];
        result = input && btn.value === true ? panel.querySelector('.dialog-input').value : btn.value;
        closeLayer();
      },
    });
    layerClose = () => resolve(result);
    if (input) {
      const inp = panel.querySelector('.dialog-input');
      inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') { result = inp.value; closeLayer(); } });
    }
  });
}
const confirmBox = (title, body, ok = 'OK', danger = false) =>
  dialog({ title, body: body ? `<p>${esc(body)}</p>` : '', buttons: [{ label: 'Cancel', value: false }, { label: ok, value: true, primary: !danger, danger }] }).then((v) => v === true);
const notice = (title, body) => dialog({ title, body: `<p>${esc(body)}</p>` });

/* ---------- photos ---------- */

let photoUrls = [];
function revokePhotoUrls() { photoUrls.forEach((u) => URL.revokeObjectURL(u)); photoUrls = []; }

async function loadPhotos(root = document) {
  for (const img of root.querySelectorAll('img[data-photo]:not([src])')) {
    const rec = await DB.get('photos', img.dataset.photo).catch(() => null);
    if (!rec || !img.isConnected) continue;
    const url = URL.createObjectURL(rec.blob);
    photoUrls.push(url);
    img.src = url;
  }
}

async function resizeImage(file, max = 1600) {
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    if (bmp.close) bmp.close();
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.82));
    return blob || file;
  } catch {
    return file; // A format this browser can't decode (e.g. HEIC outside Safari): keep the original.
  }
}

function zoomPhoto(src) {
  const lb = document.getElementById('lightbox');
  lb.querySelector('img').src = src;
  lb.hidden = false;
}

/* ---------- components ---------- */

const pill = (t, tone = '') => (t ? `<span class="pill ${tone}">${esc(t)}</span>` : '');
const statusPill = (s) => pill(s, STATUS_TONE[s] || '');

const ratingDots = (n) => (n ? `<span class="dots" aria-label="${n} out of 5">${[1, 2, 3, 4, 5].map((i) => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>` : '');

// Leading square on list rows: the record's first photo, or a tinted icon.
const avatar = (rec, ic, tone = '') => `<span class="avatar ${tone}">${rec?.photos?.length ? `<img data-photo="${rec.photos[0]}" alt="">` : icon(ic)}</span>`;

function row({ href, lead, title, sub, meta = '', trail = '', wrap = false }) {
  return `<a class="row${wrap ? ' wrap' : ''}" href="${href}">${lead}<span class="row-main"><span class="row-title">${title}</span>${sub ? `<span class="row-sub">${sub}</span>` : ''}${meta ? `<span class="row-meta">${meta}</span>` : ''}</span>${trail ? `<span class="row-trail">${trail}</span>` : ''}${icon('right', 'chev')}</a>`;
}

const metrics = (list) => `<div class="metrics">${list.map(([label, value, unit = '']) => `<div class="metric"><b>${esc(value)}<small>${esc(unit)}</small></b><span>${esc(label)}</span></div>`).join('')}</div>`;

function segmented(items, current, act) {
  return `<div class="seg" role="tablist">${items.map(([k, label]) => `<button role="tab" aria-selected="${k === current}" data-act="${act}" data-v="${esc(k)}">${label}</button>`).join('')}</div>`;
}

function chipBar(items, current, act) {
  return `<div class="chipbar" role="toolbar">${items.map(([k, label]) => `<button class="chip" aria-pressed="${k === current}" data-act="${act}" data-v="${esc(k)}">${esc(label)}</button>`).join('')}</div>`;
}

function emptyState(ic, title, body, action = '') {
  return `<div class="empty"><span class="empty-art">${icon(ic)}</span><h3>${esc(title)}</h3>${body ? `<p>${body}</p>` : ''}${action}</div>`;
}

const section = (title, body, extra = '') => `<section class="section">${title ? `<div class="section-head"><h2>${esc(title)}</h2>${extra}</div>` : ''}${body}</section>`;
