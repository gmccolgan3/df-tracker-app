'use strict';
/* Top-level screens: Today, Garden, Breeding, Insights, Settings, Help. */

const view = document.getElementById('view');

/* ---------- Today ---------- */

function todayTasks() {
  const t = today();
  const tasks = [];
  for (const c of [...S.crosses].filter((c) => c.fruitSet == null && c.date).sort((a, b) => natural(a.date, b.date))) {
    const n = daysBetween(c.date, t);
    tasks.push({ icon: 'clock', tone: 'warn', href: `#/crosses/${c.id}`, title: `Did ${c.code} set fruit?`,
      sub: `${crossParents(c)} · pollinated ${n === 0 ? 'today' : n === 1 ? 'yesterday' : n + ' days ago'}` });
  }
  for (const c of S.crosses.filter((c) => num(c.fruitSet) > 0 && !S.fruits.some((f) => f.crossId === c.id) && !num(c.seedsSown))) {
    const from = addDays(c.date, 30), to = addDays(c.date, 50);
    tasks.push({ icon: 'fruit', tone: 'brand', href: `#/crosses/${c.id}`, title: `${c.code} is ripening`,
      sub: t > to ? 'Should be ripe by now. Log the harvest.' : `${crossParents(c)} · ripe around ${fmtShort(from)} – ${fmtShort(to)}` });
  }
  for (const p of S.plants.filter((p) => p.grafted === 'Yes' && (!p.graftTook || p.graftTook === 'Waiting') && p.graftDate && daysBetween(p.graftDate, t) >= 14)) {
    tasks.push({ icon: 'graft', tone: 'green', href: `#/plants/${p.id}`, title: `Did the graft on ${p.tag} take?`, sub: `Grafted ${daysBetween(p.graftDate, t)} days ago` });
  }
  const hasData = S.plants.length || S.crosses.length || S.fruits.length;
  const age = SETTINGS.lastBackup ? daysBetween(SETTINGS.lastBackup.slice(0, 10), t) : null;
  if (hasData && (age == null || age > 30)) {
    tasks.push({ icon: 'shield', tone: 'blue', act: 'backup', title: 'Back up your notebook',
      sub: age == null ? 'Your records live only on this device' : `Last backup was ${age} days ago` });
  }
  return tasks;
}

function taskRow(t) {
  const inner = `<span class="avatar ${t.tone}">${icon(t.icon)}</span><span class="row-main"><span class="row-title">${esc(t.title)}</span><span class="row-sub">${esc(t.sub)}</span></span>${icon('right', 'chev')}`;
  return t.href ? `<a class="row wrap" href="${t.href}">${inner}</a>` : `<button class="row wrap" data-act="${t.act}">${inner}</button>`;
}

function activity() {
  const ev = [];
  S.crosses.forEach((c) => ev.push({ date: c.date, icon: 'cross', href: `#/crosses/${c.id}`, text: `Pollinated ${crossParents(c)}`, sub: c.code }));
  S.fruits.forEach((f) => ev.push({ date: f.harvestDate, icon: 'fruit', href: `#/fruits/${f.id}`, text: `Harvested from ${plantLabel(byId('plants', f.plantId))}`, sub: [num(f.weight) && fmt(f.weight) + ' g', brixOf(f) != null && fmt(brixOf(f), 1) + ' °Bx'].filter(Boolean).join(' · ') }));
  S.logs.forEach((l) => ev.push({ date: l.date, icon: 'note', href: `#/logs/${l.id}`, text: `${l.kind}${num(l.count) != null ? ` (${l.count})` : ''}`, sub: byId('plants', l.plantId)?.tag || '' }));
  S.plants.forEach((p) => ev.push({ date: p.date || p.createdAt?.slice(0, 10), icon: 'sprout', href: `#/plants/${p.id}`, text: p.origin === 'Seedling' ? `Seedling ${p.tag} came up` : `Added ${plantLabel(p)}`, sub: p.origin === 'Cutting' ? 'Cutting' : '' }));
  return ev.filter((e) => e.date).sort((a, b) => natural(b.date, a.date)).slice(0, 6);
}

