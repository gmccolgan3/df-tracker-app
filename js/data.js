'use strict';
/* Changing data: saving, deleting, backup and restore, spreadsheet export, sample and starter data. */

async function saveRecord(store, rec) {
  rec.updatedAt = new Date().toISOString();
  rec.createdAt = rec.createdAt || rec.updatedAt;
  await DB.put(store, rec);
  const i = S[store].findIndex((r) => r.id === rec.id);
  if (i >= 0) S[store][i] = rec; else S[store].push(rec);
  return rec;
}

async function saveSettings() { await DB.put('settings', SETTINGS); }

/* ---------- delete ---------- */

function referencesTo(store, id) {
  const out = [];
  const add = (n, one, many) => { if (n) out.push(plural(n, one, many)); };
  if (store === 'varieties') {
    add(S.plants.filter((p) => p.varietyId === id).length, 'plant');
    add(S.plants.filter((p) => p.rootstockId === id).length, 'grafted plant');
  }
  if (store === 'plants') {
    add(S.crosses.filter((c) => c.seedPlantId === id || c.pollenPlantId === id).length, 'cross', 'crosses');
    add(S.fruits.filter((f) => f.plantId === id || f.pollenPlantId === id).length, 'fruit record');
    add(S.plants.filter((p) => p.parentPlantId === id).length, 'cutting');
    add(S.varieties.filter((v) => v.fromPlantId === id).length, 'variety', 'varieties');
  }
  if (store === 'crosses') {
    add(S.fruits.filter((f) => f.crossId === id).length, 'fruit record');
    add(S.plants.filter((p) => p.crossId === id).length, 'seedling');
  }
  return out;
}

async function deleteRecord(store, id) {
  const rec = byId(store, id);
  if (!rec) return;
  const refs = referencesTo(store, id);
  if (refs.length) {
    await notice(`Can't delete this ${META[store].one}`,
      `It's linked to ${refs.join(', ')}, so deleting it would break the family tree. ` +
      (store === 'plants' ? 'To retire a plant, edit it and set its status to Dead, Given away or Culled.' : 'Change or delete those first.'));
    return;
  }
  const logs = store === 'plants' ? S.logs.filter((l) => l.plantId === id) : [];
  const ok = await confirmBox(`Delete ${LABEL[store](rec)}?`,
    `${logs.length ? `Its ${plural(logs.length, 'journal entry', 'journal entries')} will be deleted too. ` : ''}This can't be undone.`, 'Delete', true);
  if (!ok) return;
  const photos = [...(rec.photos || []), ...logs.flatMap((l) => l.photos || [])];
  await DB.del(store, id);
  if (logs.length) await DB.delMany('logs', logs.map((l) => l.id));
  if (photos.length) await DB.delMany('photos', photos);
  S[store] = S[store].filter((r) => r.id !== id);
  if (logs.length) S.logs = S.logs.filter((l) => l.plantId !== id);
  toast('Deleted');
  replaceRoute(listRoute(store));
}

async function nameAsVariety(plantId) {
  const p = byId('plants', plantId);
  const name = (await dialog({
    title: 'Name this seedling',
    body: `<p>${esc(p.tag)} becomes the first plant of a new variety. Cuttings from it can then carry the name.</p>`,
    input: { placeholder: 'Variety name', label: 'Variety name' },
    buttons: [{ label: 'Cancel', value: false }, { label: 'Name it', value: true, primary: true }],
  }))?.trim();
  if (!name) return;
  if (S.varieties.some((v) => v.name.toLowerCase() === name.toLowerCase())) { await notice('Name already used', `There is already a variety called ${name}.`); return; }
  const c = byId('crosses', p.crossId);
  const v = await saveRecord('varieties', { id: uid(), name, origin: 'Own hybrid', fromPlantId: p.id, species: 'Interspecific hybrid', selfFertile: 'Unknown',
    notes: c ? `Selected from seedling ${p.tag} of ${crossLabel(c)}.` : '', photos: [] });
  p.varietyId = v.id;
  await saveRecord('plants', p);
  toast(`Named ${v.name}`);
  location.hash = `#/varieties/${v.id}`;
}

// One-tap result for a pollination: how many fruits set.
async function setFruitSet(crossId, n) {
  const c = byId('crosses', crossId);
  c.fruitSet = n;
  if (num(c.flowers) == null) c.flowers = Math.max(n, 1);
  await saveRecord('crosses', c);
  toast(n ? `${plural(n, 'fruit')} set` : 'Marked as not set');
  render();
}

