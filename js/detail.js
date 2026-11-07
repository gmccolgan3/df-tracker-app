'use strict';
/* Detail pages: a hero, key numbers, an optional "next step" prompt, and tabs. */

const detailTabs = {}; // remembers the open tab per record
let currentMenu = null; // items for the ⋯ menu on the page being shown

const listRoute = (store) => ({ varieties: '#/varieties', plants: '#/plants', crosses: '#/crosses', fruits: '#/fruits', logs: '#/logs' }[store]);

function valueHtml(f, v) {
  if (v == null || v === '') return '';
  switch (f.type) {
    case 'ref': { const r = byId(f.ref, v); return r ? `<a href="#/${f.ref}/${v}">${esc(LABEL[f.ref](r))}</a>` : '<span class="muted">(deleted)</span>'; }
    case 'date': return esc(fmtDate(v));
    case 'rating': return `${ratingDots(+v)}<span class="sr"> ${v} of 5</span>`;
    case 'number': return esc(fmt(v, 2)) + (f.unit ? `<small> ${esc(f.unit)}</small>` : '');
    case 'textarea': return `<span class="pre">${esc(v)}</span>`;
    case 'select': return esc(f.k === 'species' ? shortSpecies(v) : v);
    default: return esc(v);
  }
}

// All filled-in fields, grouped, as a compact grid of label/value tiles.
function specSheet(store, rec, skip = [], lead = [], emptyHtml = null) {
  const groups = [];
  let cur = { name: '', tiles: [] };
  let notes = '';
  for (const f of fieldsFor(store)) {
    if (f.group) { groups.push(cur); cur = { name: f.group, tiles: [] }; }
    if (skip.includes(f.k) || !visible(f, rec)) continue;
    if (f.k === 'notes') { notes = rec.notes || ''; continue; }
    const v = valueHtml(f, rec[f.k]);
    if (v) cur.tiles.push(`<div class="spec${f.type === 'textarea' ? ' wide' : ''}"><span>${esc(f.label)}</span><b>${v}</b></div>`);
  }
  groups.push(cur);
  if (lead.length) groups.unshift({ name: 'Worked out', tiles: lead.map(([k, v]) => `<div class="spec"><span>${esc(k)}</span><b>${esc(v)}</b></div>`) });
  const html = groups.filter((g) => g.tiles.length).map((g) => `<div class="spec-group">${g.name ? `<h3>${esc(g.name)}</h3>` : ''}<div class="specs">${g.tiles.join('')}</div></div>`).join('');
  const notesHtml = notes ? `<div class="spec-group"><h3>Notes</h3><p class="note-text">${esc(notes)}</p></div>` : '';
  if (!html && !notesHtml && emptyHtml != null) return emptyHtml;
  if (!html && !notesHtml) return `<div class="card pad"><p class="muted center">Nothing else recorded yet. Tap ${icon('edit', 'inline')} to add details.</p></div>`;
  return `<div class="card pad">${html}${notesHtml}</div>`;
}

const gallery = (ids = []) => (ids.length > 1 ? section('Photos', `<div class="gallery">${ids.map((id) => `<button class="thumb" data-act="zoom"><img data-photo="${id}" alt="Photo"></button>`).join('')}</div>`) : '');

function hero({ rec, ic, tone = '', eyebrow = '', title, sub = '', pills = '' }) {
  const photo = rec.photos?.[0];
  return `
    <header class="hero${photo ? ' with-photo' : ''}">
      ${photo ? `<button class="hero-photo" data-act="zoom"><img data-photo="${photo}" alt="Photo of ${esc(title)}"></button>` : ''}
      <div class="hero-body">
        ${photo ? '' : `<span class="hero-icon ${tone}">${icon(ic)}</span>`}
        <div class="hero-text">
          ${eyebrow ? `<p class="eyebrow">${esc(eyebrow)}</p>` : ''}
          <h2>${esc(title)}</h2>
          ${sub ? `<p class="hero-sub">${sub}</p>` : ''}
          ${pills ? `<div class="pills">${pills}</div>` : ''}
        </div>
      </div>
    </header>`;
}