function viewToday() {
  const longDate = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  setBar({ title: 'Today', sub: longDate, large: true, actions: barLink('settings', 'Settings', '#/settings') });

  if (!S.plants.length && !S.crosses.length) {
    view.innerHTML = `
      <section class="welcome">
        <img class="welcome-art" src="icons/icon.svg" alt="">
        <h2>A notebook for your dragon fruit</h2>
        <p>Every plant, every pollination and every fruit in one place, so you can see which pairings are worth repeating.</p>
      </section>
      <div class="options">
        ${S.varieties.length
          ? `<a class="option" href="#/varieties"><span class="avatar green">${icon('tag')}</span><span><b>Your ${plural(S.varieties.length, 'variety', 'varieties')}</b><small>Browse and edit the list</small></span>${icon('right', 'chev')}</a>`
          : `<button class="option" data-act="seed-varieties"><span class="avatar green">${icon('tag')}</span><span><b>Start with ${VARIETY_SEED.length} known varieties</b><small>Species, colors and reported traits, ready to edit</small></span>${icon('right', 'chev')}</button>`}
        <a class="option" href="#/plants/new"><span class="avatar brand">${icon('sprout')}</span><span><b>Add your first plant</b><small>Use the tag that's on its label</small></span>${icon('right', 'chev')}</a>
        <button class="option" data-act="demo"><span class="avatar">${icon('flask')}</span><span><b>Explore a sample garden</b><small>Made-up plants and crosses you can remove later</small></span>${icon('right', 'chev')}</button>
      </div>`;
    return;
  }

  const year = String(new Date().getFullYear());
  const crossesYr = S.crosses.filter((c) => c.date?.startsWith(year));
  const decided = crossesYr.filter((c) => num(c.fruitSet) != null && num(c.flowers));
  const setRate = decided.length ? sum(decided.map((c) => c.fruitSet)) / sum(decided.map((c) => c.flowers)) : null;
  const fruitsYr = S.fruits.filter((f) => f.harvestDate?.startsWith(year));
  const seedlings = S.plants.filter((p) => p.origin === 'Seedling' && p.status === 'Active');
  const best = [...S.fruits].filter((f) => num(f.overall) != null || brixOf(f) != null)
    .sort((a, b) => (num(b.overall) ?? 0) - (num(a.overall) ?? 0) || (brixOf(b) ?? 0) - (brixOf(a) ?? 0))[0];
  const tasks = todayTasks();
  const ev = activity();

  view.innerHTML = `
    ${tasks.length ? section('To do', `<div class="card list">${tasks.map(taskRow).join('')}</div>`, `<span class="badge">${tasks.length}</span>`) : `
      <div class="all-clear">${icon('check')}<span><b>Nothing waiting on you</b><small>New pollinations and grafts show up here when they need checking.</small></span></div>`}
    ${section(`${year} so far`, metrics([
      ['Crosses', crossesYr.length],
      ['Set rate', setRate == null ? '–' : Math.round(setRate * 100), setRate == null ? '' : '%'],
      ['Harvested', fruitsYr.length],
      ['Seedlings', seedlings.length],
    ]))}
    ${best ? section('Best fruit so far', `<div class="card list">${fruitRow(best)}</div>`, `<a class="link" href="#/insights">Rankings</a>`) : ''}
    ${ev.length ? section('Recent', `<div class="card list feed">${ev.map((e) => `<a class="row compact wrap" href="${e.href}"><span class="dot-ico">${icon(e.icon)}</span><span class="row-main"><span class="row-title">${esc(e.text)}</span>${e.sub ? `<span class="row-sub">${esc(e.sub)}</span>` : ''}</span><span class="row-date">${esc(relDate(e.date))}</span></a>`).join('')}</div>`) : ''}
  `;
}

/* ---------- list rows ---------- */

function plantRow(p) {
  const tags = [p.origin === 'Seedling' ? pill('Seedling', 'brand') : p.origin === 'Cutting' ? pill('Cutting') : '', p.grafted === 'Yes' ? pill(p.graftTook === 'No' ? 'Graft failed' : 'Grafted', p.graftTook === 'No' ? 'dim' : 'green') : '', p.firstFlower && p.origin === 'Seedling' ? pill('Flowered') : ''].join('');
  return row({
    href: `#/plants/${p.id}`,
    lead: avatar(p, 'sprout', p.origin === 'Seedling' ? 'brand' : 'green'),
    title: esc(p.tag),
    sub: esc([plantKind(p), p.location].filter(Boolean).join(' · ')),
    meta: tags,
    trail: p.status !== 'Active' ? statusPill(p.status) : '',
  });
}