// One-tap stage change for a fruit, dated today.
async function setFruitStage(id, stage) {
  const f = byId('fruits', id);
  if (!f) return;
  if (stage === 'Lost') {
    const reason = await dialog({ title: `What happened to ${f.tag}?`, buttons: [...FIELDS.fruits.find((x) => x.k === 'lostReason').options.map((o) => ({ label: o, value: o })), { label: 'Cancel', value: null }] });
    if (!reason) return;
    f.lostReason = reason;
  }
  const t = today();
  f.stage = stage;
  if (stage === 'Harvested' || stage === 'Eaten') f.harvestDate = f.harvestDate || t;
  if (stage === 'Eaten') f.eatenDate = t;
  if (stage === 'Lost') f.lostDate = t;
  await saveRecord('fruits', f);
  if (stage === 'Eaten') { toast('Marked as eaten. Now record how it tasted.'); location.hash = `#/fruits/${id}/edit?open=Taste`; return; }
  toast(stage === 'Harvested' ? `${f.tag} harvested` : `${f.tag} marked as lost`);
  render();
}

// Fruit from before per-fruit tracking were harvest records: give them a tag, a stage and their cross's pollination.
async function upgradeFruit() {
  const old = S.fruits.filter((f) => !f.stage || !f.tag).sort((a, b) => natural(a.harvestDate, b.harvestDate));
  for (const f of old) {
    if (!f.tag) f.tag = nextCode('fruits', 'tag', 'F');
    if (!f.stage) {
      const tasted = num(f.overall) != null || brixOf(f) != null || ['sweetness', 'flavor', 'texture', 'acidity'].some((k) => num(f[k]) != null);
      f.stage = tasted ? 'Eaten' : 'Harvested';
    }
    const c = byId('crosses', f.crossId);
    if (c) {
      for (const [k, v] of Object.entries(fromCross(c))) if (!f[k]) f[k] = v;
    } else if (!f.pollenSource) {
      f.pollenSource = 'Open / insects'; // the old form said to leave the cross empty for open-pollinated fruit
    }
  }
  if (old.length) await DB.putMany('fruits', old);
}

/* ---------- backup ---------- */

async function backup() {
  const out = { app: 'df-tracker', schemaVersion: SCHEMA_VERSION, exportedAt: new Date().toISOString(), settings: { customFields: SETTINGS.customFields || {} }, data: {}, photos: [] };
  DATA_STORES.forEach((s) => { out.data[s] = S[s]; });
  const photos = await DB.all('photos');
  if (photos.length) toast('Packing photos…');
  for (const p of photos) out.photos.push({ id: p.id, type: p.type, createdAt: p.createdAt, data: await blobToDataUrl(p.blob) });
  download(new Blob([JSON.stringify(out)], { type: 'application/json' }), `dragonfruit-backup-${today()}.json`);
  SETTINGS.lastBackup = new Date().toISOString();
  await saveSettings();
  toast('Backup downloaded');
  render();
}

const blobToDataUrl = (blob) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(blob); });

function download(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Picks a file first, then asks how to bring it in (a file picker must open straight from a tap).
function chooseRestoreFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = () => { if (input.files[0]) restoreFrom(input.files[0]); };
  input.click();
}

