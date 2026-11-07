'use strict';
/* Dragon Fruit Tracker: a breeding notebook that runs entirely in the browser.
   Records are kept in memory (S) and mirrored to IndexedDB on every save.
   This file holds the router, the tab bar and the page-wide event handling. */

/* ---------- navigation ---------- */

const navStack = [];
function trackNav() {
  const h = location.hash || '#/home';
  if (navStack.length > 1 && navStack[navStack.length - 2] === h) navStack.pop();
  else if (navStack[navStack.length - 1] !== h) navStack.push(h);
}
function replaceRoute(hash) { navStack.pop(); location.replace(hash); }
function goBack() { if (navStack.length > 1) history.back(); else location.hash = barParent; }
function parseHash() {
  const raw = (location.hash || '#/home').slice(1);
  const [path, qs] = raw.split('?');
  return [path.split('/').filter(Boolean), Object.fromEntries(new URLSearchParams(qs || ''))];
}

const TAB_OF = { home: 'home', plants: 'garden', varieties: 'garden', crosses: 'breeding', insights: 'insights', fruits: 'garden' };

function render() {
  trackNav();
  revokePhotoUrls();
  closeLayer(true);
  document.body.classList.remove('form-mode');
  currentMenu = null;
  const [parts, query] = parseHash();
  const top = parts[0] || 'home';
  try {
    if (top === 'home') viewToday();
    else if (top === 'insights') viewInsights();
    else if (top === 'settings') parts[1] === 'fields' ? viewFields() : viewSettings();
    else if (top === 'help') viewHelp();
    else if (DATA_STORES.includes(top) && parts[1] === 'new') viewForm(top, null, query);
    else if (DATA_STORES.includes(top) && parts[2] === 'edit') viewForm(top, parts[1], query);
    else if (DATA_STORES.includes(top) && parts[1]) viewDetail(top, parts[1]);
    else if (top === 'plants' || top === 'varieties' || top === 'fruits') viewGarden(top, query);
    else if (top === 'crosses') viewBreeding();
    else if (top === 'logs') viewJournal();
    else viewToday();
  } catch (e) {
    console.error(e);
    view.innerHTML = emptyState('x', 'Something went wrong', esc(e.message), '<a class="btn" href="#/home">Go to Today</a>');
  }
  const tab = TAB_OF[top] || (['settings', 'help', 'logs'].includes(top) ? 'home' : '');
  document.querySelectorAll('.nav [data-tab]').forEach((a) => a.classList.toggle('on', a.dataset.tab === tab));
  view.classList.remove('enter');
  void view.offsetWidth;
  view.classList.add('enter');
  loadPhotos(view);
  if (!parts[2]) window.scrollTo(0, 0);
}

/* ---------- the + button ---------- */

function openAddSheet() {
  const [parts] = parseHash();
  const rec = parts[1] && DATA_STORES.includes(parts[0]) ? byId(parts[0], parts[1]) : null;
  const items = [];
  if (rec && parts[0] === 'plants') {
    items.push({ section: `For ${rec.tag}` },
      { icon: 'cross', label: 'Pollinate a flower on it', href: `#/crosses/new?seedPlantId=${rec.id}` },
      { icon: 'fruit', label: 'Tag a fruit on it', href: `#/fruits/new?plantId=${rec.id}` },
      { icon: 'note', label: 'Journal entry', href: `#/logs/new?plantId=${rec.id}` },
      { section: 'Something else' });
  } else if (rec && parts[0] === 'crosses') {
    items.push({ section: `For ${rec.code}` },
      { icon: 'fruit', label: 'Tag a fruit from this cross', href: `#/fruits/new?crossId=${rec.id}` },
      { icon: 'sprout', label: 'Add a seedling from it', href: `#/plants/new?origin=Seedling&crossId=${rec.id}` },
      { section: 'Something else' });
  } else if (rec && parts[0] === 'fruits' && rec.stage === 'Growing') {
    items.push({ section: `For ${rec.tag}` },
      { icon: 'check', label: 'Harvested today', run: () => setFruitStage(rec.id, 'Harvested') },
      { icon: 'x', label: 'It was lost', sub: 'Dropped, rotted or eaten by pests', run: () => setFruitStage(rec.id, 'Lost') },
      { section: 'Something else' });
  } else if (rec && parts[0] === 'fruits' && rec.stage === 'Harvested') {
    items.push({ section: `For ${rec.tag}` },
      { icon: 'drop', label: 'Eaten today', sub: 'Then record how it tasted', run: () => setFruitStage(rec.id, 'Eaten') },
      { section: 'Something else' });
  } else if (rec && parts[0] === 'varieties') {
    items.push({ section: `For ${rec.name}` },
      { icon: 'sprout', label: 'Add a plant of this variety', href: `#/plants/new?varietyId=${rec.id}` },
      { section: 'Something else' });
  }
  items.push(
    { icon: 'cross', label: 'Pollination', sub: 'Record a cross tonight', href: '#/crosses/new' },
    { icon: 'fruit', label: 'Fruit', sub: 'Tag a pollinated fruit and follow it to harvest', href: '#/fruits/new' },
    { icon: 'note', label: 'Journal entry', sub: 'Flowering, pruning, feeding, problems', href: '#/logs/new' },
    { icon: 'sprout', label: 'Plant', sub: 'A new plant, cutting or seedling', href: '#/plants/new' },
    { icon: 'tag', label: 'Variety', sub: 'Add to your list of varieties', href: '#/varieties/new' },
  );
  openSheet({ title: 'Add', items });
}