function varietyRow(v) {
  const n = S.plants.filter((p) => p.varietyId === v.id && p.status === 'Active').length;
  return row({
    href: `#/varieties/${v.id}`,
    lead: avatar(v, 'tag', v.origin === 'Own hybrid' ? 'brand' : fleshTone(v.fleshColor)),
    title: esc(v.name),
    sub: esc([v.fleshColor && v.fleshColor + ' flesh', v.skinColor && v.skinColor.toLowerCase() + ' skin'].filter(Boolean).join(', ') || shortSpecies(v.species)),
    meta: [v.origin === 'Own hybrid' ? pill('Own hybrid', 'brand') : '', v.selfFertile === 'Yes' ? pill('Self-fertile') : v.selfFertile === 'No' ? pill('Needs a pollinator') : ''].join(''),
    trail: n ? `<span class="trail-num">${n}<small>${n === 1 ? 'plant' : 'plants'}</small></span>` : '',
  });
}

function crossRow(c) {
  const s = crossStatus(c);
  return row({
    href: `#/crosses/${c.id}`,
    lead: `<span class="avatar code">${esc(c.code)}</span>`,
    title: esc(crossParents(c)),
    sub: esc([fmtShort(c.date), num(c.flowers) ? plural(c.flowers, 'flower') : '', num(c.fruitSet) > 0 ? `${c.fruitSet} set` : ''].filter(Boolean).join(' · ')),
    meta: statusPill(s),
    wrap: true,
  });
}

function fruitRow(f) {
  const p = byId('plants', f.plantId);
  const c = byId('crosses', f.crossId);
  return row({
    href: `#/fruits/${f.id}`,
    lead: avatar(f, 'fruit', fleshTone(f.fleshColor) || 'brand'),
    title: esc(p ? `${p.tag} · ${varietyName(p.varietyId) || (p.origin === 'Seedling' ? 'Seedling' : '')}`.replace(/ · $/, '') : '(deleted plant)'),
    sub: esc([fmtShort(f.harvestDate), num(f.weight) ? fmt(f.weight) + ' g' : '', c ? c.code : ''].filter(Boolean).join(' · ')),
    trail: `${brixOf(f) != null ? `<span class="trail-num">${fmt(brixOf(f), 1)}<small>°Bx</small></span>` : ''}${ratingDots(num(f.overall))}`,
  });
}

function logRow(l) {
  return row({
    href: `#/logs/${l.id}`,
    lead: avatar(l, 'note'),
    title: esc(l.kind + (num(l.count) != null ? ` · ${l.count}` : '')),
    sub: esc([fmtShort(l.date), byId('plants', l.plantId)?.tag].filter(Boolean).join(' · ')),
    meta: l.notes ? `<span class="clamp">${esc(l.notes)}</span>` : '',
  });
}

const fleshTone = (c) => ({ White: 'pale', 'Light pink': 'pink', Pink: 'pink', Red: 'brand', 'Magenta / purple': 'purple' }[c] || '');
const shortSpecies = (s) => (s ? s.replace(/\s*\(.*\)/, '') : '');

/* ---------- Garden ---------- */

const listState = { plants: { q: '', f: 'active' }, varieties: { q: '', f: 'all' }, crosses: { q: '', f: 'all' }, logs: { q: '', f: 'all' } };