const callout = ({ ic, tone = 'brand', title, body = '', actions = '' }) =>
  `<section class="callout ${tone}"><span class="callout-ico">${icon(ic)}</span><div class="callout-main"><b>${esc(title)}</b>${body ? `<p>${body}</p>` : ''}${actions ? `<div class="btn-row">${actions}</div>` : ''}</div></section>`;

// One parent of a ♀ × ♂ pair, linked to its plant when there is one.
function parentCard(id, sex, roleLabel, fallback) {
  const p = byId('plants', id);
  if (!p) return `<div class="parent"><span class="sex">${sex}</span><span class="avatar">${icon('sprout')}</span><b>${esc(fallback)}</b><small>${esc(roleLabel)}</small></div>`;
  return `<a class="parent" href="#/plants/${p.id}"><span class="sex">${sex}</span>${avatar(p, 'sprout', 'green')}<b>${esc(varietyName(p.varietyId) || p.tag)}</b><small>${esc(p.tag)} · ${esc(roleLabel)}</small></a>`;
}
function pollenCard(source, id) {
  if (source === 'Another plant') return parentCard(id, '♂', 'pollen', 'Not set');
  if (!source) return `<div class="parent"><span class="sex">♂</span><span class="avatar">${icon('flask')}</span><b>Not recorded</b><small>pollen</small></div>`;
  return `<div class="parent"><span class="sex">♂</span><span class="avatar">${icon(source === 'Self' ? 'sprout' : 'flask')}</span><b>${source === 'Self' ? 'Self' : 'Open'}</b><small>${source === 'Self' ? 'its own pollen' : 'insects or wind'}</small></div>`;
}
const duo = (mom, dad) => `<div class="duo">${mom}<span class="times" aria-label="crossed with">×</span>${dad}</div>`;