/* ---------- page-wide events ---------- */

document.addEventListener('click', async (e) => {
  const el = e.target.closest('[data-act]');
  if (!el || el.closest('#form') && ['step', 'unphoto'].includes(el.dataset.act)) return;
  const act = el.dataset.act;
  const v = el.dataset.v;
  switch (act) {
    case 'back': goBack(); break;
    case 'cancel': leaveForm(); break;
    case 'add': openAddSheet(); break;
    case 'menu': if (currentMenu) openSheet(currentMenu); break;
    case 'zoom': { const img = el.querySelector('img') || el; if (img.src) zoomPhoto(img.src); break; }
    case 'delete': deleteRecord(el.dataset.store, el.dataset.id); break;
    case 'name-variety': nameAsVariety(el.dataset.id); break;
    case 'fruit-set': setFruitSet(el.dataset.id, +v); break;
    case 'fruit-stage': setFruitStage(el.dataset.id, v); break;
    case 'graft-took': { const p = byId('plants', el.dataset.id); p.graftTook = v; await saveRecord('plants', p); toast(v === 'Yes' ? 'Graft took' : 'Marked as failed'); render(); break; }
    case 'detail-tab': switchDetailTab(v); break;
    case 'garden-seg': replaceRoute('#/' + v); break;
    case 'insight-tab': insightState.tab = v; viewInsights(); break;
    case 'insight-rank': insightState.rank[insightState.tab] = v; viewInsights(); break;
    case 'backup': backup(); break;
    case 'restore': chooseRestoreFile(); break;
    case 'export': openExportSheet(); break;
    case 'seed-varieties': loadStarterVarieties(); break;
    case 'demo': loadDemo(); break;
    case 'undemo': removeDemo(); break;
    case 'wipe': wipeAll(); break;
    case 'del-field': removeCustomField(el.dataset.store, el.dataset.k); break;
    case 'fd-store': fieldDraft.store = v; el.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === el)); break;
    case 'fd-type': {
      fieldDraft.type = v;
      el.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === el));
      document.getElementById('fdUnit').closest('.field').hidden = v !== 'number';
      document.getElementById('fdOpts').closest('.field').hidden = v !== 'select';
      break;
    }
    default:
      if (act.startsWith('filter-')) {
        listState[act.slice(7)].f = v;
        el.parentElement.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', c === el));
        drawList();
      }
  }
});

document.addEventListener('input', (e) => {
  const s = e.target.dataset?.search;
  if (s) { listState[s].q = e.target.value; drawList(); }
});

document.getElementById('lightbox').addEventListener('click', (e) => { e.currentTarget.hidden = true; });
window.addEventListener('hashchange', render);
window.addEventListener('beforeunload', (e) => { if (formDirty) e.preventDefault(); });

/* ---------- start ---------- */

document.querySelectorAll('[data-icon]').forEach((el) => el.insertAdjacentHTML('afterbegin', icon(el.dataset.icon)));

(async function start() {
  try {
    for (const s of DATA_STORES) S[s] = await DB.all(s);
    SETTINGS = { ...SETTINGS, ...((await DB.get('settings', 'settings')) || {}) };
    await upgradeFruit();
  } catch (e) {
    view.innerHTML = emptyState('x', 'Can’t open your notebook', `${esc(e.message)}<br>Private browsing can block storage. Try a normal window.`);
    return;
  }
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  render();
})();