const LISTS = {
  plants: {
    filters: [['active', 'Active'], ['seedlings', 'Seedlings'], ['grafted', 'Grafted'], ['retired', 'Retired'], ['all', 'All']],
    test: { active: (p) => p.status === 'Active', seedlings: (p) => p.origin === 'Seedling' && p.status === 'Active', grafted: (p) => p.grafted === 'Yes', retired: (p) => p.status !== 'Active', all: () => true },
    sort: (a, b) => natural(a.tag, b.tag),
    text: (p) => [plantLabel(p), plantKind(p), p.location, p.notes].join(' '),
    rowFn: plantRow,
  },
  varieties: {
    filters: [['all', 'All'], ['white', 'White flesh'], ['red', 'Red & purple'], ['yellow', 'Yellow skin'], ['own', 'Own hybrids']],
    test: { all: () => true, white: (v) => v.fleshColor === 'White', red: (v) => ['Red', 'Magenta / purple', 'Pink', 'Light pink'].includes(v.fleshColor), yellow: (v) => v.skinColor === 'Yellow', own: (v) => v.origin === 'Own hybrid' },
    sort: (a, b) => natural(a.name, b.name),
    text: (v) => [v.name, v.synonyms, v.traits, v.notes, v.source].join(' '),
    rowFn: varietyRow,
  },
  crosses: {
    filters: [['all', 'All'], ['Waiting', 'Waiting'], ['Fruit set', 'Fruit set'], ['Seedlings', 'Seedlings'], ['Failed', 'Not set']],
    test: { all: () => true, Waiting: (c) => crossStatus(c) === 'Waiting', 'Fruit set': (c) => ['Fruit set', 'Seeds sown'].includes(crossStatus(c)), Seedlings: (c) => crossStatus(c) === 'Seedlings', Failed: (c) => crossStatus(c) === 'Failed' },
    sort: (a, b) => natural(b.date, a.date) || natural(b.code, a.code),
    text: (c) => [crossLabel(c), c.notes].join(' '),
    rowFn: crossRow,
  },
  logs: {
    filters: [['all', 'All'], ...LOG_KINDS.slice(0, 2).map((k) => [k, k]), ['Pest / disease', 'Problems']],
    test: new Proxy({}, { get: (_, k) => (k === 'all' ? () => true : (l) => l.kind === k) }),
    sort: (a, b) => natural(b.date, a.date),
    text: (l) => [plantLabel(byId('plants', l.plantId)), l.kind, l.notes].join(' '),
    rowFn: logRow,
  },
};

function listBody(store, { grouped = false } = {}) {
  const cfg = LISTS[store];
  const st = listState[store];
  return `
    <label class="search">${icon('search')}<input type="search" data-search="${store}" placeholder="Search ${META[store].pl}" value="${esc(st.q)}" aria-label="Search ${META[store].pl}"></label>
    ${chipBar(cfg.filters, st.f, `filter-${store}`)}
    <div id="list" data-store="${store}" data-grouped="${grouped}"></div>`;
}

function drawList() {
  const el = document.getElementById('list');
  if (!el) return;
  const store = el.dataset.store;
  const cfg = LISTS[store];
  const st = listState[store];
  const q = st.q.trim().toLowerCase();
  let rows = S[store].filter(cfg.test[st.f] || (() => true));
  if (q) rows = rows.filter((r) => cfg.text(r).toLowerCase().includes(q));
  rows.sort(cfg.sort);
  if (!S[store].length) {
    el.innerHTML = emptyByStore(store);
  } else if (!rows.length) {
    el.innerHTML = `<p class="count">No ${META[store].pl} match.</p>`;
  } else if (el.dataset.grouped === 'true') {
    // Group crosses by year, newest first.
    const groups = new Map();
    rows.forEach((r) => { const y = (r.date || '').slice(0, 4) || 'No date'; if (!groups.has(y)) groups.set(y, []); groups.get(y).push(r); });
    el.innerHTML = [...groups].map(([y, list]) => `<p class="count">${esc(y)} · ${plural(list.length, META[store].one, META[store].pl)}</p><div class="card list">${list.map(cfg.rowFn).join('')}</div>`).join('');
  } else {
    el.innerHTML = `<p class="count">${plural(rows.length, META[store].one, META[store].pl)}</p><div class="card list">${rows.map(cfg.rowFn).join('')}</div>`;
  }
  loadPhotos(el);
}

function emptyByStore(store) {
  const add = (label) => `<a class="btn primary" href="#/${store}/new">${icon('plus')}${label}</a>`;
  if (store === 'plants') return emptyState('sprout', 'No plants yet', 'Add each plant with the tag on its label. Cuttings and seedlings can point back to their parents.', add('Add a plant'));
  if (store === 'varieties') return emptyState('tag', 'No varieties yet', 'Add the varieties you grow, or start from a list of known ones.',
    `<div class="btn-row"><button class="btn primary" data-act="seed-varieties">Load ${VARIETY_SEED.length} known varieties</button><a class="btn" href="#/varieties/new">Add one</a></div>`);
  if (store === 'crosses') return emptyState('cross', 'No crosses yet', 'On pollination night, tap + and choose Pollination. Write the cross code on the flower tag.', add('Record a pollination'));
  return emptyState('note', 'No journal entries yet', 'Record flowering, pruning, feeding and problems from a plant’s page.');
}