// Pollinated → Growing → Harvested → Eaten (or → Lost), with dates and the days between.
function fruitJourney(f) {
  const from = pollinatedOn(f);
  const lost = f.stage === 'Lost';
  const grew = f.harvestDate && from ? daysBetween(from, f.harvestDate) : lost && f.lostDate && from ? daysBetween(from, f.lostDate) : null;
  const steps = [
    ['Pollinated', from ? fmtShort(from) : 'Date not set'],
    ['Growing', f.stage === 'Growing' ? (from ? `Day ${daysBetween(from, today())}` : '') : grew != null ? plural(grew, 'day') : ''],
    ...(lost
      ? [['Lost', [fmtShort(f.lostDate), f.lostReason].filter(Boolean).join(' · ')]]
      : [['Harvested', fmtShort(f.harvestDate)], ['Eaten', fmtShort(f.eatenDate)]]),
  ];
  const now = { Growing: 1, Harvested: 2, Eaten: 3, Lost: 2 }[f.stage] ?? 1;
  return `<ol class="journey${lost ? ' lost' : ''}" aria-label="Where this fruit is">${steps.map(([label, sub], i) =>
    `<li class="${i < now ? 'done' : i === now ? 'now' : ''}"${i === now ? ' aria-current="step"' : ''}><b>${esc(label)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</li>`).join('')}</ol>`;
}

function viewDetail(store, id) {
  const rec = byId(store, id);
  if (!rec) {
    setBar({ title: 'Not found', back: listRoute(store) });
    view.innerHTML = emptyState(META[store].icon, `This ${META[store].one} is gone`, 'It may have been deleted.', `<a class="btn" href="${listRoute(store)}">Back to the list</a>`);
    return;
  }
  const page = DETAIL[store](rec);
  currentMenu = { title: page.menuTitle, items: [...(page.menu || []), { icon: 'edit', label: 'Edit', href: `#/${store}/${id}/edit` }, { icon: 'trash', label: `Delete this ${META[store].one}`, danger: true, run: () => deleteRecord(store, id) }] };
  setBar({ title: page.barTitle, back: listRoute(store), actions: barLink('edit', 'Edit', `#/${store}/${id}/edit`) + barBtn('more', 'More actions', 'data-act="menu"') });

  const key = store + ':' + id;
  const tabs = page.tabs || [];
  const tab = tabs.find((t) => t[0] === detailTabs[key]) ? detailTabs[key] : tabs[0]?.[0];
  view.innerHTML = `
    ${page.hero}
    ${page.metrics ? metrics(page.metrics) : ''}
    ${page.callout || ''}
    ${tabs.length > 1 ? `<div class="tabs-sticky">${segmented(tabs.map(([k, label]) => [k, label]), tab, 'detail-tab')}</div>` : ''}
    <div id="tabBody" data-key="${key}">${tabs.length ? tabs.find((t) => t[0] === tab)[2]() : page.body}</div>`;
}

function switchDetailTab(k) {
  const body = document.getElementById('tabBody');
  detailTabs[body.dataset.key] = k;
  const top = window.scrollY;
  render();
  window.scrollTo(0, Math.min(top, document.querySelector('.tabs-sticky')?.offsetTop ?? 0));
}

/* ---------- plant ---------- */

function pedigreeNode(plant, role, depth, seen) {
  const roleHtml = role ? `<span class="node-role">${esc(role)}</span>` : '';
  if (!plant) return `<li><div class="node">${roleHtml}<span class="muted">Unknown</span></div></li>`;
  const name = `<a href="#/plants/${plant.id}">${esc(plant.tag)}</a>${varietyName(plant.varietyId) ? ` <span>${esc(varietyName(plant.varietyId))}</span>` : ''}`;
  if (seen.has(plant.id) || depth > 8) return `<li><div class="node">${roleHtml}${name} …</div></li>`;
  seen = new Set(seen).add(plant.id);
  const sub = [];
  const notes = [];
  if (plant.origin === 'Seedling') {
    const c = byId('crosses', plant.crossId);
    if (c) {
      notes.push(`seedling of <a href="#/crosses/${c.id}">${esc(c.code)}</a>`);
      sub.push(pedigreeNode(byId('plants', c.seedPlantId), '♀', depth + 1, seen));
      if (c.pollenSource === 'Another plant') sub.push(pedigreeNode(byId('plants', c.pollenPlantId), '♂', depth + 1, seen));
      else sub.push(`<li><div class="node"><span class="node-role">♂</span><span class="muted">${c.pollenSource === 'Self' ? 'Self-pollinated' : 'Open-pollinated'}</span></div></li>`);
    } else notes.push('seedling');
  } else if (plant.origin === 'Cutting') {
    notes.push('cutting');
    sub.push(pedigreeNode(byId('plants', plant.parentPlantId), 'cut from', depth + 1, seen));
  } else {
    const v = byId('varieties', plant.varietyId);
    if (v && v.fromPlantId && v.fromPlantId !== plant.id) sub.push(pedigreeNode(byId('plants', v.fromPlantId), 'selected from', depth + 1, seen));
  }
  if (plant.grafted === 'Yes' && plant.rootstockId) notes.push(`on ${esc(varietyName(plant.rootstockId))} rootstock`);
  return `<li><div class="node">${roleHtml}${name}${notes.length ? `<small>${notes.join(' · ')}</small>` : ''}</div>${sub.length ? `<ul>${sub.join('')}</ul>` : ''}</li>`;
}

function familyTab(p) {
  const asMom = S.crosses.filter((c) => c.seedPlantId === p.id);
  const asDad = S.crosses.filter((c) => c.pollenPlantId === p.id && c.pollenSource === 'Another plant');
  const cuttings = S.plants.filter((x) => x.origin === 'Cutting' && x.parentPlantId === p.id);
  const kids = S.plants.filter((x) => x.origin === 'Seedling' && [...asMom, ...asDad].some((c) => c.id === x.crossId));
  const pollinated = S.fruits.filter((f) => f.pollenSource === 'Another plant' && f.pollenPlantId === p.id).sort(fruitOrder);
  return `
    ${section('Ancestry', `<div class="card pad"><ul class="tree">${pedigreeNode(p, '', 0, new Set())}</ul></div>`)}
    ${asMom.length || asDad.length ? section('Crosses it’s in', `<div class="card list">${[...asMom, ...asDad].sort((a, b) => natural(b.date, a.date)).map(crossRow).join('')}</div>`) : ''}
    ${pollinated.length ? section('Fruit it pollinated', `<div class="card list">${pollinated.map(fruitRow).join('')}</div>`) : ''}
    ${kids.length ? section('Seedlings', `<div class="card list">${kids.map(plantRow).join('')}</div>`) : ''}
    ${cuttings.length ? section('Cuttings taken', `<div class="card list">${cuttings.map(plantRow).join('')}</div>`) : ''}
    ${!asMom.length && !asDad.length && !cuttings.length && !pollinated.length ? `<p class="count">No offspring yet. Use ${icon('more', 'inline')} to pollinate a flower or take a cutting.</p>` : ''}`;
}

function fruitTab(fruits, addHref) {
  const add = `<a class="btn block" href="${addHref}">${icon('plus')}Tag a fruit</a>`;
  if (!fruits.length) return emptyState('fruit', 'No fruit yet', 'Tag each fruit when it’s pollinated and follow it through harvest and tasting. They show up here, with averages once there are a few.', add);
  const s = fruitStats(fruits);
  return `
    ${metrics([['Fruit', s.n], ['Avg weight', fmt(s.weight), 'g'], ['Avg Brix', fmt(s.brix, 1), '°Bx'], ['Avg score', fmt(s.overall, 1), '/5']])}
    <div class="card list">${fruits.sort(fruitOrder).map(fruitRow).join('')}</div>${add}`;
}

function journalTab(p) {
  const logs = S.logs.filter((l) => l.plantId === p.id).sort((a, b) => natural(b.date, a.date));
  const add = `<a class="btn block" href="#/logs/new?plantId=${p.id}">${icon('plus')}Add an entry</a>`;
  if (!logs.length) return emptyState('note', 'Nothing in the journal', 'Note flowering, pruning, feeding and problems as they happen.', add);
  return `<ol class="timeline">${logs.map((l) => `
    <li><a href="#/logs/${l.id}">
      <span class="tl-date">${esc(fmtShort(l.date))}</span>
      <span class="tl-main"><b>${esc(l.kind)}${num(l.count) != null ? ` · ${l.count}` : ''}</b>${l.notes ? `<span>${esc(l.notes)}</span>` : ''}
      ${l.photos?.length ? `<span class="tl-photos">${l.photos.slice(0, 4).map((id) => `<img data-photo="${id}" alt="">`).join('')}</span>` : ''}</span>
    </a></li>`).join('')}</ol>${add}`;
}

const DETAIL = {
  plants(p) {
    const fruits = S.fruits.filter((f) => f.plantId === p.id);
    const fs = fruitStats(fruits);
    const best = Math.max(...fruits.map((f) => num(f.overall) ?? 0), 0);
    const ageYears = p.date ? daysBetween(p.date, today()) / 365.25 : null;
    const nLogs = S.logs.filter((l) => l.plantId === p.id).length;
    const unnamed = p.origin === 'Seedling' && !p.varietyId;
    const eyebrow = [p.origin === 'Acquired' ? 'Plant' : p.origin, p.grafted === 'Yes' ? 'grafted' : ''].filter(Boolean).join(' · ');
    let call = '';
    if (p.grafted === 'Yes' && (!p.graftTook || p.graftTook === 'Waiting')) {
      call = callout({ ic: 'graft', tone: 'green', title: 'Did the graft take?',
        body: p.graftDate ? `Grafted ${fmtDate(p.graftDate)}, ${plural(daysBetween(p.graftDate, today()), 'day')} ago.` : '',
        actions: `<button class="btn" data-act="graft-took" data-id="${p.id}" data-v="No">It failed</button><button class="btn primary" data-act="graft-took" data-id="${p.id}" data-v="Yes">${icon('check')}It took</button>` });
    } else if (unnamed && fs.overall >= 4) {
      call = callout({ ic: 'award', title: 'A keeper?', body: `Its fruit averages ${fmt(fs.overall, 1)}/5. Give it a name to start a variety of your own.`,
        actions: `<button class="btn primary" data-act="name-variety" data-id="${p.id}">Name as a variety</button>` });
    }
    return {
      barTitle: p.tag,
      menuTitle: plantLabel(p),
      hero: hero({ rec: p, ic: 'sprout', tone: p.origin === 'Seedling' ? 'brand' : 'green', eyebrow, title: p.tag,
        sub: esc([plantKind(p), p.location].filter(Boolean).join(' · ')),
        pills: [p.status !== 'Active' ? statusPill(p.status) : '', p.firstFlower ? pill(`Flowered ${fmtShort(p.firstFlower)}`) : ''].join('') }),
      metrics: [['Fruit', fs.n], ['Avg Brix', fmt(fs.brix, 1), fs.brix == null ? '' : '°Bx'], ['Best score', best || '–', best ? '/5' : ''], ['Age', ageYears == null ? '–' : fmt(ageYears, 1), ageYears == null ? '' : 'yr']],
      callout: call,
      tabs: [
        ['details', 'Details', () => specSheet('plants', p, ['tag']) + gallery(p.photos)],
        ['family', 'Family', () => familyTab(p)],
        ['fruit', `Fruit${fruits.length ? ` <span class="seg-n">${fruits.length}</span>` : ''}`, () => fruitTab(fruits, `#/fruits/new?plantId=${p.id}`)],
        ['journal', `Journal${nLogs ? ` <span class="seg-n">${nLogs}</span>` : ''}`, () => journalTab(p)],
      ],
      menu: [
        { icon: 'cross', label: 'Pollinate a flower on it', sub: 'Record a cross with this as the seed parent', href: `#/crosses/new?seedPlantId=${p.id}` },
        { icon: 'fruit', label: 'Tag a fruit on it', sub: 'Follow one fruit from pollination to eating', href: `#/fruits/new?plantId=${p.id}` },
        { icon: 'note', label: 'Add a journal entry', href: `#/logs/new?plantId=${p.id}` },
        { icon: 'scissors', label: 'Take a cutting', sub: 'Add a new plant cut from this one', href: `#/plants/new?origin=Cutting&parentPlantId=${p.id}${p.varietyId ? '&varietyId=' + p.varietyId : ''}` },
        ...(unnamed ? [{ icon: 'award', label: 'Name as a variety', sub: 'Start a variety of your own from this seedling', run: () => nameAsVariety(p.id) }] : []),
      ],
    };
  },

  crosses(c) {
    const s = crossStats(c);
    const st = crossStatus(c);
    const t = today();

    let call = '';
    if (st === 'Waiting') {
      const n = num(c.flowers) || 1;
      const days = daysBetween(c.date, t);
      const choices = n === 1
        ? `<button class="btn" data-act="fruit-set" data-id="${c.id}" data-v="0">Didn’t set</button><button class="btn primary" data-act="fruit-set" data-id="${c.id}" data-v="1">${icon('check')}It set</button>`
        : n <= 6 ? Array.from({ length: n + 1 }, (_, i) => `<button class="btn num${i === n ? ' primary' : ''}" data-act="fruit-set" data-id="${c.id}" data-v="${i}">${i}</button>`).join('') : `<a class="btn primary" href="#/crosses/${c.id}/edit">Enter the result</a>`;
      call = callout({ ic: 'clock', tone: 'warn', title: n === 1 ? 'Did it set fruit?' : `How many of the ${n} flowers set fruit?`,
        body: days < 7 ? `Pollinated ${days === 0 ? 'today' : plural(days, 'day') + ' ago'}. You can usually tell after a week or two: a set fruit stays green and swells.` : `Pollinated ${plural(days, 'day')} ago. A set fruit stays green and swells; a failed one yellows and drops.`,
        actions: choices });
    } else if (st === 'Fruit set' && s.fruits.length < num(c.fruitSet)) {
      const left = num(c.fruitSet) - s.fruits.length;
      call = callout({ ic: 'tag', title: s.fruits.length ? `Tag ${plural(left, 'more fruit', 'more fruit')}` : 'Tag each fruit',
        body: `${plural(num(c.fruitSet), 'fruit')} set. Give each one a fruit tag so you can follow it to harvest and compare them one by one.`,
        actions: `<a class="btn primary" href="#/fruits/new?crossId=${c.id}">${icon('plus')}Add ${nextCode('fruits', 'tag', 'F')}</a>` });
    } else if (st === 'Fruit set' && s.fruits.some((f) => f.stage === 'Growing')) {
      const from = addDays(c.date, RIPE_FROM), to = addDays(c.date, RIPE_TO);
      call = callout({ ic: 'fruit', tone: 'green', title: t > to ? 'Should be ripe by now' : 'Ripening',
        body: `Red and white types usually ripen 30–50 days after pollination: around ${fmtShort(from)} – ${fmtShort(to)}. Mark each fruit as harvested from its own page.` });
    } else if (st === 'Fruit set' && s.fruits.length) {
      call = callout({ ic: 'seed', tone: 'green', title: 'Sowing the seeds?', body: 'Record how many you sow, then add the seedlings that come up.',
        actions: `<a class="btn" href="#/crosses/${c.id}/edit">Record sowing</a><a class="btn primary" href="#/plants/new?origin=Seedling&crossId=${c.id}">${icon('plus')}Add a seedling</a>` });
    }

    return {
      barTitle: c.code,
      menuTitle: crossLabel(c),
      hero: `
        <header class="duo-wrap">
          ${duo(parentCard(c.seedPlantId, '♀', 'seed', 'Not set'), pollenCard(c.pollenSource, c.pollenPlantId))}
          <div class="duo-caption"><h2>${esc(c.code)}</h2><span>Pollinated ${esc(fmtDate(c.date))}</span>${statusPill(st)}</div>
        </header>`,
      metrics: [['Flowers', num(c.flowers) ?? '–'], ['Fruit set', s.setRate == null ? '–' : Math.round(s.setRate * 100), s.setRate == null ? '' : '%'], ['Fruit', s.fruits.length], ['Seedlings', s.seedlings.length]],
      callout: call,
      tabs: [
        ['details', 'Details', () => specSheet('crosses', c, ['code', 'date', 'seedPlantId', 'pollenPlantId', 'pollenSource', 'flowers']) + gallery(c.photos)],
        ['fruit', `Fruit${s.fruits.length ? ` <span class="seg-n">${s.fruits.length}</span>` : ''}`, () => fruitTab(s.fruits, `#/fruits/new?crossId=${c.id}`)],
        ['seedlings', `Seedlings${s.seedlings.length ? ` <span class="seg-n">${s.seedlings.length}</span>` : ''}`, () => {
          const add = `<a class="btn block" href="#/plants/new?origin=Seedling&crossId=${c.id}">${icon('plus')}Add a seedling</a>`;
          if (!s.seedlings.length) return emptyState('sprout', 'No seedlings yet', num(c.germinated) ? `${c.germinated} seeds came up. Add the ones you keep growing.` : 'Add the seedlings you keep growing from this cross.', add);
          return `${s.seedlingFruits.length ? metrics((() => { const fs = fruitStats(s.seedlingFruits); return [['Their fruit', fs.n], ['Avg Brix', fmt(fs.brix, 1), '°Bx'], ['Avg score', fmt(fs.overall, 1), '/5']]; })()) : ''}
            <div class="card list">${s.seedlings.sort((a, b) => natural(a.tag, b.tag)).map(plantRow).join('')}</div>${add}`;
        }],
      ],
      menu: [
        { icon: 'fruit', label: 'Tag a fruit from this cross', href: `#/fruits/new?crossId=${c.id}` },
        { icon: 'sprout', label: 'Add a seedling', href: `#/plants/new?origin=Seedling&crossId=${c.id}` },
        { icon: 'cross', label: 'Repeat this cross', sub: 'Same parents, new pollination', href: `#/crosses/new?seedPlantId=${c.seedPlantId || ''}&pollenSource=${encodeURIComponent(c.pollenSource || '')}${c.pollenPlantId ? '&pollenPlantId=' + c.pollenPlantId : ''}` },
      ],
    };
  },

  varieties(v) {
    const plants = S.plants.filter((p) => p.varietyId === v.id).sort((a, b) => natural(a.tag, b.tag));
    const ids = new Set(plants.map((p) => p.id));
    const fruits = S.fruits.filter((f) => ids.has(f.plantId));
    const crosses = S.crosses.filter((c) => ids.has(c.seedPlantId) || ids.has(c.pollenPlantId)).sort((a, b) => natural(b.date, a.date));
    const rootstockFor = S.plants.filter((p) => p.grafted === 'Yes' && p.rootstockId === v.id);
    const fs = fruitStats(fruits);
    return {
      barTitle: v.name,
      menuTitle: v.name,
      hero: hero({ rec: v, ic: 'tag', tone: v.origin === 'Own hybrid' ? 'brand' : fleshTone(v.fleshColor) || 'green', eyebrow: shortSpecies(v.species) || 'Variety', title: v.name,
        sub: esc([v.fleshColor && v.fleshColor + ' flesh', v.skinColor && v.skinColor.toLowerCase() + ' skin'].filter(Boolean).join(', ')),
        pills: [v.origin === 'Own hybrid' ? pill('Own hybrid', 'brand') : '', v.selfFertile && v.selfFertile !== 'Unknown' ? pill(v.selfFertile === 'Yes' ? 'Self-fertile' : v.selfFertile === 'No' ? 'Needs a pollinator' : 'Partly self-fertile') : '', v.pollinator === 'Good' ? pill('Good pollen donor', 'green') : ''].join('') }),
      metrics: [['Plants', plants.filter((p) => p.status === 'Active').length], ['Fruit', fs.n], ['Avg Brix', fmt(fs.brix, 1), fs.brix == null ? '' : '°Bx'], ['Avg score', fmt(fs.overall, 1), fs.overall == null ? '' : '/5']],
      tabs: [
        ['details', 'Details', () => specSheet('varieties', v, ['name']) + gallery(v.photos)],
        ['plants', `Plants${plants.length ? ` <span class="seg-n">${plants.length}</span>` : ''}`, () => {
          const add = `<a class="btn block" href="#/plants/new?varietyId=${v.id}">${icon('plus')}Add a plant of this variety</a>`;
          return (plants.length ? `<div class="card list">${plants.map(plantRow).join('')}</div>` : emptyState('sprout', 'No plants of this variety', '', '')) +
            (rootstockFor.length ? section('Used as rootstock for', `<div class="card list">${rootstockFor.map(plantRow).join('')}</div>`) : '') + add;
        }],
        ['crosses', `Crosses${crosses.length ? ` <span class="seg-n">${crosses.length}</span>` : ''}`, () => (crosses.length ? `<div class="card list">${crosses.map(crossRow).join('')}</div>` : emptyState('cross', 'Not used in a cross yet', 'Crosses where a plant of this variety is a parent show up here.'))],
      ],
      menu: [{ icon: 'sprout', label: 'Add a plant of this variety', href: `#/plants/new?varietyId=${v.id}` }],
    };
  },

  fruits(f) {
    const p = byId('plants', f.plantId);
    const c = byId('crosses', f.crossId);
    const t = today();
    const from = pollinatedOn(f);
    const stageBtn = (v, label, primary) => `<button class="btn${primary ? ' primary' : ''}" data-act="fruit-stage" data-id="${f.id}" data-v="${v}">${primary ? icon('check') : ''}${esc(label)}</button>`;

    let call = '';
    if (f.stage === 'Growing') {
      const a = from && addDays(from, RIPE_FROM), b = from && addDays(from, RIPE_TO);
      call = callout({ ic: 'fruit', tone: b && t > b ? 'warn' : 'green',
        title: !from ? 'Growing' : t > b ? 'Should be ripe by now' : t >= a ? 'Ripe any day now' : 'Growing',
        body: from ? `Day ${daysBetween(from, t)} since pollination. Red and white types usually ripen 30–50 days after pollination, around ${fmtShort(a)} – ${fmtShort(b)}. Yellow types take months longer.`
          : 'Add the pollination date to see when it should ripen.',
        actions: stageBtn('Lost', 'It was lost') + stageBtn('Harvested', 'Harvested today', true) });
    } else if (f.stage === 'Harvested') {
      const measured = num(f.weight) != null || brixOf(f) != null;
      call = callout({ ic: 'drop', title: measured ? 'Eaten yet?' : 'Weigh it and taste it',
        body: measured ? 'When you cut it open, record the Brix and how it tasted.' : `Harvested ${fmtShort(f.harvestDate)}. Weight, Brix and a score are enough to start comparing fruit.`,
        actions: `<a class="btn" href="#/fruits/${f.id}/edit">${measured ? 'Edit measurements' : 'Weigh and measure'}</a>` + stageBtn('Eaten', 'Eaten today', true) });
    } else if (f.stage === 'Eaten' && num(f.overall) == null && brixOf(f) == null) {
      call = callout({ ic: 'drop', title: 'How did it taste?', body: 'Brix, sweetness, flavor and an overall score let you rank it against other fruit.',
        actions: `<a class="btn primary" href="#/fruits/${f.id}/edit?open=Taste">Record the taste</a>` });
    }

    const edible = num(f.weight) && num(f.pulpWeight) ? Math.round((f.pulpWeight / f.weight) * 100) : null;
    const shown = ['tag', 'pollinatedDate', 'plantId', 'pollenSource', 'pollenPlantId', 'crossId', 'stage', 'harvestDate', 'eatenDate', 'lostDate', 'lostReason', 'weight', 'brixCenter', 'overall'];
    const pollination = section('Pollination', `${duo(parentCard(f.plantId, '♀', 'grew on', 'Not set'), pollenCard(f.pollenSource, f.pollenPlantId))}
      <p class="count">${from ? `Pollinated ${esc(fmtDate(from))}` : 'Pollination date not set'}${c ? ` · cross <a href="#/crosses/${c.id}">${esc(c.code)}</a>` : ''}</p>`);
    return {
      barTitle: f.tag || 'Fruit',
      menuTitle: fruitLabel(f),
      hero: hero({ rec: f, ic: 'fruit', tone: fleshTone(f.fleshColor) || 'brand', eyebrow: 'Fruit', title: f.tag || 'Fruit',
        sub: p ? `on <a href="#/plants/${p.id}">${esc(p.tag)}</a> · ${esc(plantKind(p))}` : '',
        pills: [statusPill(f.stage), f.fleshColor ? pill(f.fleshColor + ' flesh') : '', f.cracking && f.cracking !== 'None' ? pill(f.cracking + ' cracking', 'warn') : ''].join('') }),
      metrics: isPicked(f) ? [['Weight', fmt(f.weight), num(f.weight) == null ? '' : 'g'], ['Brix', fmt(brixOf(f), 1), brixOf(f) == null ? '' : '°Bx'], ['Score', num(f.overall) ?? '–', num(f.overall) == null ? '' : '/5'], ['Edible', edible ?? '–', edible == null ? '' : '%']] : null,
      callout: fruitJourney(f) + call,
      body: pollination + section(isPicked(f) ? 'Measurements' : '', specSheet('fruits', f, shown, fruitDerived(f).filter((d) => d[0] !== 'Edible share'), isPicked(f) ? null : '')) + gallery(f.photos),
      menu: [{ icon: 'fruit', label: 'Tag another fruit like this', sub: 'Same plant, pollen and date', href: `#/fruits/new?plantId=${f.plantId || ''}&pollinatedDate=${from}&pollenSource=${encodeURIComponent(f.pollenSource || '')}${f.pollenPlantId ? '&pollenPlantId=' + f.pollenPlantId : ''}${f.crossId ? '&crossId=' + f.crossId : ''}` }],
    };
  },

  logs(l) {
    const p = byId('plants', l.plantId);
    return {
      barTitle: 'Journal',
      menuTitle: logLabel(l),
      hero: hero({ rec: l, ic: 'note', eyebrow: fmtDate(l.date), title: l.kind + (num(l.count) != null ? ` · ${l.count}` : ''),
        sub: p ? `<a href="#/plants/${p.id}">${esc(plantLabel(p))}</a>` : '' }),
      body: specSheet('logs', l, ['plantId', 'date', 'kind', 'count']) + gallery(l.photos),
      menu: [],
    };
  },
};