async function restoreFrom(file) {
  let json;
  try { json = JSON.parse(await file.text()); } catch { await notice('Not a backup', 'That file could not be read as a backup.'); return; }
  if (json.app !== 'df-tracker' || !json.data) { await notice('Not a backup', 'That file is not a Dragon Fruit Tracker backup.'); return; }
  if (json.schemaVersion > SCHEMA_VERSION) { await notice('Update the app first', 'This backup was made by a newer version of the app.'); return; }
  const counts = DATA_STORES.map((s) => ((json.data[s] || []).length ? plural(json.data[s].length, META[s].one, META[s].pl) : '')).filter(Boolean).join(', ');
  const when = json.exportedAt ? new Date(json.exportedAt).toLocaleString() : 'an unknown date';
  const mode = await dialog({
    title: 'Restore backup',
    body: `<p>Made ${esc(when)}, with ${esc(counts || 'no records')}.</p>
      <p><b>Merge</b> adds what's new and keeps whichever copy of each record was edited last. Use it to combine two people's trackers.</p>
      <p><b>Replace</b> deletes everything on this device first.</p>`,
    buttons: [{ label: 'Cancel', value: null }, { label: 'Replace', value: 'replace', danger: true }, { label: 'Merge', value: 'merge', primary: true }],
  });
  if (!mode) return;
  if (mode === 'replace' && !(await confirmBox('Replace everything?', 'All records and photos on this device will be deleted and replaced by the backup.', 'Replace', true))) return;

  let added = 0, updated = 0;
  try {
    if (mode === 'replace') { for (const s of [...DATA_STORES, 'photos']) await DB.clear(s); DATA_STORES.forEach((s) => { S[s] = []; }); }
    for (const s of DATA_STORES) {
      const put = [];
      for (const r of json.data[s] || []) {
        if (!r || !r.id) continue;
        const mine = byId(s, r.id);
        if (!mine) { put.push(r); S[s].push(r); added++; }
        else if ((r.updatedAt || '') > (mine.updatedAt || '')) { put.push(r); S[s][S[s].indexOf(mine)] = r; updated++; }
      }
      if (put.length) await DB.putMany(s, put);
    }
    const have = new Set((await DB.all('photos')).map((p) => p.id));
    const photos = [];
    for (const p of json.photos || []) if (!have.has(p.id)) photos.push({ id: p.id, type: p.type, createdAt: p.createdAt, blob: await (await fetch(p.data)).blob() });
    if (photos.length) await DB.putMany('photos', photos);
    const cf = SETTINGS.customFields = SETTINGS.customFields || {};
    for (const [s, list] of Object.entries(json.settings?.customFields || {})) {
      cf[s] = cf[s] || [];
      for (const f of list) if (!cf[s].some((x) => x.k === f.k)) cf[s].push(f);
    }
    await saveSettings();
    await upgradeFruit();
  } catch (err) { console.error(err); await notice('Restore stopped partway', err.message); }
  toast(`Restored: ${added} new, ${updated} updated`);
  render();
}

/* ---------- spreadsheet export ---------- */