function viewGarden(seg) {
  setBar({ title: 'Garden', large: true });
  view.innerHTML = `
    ${segmented([['plants', `Plants <span class="seg-n">${S.plants.filter((p) => p.status === 'Active').length}</span>`], ['varieties', `Varieties <span class="seg-n">${S.varieties.length}</span>`]], seg, 'garden-seg')}
    ${listBody(seg)}`;
  drawList();
}

function viewBreeding() {
  setBar({ title: 'Breeding', large: true });
  view.innerHTML = listBody('crosses', { grouped: true });
  drawList();
}

function viewJournal() {
  setBar({ title: 'Journal', back: '#/settings' });
  view.innerHTML = listBody('logs');
  drawList();
}

/* ---------- Insights ---------- */

const insightState = { tab: 'fruit', rank: { fruit: 'score', crosses: 'score', seedlings: 'score' } };

const RANKS = {
  fruit: {
    options: [['score', 'Score'], ['brix', 'Brix'], ['weight', 'Weight'], ['newest', 'Newest']],
    rows: () => S.fruits,
    value: { score: (f) => num(f.overall), brix: brixOf, weight: (f) => num(f.weight), newest: (f) => f.harvestDate || null },
    show: { score: (v) => `${v}<small>/5</small>`, brix: (v) => `${fmt(v, 1)}<small>°Bx</small>`, weight: (v) => `${fmt(v)}<small>g</small>`, newest: (v) => esc(fmtShort(v)) },
    item: (f) => ({ href: `#/fruits/${f.id}`, lead: avatar(f, 'fruit', fleshTone(f.fleshColor) || 'brand'), title: plantLabel(byId('plants', f.plantId)), sub: [fmtShort(f.harvestDate), byId('crosses', f.crossId)?.code].filter(Boolean).join(' · ') }),
    summary: (list) => { const s = fruitStats(list); return `${plural(s.n, 'fruit', 'fruit')} · average ${fmt(s.weight)} g · ${fmt(s.brix, 1)} °Bx · ${fmt(s.overall, 1)}/5`; },
  },
  crosses: {
    options: [['score', 'Fruit score'], ['brix', 'Brix'], ['set', 'Fruit set'], ['newest', 'Newest']],
    rows: () => S.crosses.map((c) => ({ c, s: crossStats(c) })),
    value: { score: (r) => r.s.avgOverall, brix: (r) => r.s.avgBrix, set: (r) => r.s.setRate, newest: (r) => r.c.date || null },
    show: { score: (v) => `${fmt(v, 1)}<small>/5</small>`, brix: (v) => `${fmt(v, 1)}<small>°Bx</small>`, set: (v) => `${Math.round(v * 100)}<small>%</small>`, newest: (v) => esc(fmtShort(v)) },
    item: (r) => ({ href: `#/crosses/${r.c.id}`, lead: `<span class="avatar code">${esc(r.c.code)}</span>`, title: crossParents(r.c), sub: [plural(r.s.fruits.length, 'fruit', 'fruit'), r.s.seedlings.length ? plural(r.s.seedlings.length, 'seedling') : ''].filter(Boolean).join(' · ') }),
    summary: (list) => `${plural(list.length, 'cross', 'crosses')} · ${plural(sum(list.map((r) => r.s.fruits.length)), 'fruit', 'fruit')} logged`,
  },
  seedlings: {
    options: [['score', 'Fruit score'], ['brix', 'Brix'], ['flower', 'Fastest to flower'], ['vigor', 'Vigor']],
    rows: () => S.plants.filter((p) => p.origin === 'Seedling').map((p) => ({ p, s: fruitStats(S.fruits.filter((f) => f.plantId === p.id)) })),
    value: { score: (r) => r.s.overall, brix: (r) => r.s.brix, flower: (r) => monthsToFlower(r.p), vigor: (r) => num(r.p.vigor) },
    asc: { flower: true },
    show: { score: (v) => `${fmt(v, 1)}<small>/5</small>`, brix: (v) => `${fmt(v, 1)}<small>°Bx</small>`, flower: (v) => `${fmt(v)}<small>mo</small>`, vigor: (v) => `${v}<small>/5</small>` },
    item: (r) => ({ href: `#/plants/${r.p.id}`, lead: avatar(r.p, 'sprout', 'brand'), title: r.p.tag + (varietyName(r.p.varietyId) ? ' · ' + varietyName(r.p.varietyId) : ''), sub: [byId('crosses', r.p.crossId) ? crossParents(byId('crosses', r.p.crossId)) : '', r.p.status !== 'Active' ? r.p.status : ''].filter(Boolean).join(' · ') }),
    summary: (list) => `${plural(list.length, 'seedling')} · ${list.filter((r) => r.p.firstFlower).length} flowered · ${list.filter((r) => r.s.n).length} fruited`,
  },
};

function viewInsights() {
  setBar({ title: 'Insights', large: true });
  const tab = insightState.tab;
  const cfg = RANKS[tab];
  const rank = insightState.rank[tab];
  const all = cfg.rows();
  const getV = cfg.value[rank];
  const ranked = all.filter((r) => getV(r) != null);
  const dir = cfg.asc?.[rank] ? 1 : -1;
  ranked.sort((a, b) => { const x = getV(a), y = getV(b); return (typeof x === 'number' ? x - y : natural(x, y)) * dir; });
  const nums = ranked.map(getV).filter((v) => typeof v === 'number');
  const max = Math.max(...nums, 0), min = Math.min(...nums, 0);
  const isDate = rank === 'newest';

  let body;
  if (!all.length) {
    body = tab === 'fruit' ? emptyState('fruit', 'No fruit logged yet', 'Tap + and choose Harvest when you pick one. Weight, Brix and a score are enough to start ranking.')
      : tab === 'crosses' ? emptyState('cross', 'No crosses yet', 'Crosses are ranked by the fruit they produce.')
        : emptyState('sprout', 'No seedlings yet', 'Add seedlings from a cross’s page once the seeds come up.');
  } else if (!ranked.length) {
    body = `<p class="count">Nothing recorded for this yet.</p>`;
  } else {
    body = `<p class="count">${esc(cfg.summary(all))}</p>
      <div class="card list ranked">${ranked.map((r, i) => {
        const it = cfg.item(r);
        const v = getV(r);
        const w = isDate ? 0 : cfg.asc?.[rank] ? (max === min ? 100 : 100 - ((v - min) / (max - min)) * 70) : max ? (v / max) * 100 : 0;
        return `<a class="row rank-row" href="${it.href}"><span class="rank">${i + 1}</span>${it.lead}<span class="row-main"><span class="row-title">${esc(it.title)}</span><span class="row-sub">${esc(it.sub)}</span>${isDate ? '' : `<span class="bar-track"><span style="width:${Math.max(4, w)}%"></span></span>`}</span><span class="rank-val">${cfg.show[rank](v)}</span></a>`;
      }).join('')}</div>
      ${all.length > ranked.length ? `<p class="count">${all.length - ranked.length} without this measurement ${all.length - ranked.length === 1 ? 'is' : 'are'} not shown.</p>` : ''}`;
  }

  view.innerHTML = `
    ${segmented([['fruit', 'Fruit'], ['crosses', 'Crosses'], ['seedlings', 'Seedlings']], tab, 'insight-tab')}
    ${chipBar(cfg.options, rank, 'insight-rank')}
    ${body}`;
  loadPhotos(view);
}

/* ---------- Settings ---------- */

function settingRow({ ic, tone = '', label, sub = '', href, act, danger, trail = '' }) {
  const inner = `<span class="avatar ${tone}">${icon(ic)}</span><span class="row-main"><span class="row-title">${esc(label)}</span>${sub ? `<span class="row-sub">${esc(sub)}</span>` : ''}</span>${trail}${href ? icon('right', 'chev') : ''}`;
  return href ? `<a class="row wrap${danger ? ' danger' : ''}" href="${href}">${inner}</a>` : `<button class="row wrap${danger ? ' danger' : ''}" data-act="${act}">${inner}</button>`;
}