function csvFor(store) {
  const fields = fieldsFor(store);
  const cell = (v) => { const s = String(v ?? ''); return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  const head = ['id', ...fields.map((f) => f.label + (f.unit ? ` (${f.unit})` : '')), 'Created', 'Updated'];
  if (store === 'crosses') head.push('Status', 'Fruit set rate', 'Fruit recorded', 'Seedlings');
  if (store === 'fruits') head.push('Variety', 'Edible share', 'Length / width', 'Days from pollination to harvest');
  const lines = [head.map(cell).join(',')];
  for (const r of S[store]) {
    const row = [r.id, ...fields.map((f) => (f.type === 'ref' ? (byId(f.ref, r[f.k]) ? LABEL[f.ref](byId(f.ref, r[f.k])) : '') : r[f.k])), r.createdAt, r.updatedAt];
    if (store === 'crosses') { const s = crossStats(r); row.push(crossStatus(r), s.setRate == null ? '' : fmt(s.setRate, 3), s.fruits.length, s.seedlings.length); }
    if (store === 'fruits') {
      row.push(varietyName(byId('plants', r.plantId)?.varietyId),
        num(r.weight) && num(r.pulpWeight) ? fmt(r.pulpWeight / r.weight, 3) : '',
        num(r.length) && num(r.diameter) ? fmt(r.length / r.diameter, 2) : '',
        daysToRipen(r) ?? '');
    }
    lines.push(row.map(cell).join(','));
  }
  // The byte-order mark makes Excel read the file as UTF-8.
  download(new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv' }), `dragonfruit-${store}-${today()}.csv`);
}

/* ---------- custom fields ---------- */

async function addCustomField(store, label, type, unit, options) {
  const f = { k: 'cf_' + label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 24) + '_' + Math.random().toString(36).slice(2, 6), label, type };
  if (type === 'number' && unit) f.unit = unit;
  if (type === 'select') f.options = options;
  SETTINGS.customFields = SETTINGS.customFields || {};
  (SETTINGS.customFields[store] = SETTINGS.customFields[store] || []).push(f);
  await saveSettings();
}

async function removeCustomField(store, k) {
  if (!(await confirmBox('Remove this field?', 'Values already entered stay in your records and backups, but are hidden.', 'Remove', true))) return;
  SETTINGS.customFields[store] = SETTINGS.customFields[store].filter((f) => f.k !== k);
  await saveSettings();
  render();
}

async function wipeAll() {
  const typed = await dialog({
    title: 'Delete everything?',
    body: '<p>Every record and photo on this device will be deleted. Download a backup first if you might want them.</p><p>Type <b>DELETE</b> to confirm.</p>',
    input: { placeholder: 'DELETE' },
    buttons: [{ label: 'Cancel', value: false }, { label: 'Delete everything', value: true, danger: true }],
  });
  if (typed !== 'DELETE') return;
  for (const s of [...DATA_STORES, 'photos']) await DB.clear(s);
  DATA_STORES.forEach((s) => { S[s] = []; });
  toast('All data deleted');
  location.hash = '#/home';
}

/* ---------- starter and sample data ---------- */

async function loadStarterVarieties() {
  const have = new Set(S.varieties.map((v) => v.name.trim().toLowerCase()));
  const now = new Date().toISOString();
  const fresh = VARIETY_SEED.filter((v) => !have.has(v.name.toLowerCase()))
    .map((v) => ({ id: uid(), photos: [], createdAt: now, updatedAt: now, ...v }));
  if (fresh.length) { await DB.putMany('varieties', fresh); S.varieties.push(...fresh); }
  toast(fresh.length ? `Added ${fresh.length} varieties` : 'All starter varieties are already in your list');
  render();
}

const hasDemo = () => DATA_STORES.some((s) => S[s].some((r) => r.demo));

async function loadDemo() {
  const now = new Date().toISOString();
  const t = today();
  const d = (n) => addDays(t, -n);
  const base = { demo: true, photos: [], createdAt: now, updatedAt: now };
  const mk = (o) => ({ id: uid(), ...base, ...o });
  const vW = mk({ name: 'Sample White', species: SPECIES[0], skinColor: 'Pink / red', fleshColor: 'White', selfFertile: 'Yes', origin: 'Named variety', traits: 'Made-up record for trying the app.' });
  const vR = mk({ name: 'Sample Red', species: SPECIES[1], skinColor: 'Pink / red', fleshColor: 'Red', selfFertile: 'No', origin: 'Named variety', traits: 'Made-up record for trying the app.' });
  const vY = mk({ name: 'Sample Yellow', species: SPECIES[2], skinColor: 'Yellow', fleshColor: 'White', selfFertile: 'Yes', origin: 'Named variety', traits: 'Made-up record for trying the app.' });
  const p1 = mk({ tag: 'P-001', origin: 'Acquired', varietyId: vW.id, source: 'Local nursery', date: d(1400), location: 'Post 1', status: 'Active', vigor: 4 });
  const p2 = mk({ tag: 'P-002', origin: 'Acquired', varietyId: vR.id, source: 'Friend', date: d(1200), location: 'Post 2', status: 'Active', vigor: 3 });
  const p3 = mk({ tag: 'P-003', origin: 'Cutting', varietyId: vR.id, parentPlantId: p2.id, date: d(700), location: 'Post 3', status: 'Active', vigor: 4 });
  const p4 = mk({ tag: 'P-004', origin: 'Acquired', varietyId: vY.id, source: 'Online seller', date: d(900), location: 'Greenhouse', status: 'Active', vigor: 2 });
  const x1 = mk({ code: 'X-001', date: d(800), seedPlantId: p2.id, pollenSource: 'Another plant', pollenPlantId: p1.id, pollenAge: 'Fresh', timing: 'Night', bagged: 'Yes', flowers: 3, fruitSet: 2, seedsSown: 40, sownDate: d(755), germinated: 31 });
  const x2 = mk({ code: 'X-002', date: d(45), seedPlantId: p3.id, pollenSource: 'Another plant', pollenPlantId: p4.id, pollenAge: 'Stored', timing: 'Night', bagged: 'Yes', flowers: 2, fruitSet: 1 });
  const x3 = mk({ code: 'X-003', date: d(6), seedPlantId: p1.id, pollenSource: 'Another plant', pollenPlantId: p2.id, timing: 'Evening', bagged: 'Yes', flowers: 2 });
  const x4 = mk({ code: 'X-004', date: d(60), seedPlantId: p2.id, pollenSource: 'Self', timing: 'Night', bagged: 'Yes', flowers: 2, fruitSet: 0, notes: 'Both flowers dropped. Probably self-incompatible.' });
  const s1 = mk({ tag: 'P-005', origin: 'Seedling', crossId: x1.id, date: d(740), location: 'Seedling bench', status: 'Active', vigor: 5, firstFlower: d(60) });
  const s2 = mk({ tag: 'P-006', origin: 'Seedling', crossId: x1.id, date: d(738), location: 'Post 4', status: 'Active', vigor: 3, grafted: 'Yes', rootstockId: vW.id, graftDate: d(500), graftMethod: 'Flat', graftTook: 'Yes' });
  const s3 = mk({ tag: 'P-007', origin: 'Seedling', crossId: x1.id, date: d(735), location: 'Seedling bench', status: 'Culled', vigor: 1, health: 'Stem canker, removed.' });
  const fr = (o) => mk({ stage: 'Eaten', shape: 'Oval', skinColor: 'Pink / red', bracts: 'Medium', bractColor: 'Green tips', cracking: 'None', seeds: 'Average', ...o });
  const fromX1 = { plantId: p2.id, crossId: x1.id, pollinatedDate: x1.date, pollenSource: 'Another plant', pollenPlantId: p1.id };
  const fruits = [
    fr({ tag: 'F-001', ...fromX1, harvestDate: d(762), eatenDate: d(759), weight: 410, length: 112, diameter: 86, peelThickness: 3.1, pulpWeight: 300, fleshColor: 'Red', brixCenter: 16.2, brixEdge: 12.8, sweetness: 4, acidity: 2, flavor: 4, texture: 4, appearance: 4, shelfLife: 7, overall: 4 }),
    fr({ tag: 'F-002', ...fromX1, harvestDate: d(760), eatenDate: d(757), weight: 365, length: 105, diameter: 80, peelThickness: 3.4, pulpWeight: 262, fleshColor: 'Red', brixCenter: 15.5, brixEdge: 12.1, sweetness: 4, acidity: 2, flavor: 3, texture: 4, appearance: 3, shelfLife: 6, overall: 3 }),
    fr({ tag: 'F-003', plantId: p1.id, pollinatedDate: d(436), pollenSource: 'Open / insects', harvestDate: d(400), eatenDate: d(395), weight: 520, length: 128, diameter: 92, peelThickness: 2.8, pulpWeight: 395, fleshColor: 'White', brixCenter: 13.1, brixEdge: 10.4, sweetness: 3, acidity: 1, flavor: 2, texture: 3, appearance: 4, shelfLife: 9, overall: 3 }),
    fr({ tag: 'F-004', plantId: s1.id, pollinatedDate: d(56), pollenSource: 'Another plant', pollenPlantId: p1.id, harvestDate: d(12), eatenDate: d(9), weight: 455, length: 108, diameter: 94, peelThickness: 2.6, pulpWeight: 350, shape: 'Round', fleshColor: 'Magenta / purple', brixCenter: 18.4, brixEdge: 15.9, sweetness: 5, acidity: 2, flavor: 5, texture: 4, appearance: 5, shelfLife: 8, overall: 5, tasteNotes: 'Berry-like, very sweet. Keep breeding.' }),
    fr({ tag: 'F-005', plantId: p2.id, pollinatedDate: d(40), pollenSource: 'Another plant', pollenPlantId: p1.id, stage: 'Harvested', harvestDate: d(2), weight: 390, fleshColor: 'Red' }),
    mk({ tag: 'F-006', plantId: p3.id, crossId: x2.id, pollinatedDate: x2.date, pollenSource: 'Another plant', pollenPlantId: p4.id, stage: 'Growing' }),
    mk({ tag: 'F-007', plantId: p4.id, pollinatedDate: d(20), pollenSource: 'Self', stage: 'Growing', notes: 'Yellow type, so expect months rather than weeks.' }),
    mk({ tag: 'F-008', plantId: p1.id, pollinatedDate: d(50), pollenSource: 'Open / insects', stage: 'Lost', lostDate: d(25), lostReason: 'Dropped' }),
  ];
  const logs = [
    mk({ plantId: s1.id, date: d(64), kind: 'Flower buds', count: 3 }),
    mk({ plantId: s1.id, date: d(60), kind: 'Flowers opened', count: 1, notes: 'First flower on this seedling.' }),
    mk({ plantId: p4.id, date: d(30), kind: 'Pest / disease', notes: 'Some sunburn on the west side. Added shade cloth.' }),
  ];
  const all = { varieties: [vW, vR, vY], plants: [p1, p2, p3, p4, s1, s2, s3], crosses: [x1, x2, x3, x4], fruits, logs };
  for (const [s, list] of Object.entries(all)) { await DB.putMany(s, list); S[s].push(...list); }
  toast('Sample garden loaded');
  render();
}

async function removeDemo() {
  if (!(await confirmBox('Remove the sample garden?', 'Your own records stay. Anything you linked to a sample record loses that link.', 'Remove'))) return;
  for (const s of DATA_STORES) {
    const ids = S[s].filter((r) => r.demo).map((r) => r.id);
    if (ids.length) await DB.delMany(s, ids);
    S[s] = S[s].filter((r) => !r.demo);
  }
  toast('Sample garden removed');
  render();
}