function viewSettings() {
  setBar({ title: 'Settings', back: '#/home' });
  const last = SETTINGS.lastBackup ? `Last backup ${relDate(SETTINGS.lastBackup).toLowerCase()}` : 'Never backed up';
  const nFields = DATA_STORES.reduce((n, s) => n + (SETTINGS.customFields?.[s]?.length || 0), 0);
  view.innerHTML = `
    ${section('Your data', `<div class="card list">
      ${settingRow({ ic: 'shield', tone: 'blue', label: 'Back up now', sub: last, act: 'backup' })}
      ${settingRow({ ic: 'upload', tone: 'blue', label: 'Restore or merge a backup', sub: 'Bring in a backup file from this or another device', act: 'restore' })}
      ${settingRow({ ic: 'table', tone: 'green', label: 'Export to a spreadsheet', sub: 'CSV files for Excel, Google Sheets or Numbers', act: 'export' })}
    </div>
    <p class="fine">Records are stored in this browser on this device, and nowhere else. Back up now and then and keep the file somewhere safe.</p>`)}
    ${section('Make it yours', `<div class="card list">
      ${settingRow({ ic: 'sliders', label: 'Your own fields', sub: nFields ? `${plural(nFields, 'extra field')}` : 'Track measurements the app doesn’t have', href: '#/settings/fields' })}
      ${settingRow({ ic: 'tag', tone: 'green', label: 'Load known varieties', sub: `Adds any of the ${VARIETY_SEED.length} starter varieties you don’t have yet`, act: 'seed-varieties' })}
      ${settingRow({ ic: 'note', label: 'All journal entries', sub: plural(S.logs.length, 'entry', 'entries'), href: '#/logs' })}
    </div>`)}
    ${section('Help', `<div class="card list">
      ${settingRow({ ic: 'book', label: 'How it works', sub: 'A season step by step, and what the measurements mean', href: '#/help' })}
      ${hasDemo() ? settingRow({ ic: 'flask', label: 'Remove the sample garden', sub: 'Your own records stay', act: 'undemo' }) : settingRow({ ic: 'flask', label: 'Load a sample garden', sub: 'Made-up records to look around with', act: 'demo' })}
    </div>`)}
    ${section('', `<div class="card list">${settingRow({ ic: 'trash', tone: 'danger', label: 'Delete all data on this device', act: 'wipe', danger: true })}</div>
      <p class="fine" id="storageInfo"></p>`)}`;
  storageInfo();
}

async function storageInfo() {
  const el = document.getElementById('storageInfo');
  if (!el) return;
  const parts = [];
  try {
    if (navigator.storage?.estimate) { const e = await navigator.storage.estimate(); parts.push(`Using about ${fmt(e.usage / 1048576, 1)} MB.`); }
    if (navigator.storage?.persisted) parts.push((await navigator.storage.persisted()) ? 'The browser has agreed to keep this data.' : 'The browser may clear this data if the device runs short of space, which is another reason to keep backups.');
  } catch { /* not supported */ }
  el.textContent = parts.join(' ');
}

function openExportSheet() {
  openSheet({
    title: 'Export to a spreadsheet',
    sub: 'One CSV file per list',
    items: DATA_STORES.map((s) => ({ icon: META[s].icon, label: META[s].many, sub: plural(S[s].length, 'row'), run: () => csvFor(s) })),
  });
}

const fieldDraft = { store: 'fruits', type: 'number' };

function viewFields() {
  setBar({ title: 'Your own fields', back: '#/settings' });
  const cf = SETTINGS.customFields || {};
  const existing = DATA_STORES.filter((s) => cf[s]?.length);
  const typeLabels = { number: 'Number', rating: 'Rating 1–5', text: 'Short text', textarea: 'Long text', select: 'Choice list', date: 'Date' };
  view.innerHTML = `
    <p class="lead">Add a measurement and it appears in that form under “Your own fields”, on detail pages and in spreadsheet exports.</p>
    ${existing.length ? existing.map((s) => section(META[s].many, `<div class="card list">${cf[s].map((f) => `<div class="row static"><span class="row-main"><span class="row-title">${esc(f.label)}</span><span class="row-sub">${esc(typeLabels[f.type] || f.type)}${f.unit ? ' · ' + esc(f.unit) : ''}${f.options ? ' · ' + esc(f.options.join(', ')) : ''}</span></span><button class="icon-btn" aria-label="Remove ${esc(f.label)}" data-act="del-field" data-store="${s}" data-k="${f.k}">${icon('trash')}</button></div>`).join('')}</div>`)).join('') : ''}
    ${section('Add a field', `
      <form id="fieldForm" class="card pad form">
        <div class="field"><span class="label">Add it to</span>${chipBar(DATA_STORES.filter((s) => s !== 'logs').map((s) => [s, META[s].many]), fieldDraft.store, 'fd-store')}</div>
        <div class="field"><label class="label" for="fdLabel">Name</label><input id="fdLabel" type="text" required placeholder="e.g. Skin gloss"></div>
        <div class="field"><span class="label">Kind</span>${chipBar(Object.entries(typeLabels), fieldDraft.type, 'fd-type')}</div>
        <div class="field" ${fieldDraft.type === 'number' ? '' : 'hidden'}><label class="label" for="fdUnit">Unit <span class="opt">optional</span></label><input id="fdUnit" type="text" placeholder="e.g. mm"></div>
        <div class="field" ${fieldDraft.type === 'select' ? '' : 'hidden'}><label class="label" for="fdOpts">Choices</label><input id="fdOpts" type="text" placeholder="Low, Medium, High"><small class="hint">Separate them with commas</small></div>
        <button class="btn primary block" type="submit">${icon('plus')}Add field</button>
      </form>`)}`;
  view.querySelector('#fieldForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const label = view.querySelector('#fdLabel').value.trim();
    if (!label) { view.querySelector('#fdLabel').focus(); return; }
    const options = view.querySelector('#fdOpts').value.split(',').map((s) => s.trim()).filter(Boolean);
    if (fieldDraft.type === 'select' && !options.length) { toast('Add at least one choice'); return; }
    await addCustomField(fieldDraft.store, label, fieldDraft.type, view.querySelector('#fdUnit').value.trim(), options);
    toast(`Added “${label}” to ${META[fieldDraft.store].many}`);
    viewFields();
  });
}

/* ---------- Help ---------- */

function viewHelp() {
  setBar({ title: 'How it works', back: '#/settings' });
  view.innerHTML = `
    <article class="card pad prose">
      <p class="lead">Every plant gets a tag and every pollination gets a cross code. Fruit and seedlings point back to the cross they came from, so you can trace any plant’s family and see which pairings are worth repeating.</p>
      <h2>A season, step by step</h2>
      <ol>
        <li><b>Varieties.</b> Add each variety once, or load the known ones from Settings.</li>
        <li><b>Plants.</b> Add each plant with its tag. Cuttings point to the plant they were cut from; grafted plants record their rootstock.</li>
        <li><b>Pollination night.</b> Tap <b>+</b>, then <b>Pollination</b>. The seed parent ♀ is the plant whose flower you pollinate; the pollen parent ♂ is where the pollen came from. Write the cross code on a tag on the flower.</li>
        <li><b>A week or two later.</b> Today asks whether it set fruit. One tap records the answer.</li>
        <li><b>Harvest.</b> Tap <b>+</b>, then <b>Harvest</b>. Weight, Brix and an overall score are enough; size, looks and taste are there when you want them.</li>
        <li><b>Seeds.</b> Record seeds sown and how many came up on the cross, then add the promising seedlings.</li>
        <li><b>Years later.</b> Log the seedlings’ own fruit. When one is a keeper, open it, tap <b>⋯</b> and choose <b>Name as a variety</b>.</li>
      </ol>
      <h2>What the numbers mean</h2>
      <dl>
        <dt>Brix (°Bx)</dt><dd>Sugar content, read with a handheld refractometer. Squeeze a drop of flesh onto the glass. Readings at the center and near the peel show how evenly sweet the fruit is.</dd>
        <dt>Fruit set</dt><dd>Fruits set ÷ flowers pollinated. The clearest sign of whether two plants are compatible.</dd>
        <dt>Edible share</dt><dd>Flesh weight ÷ whole weight. Thin-peeled fruit scores higher.</dd>
        <dt>Length ÷ width</dt><dd>Shape as a number. About 1 is round; 1.3 and up is long.</dd>
        <dt>Scores</dt><dd>1–5 scales. Score fruit the same way each time, ideally soon after harvest at room temperature.</dd>
      </dl>
      <h2>Keeping your records safe</h2>
      <p>Records live in this browser on this device only. Use <a href="#/settings">Settings → Back up now</a> regularly. To share with someone, send them a backup file; they choose <b>Merge</b> to bring it into their own copy.</p>
      <h2>Put it on your phone</h2>
      <p>Open the app’s web address and choose <b>Add to Home Screen</b> (iPhone: the Share button; Android: the ⋮ menu). It then opens like an app and works without a connection.</p>
    </article>`;
}
