'use strict';
/* State, small helpers, labels and statistics. No DOM work here. */

const DATA_STORES = ['varieties', 'plants', 'crosses', 'fruits', 'logs'];
const S = { varieties: [], plants: [], crosses: [], fruits: [], logs: [] };
let SETTINGS = { id: 'settings', customFields: {}, lastBackup: null };

const META = {
  varieties: { one: 'variety', pl: 'varieties', many: 'Varieties', icon: 'tag' },
  plants: { one: 'plant', pl: 'plants', many: 'Plants', icon: 'sprout' },
  crosses: { one: 'cross', pl: 'crosses', many: 'Crosses', icon: 'cross' },
  fruits: { one: 'fruit', pl: 'fruit', many: 'Fruit', icon: 'fruit' },
  logs: { one: 'journal entry', pl: 'journal entries', many: 'Journal', icon: 'note' },
};

/* ---------- helpers ---------- */

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
const today = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 10); };
const addDays = (iso, n) => { const d = new Date(iso + 'T12:00'); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const daysBetween = (a, b) => Math.round((Date.parse(b + 'T12:00') - Date.parse(a + 'T12:00')) / 86400000);
const num = (v) => (v === '' || v == null || isNaN(+v) ? null : +v);
const avg = (list) => { const v = list.map(num).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
const sum = (list) => list.map(num).filter((x) => x != null).reduce((a, b) => a + b, 0);
const fmt = (v, d = 0) => (v == null ? '–' : String(Number((+v).toFixed(d))));
const pct = (v) => (v == null ? '–' : Math.round(v * 100) + '%');
const natural = (a, b) => String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' });
const byId = (store, id) => (id ? S[store].find((r) => r.id === id) : undefined);
const fmtDate = (iso) => (iso ? new Date(iso + 'T12:00').toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '');
const fmtShort = (iso) => {
  if (!iso) return '';
  const d = new Date(iso + 'T12:00');
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, sameYear ? { month: 'short', day: 'numeric' } : { year: 'numeric', month: 'short', day: 'numeric' });
};
const relDate = (iso) => {
  if (!iso) return '';
  const n = daysBetween(iso.slice(0, 10), today());
  if (n === 0) return 'Today';
  if (n === 1) return 'Yesterday';
  if (n > 1 && n < 7) return `${n} days ago`;
  return fmtShort(iso.slice(0, 10));
};
const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
const brixOf = (f) => num(f.brixCenter) ?? num(f.brixEdge);

/* ---------- labels ---------- */

function varietyName(id) { const v = byId('varieties', id); return v ? v.name : ''; }

function plantLabel(p) {
  if (!p) return '(deleted plant)';
  const v = varietyName(p.varietyId);
  if (v) return `${p.tag} · ${v}`;
  if (p.origin === 'Seedling') { const c = byId('crosses', p.crossId); return `${p.tag} · seedling${c ? ' of ' + c.code : ''}`; }
  return p.tag;
}
// What a plant is, in a few words: its variety, or what it's a seedling of.
function plantKind(p) {
  if (!p) return '';
  const v = varietyName(p.varietyId);
  if (v) return v;
  if (p.origin === 'Seedling') { const c = byId('crosses', p.crossId); return c ? `Seedling of ${crossParents(c)}` : 'Unnamed seedling'; }
  return 'Variety not set';
}
// Short name for a parent in a cross: the variety if known, else the tag.
function parentName(id) { const p = byId('plants', id); return p ? (varietyName(p.varietyId) || p.tag) : '?'; }

function crossParents(c) {
  const mom = parentName(c.seedPlantId);
  if (c.pollenSource === 'Self') return `${mom} ⊗ self`;
  if (c.pollenSource === 'Open / insects') return `${mom} × open`;
  return `${mom} × ${c.pollenPlantId ? parentName(c.pollenPlantId) : '?'}`;
}
const crossLabel = (c) => (c ? `${c.code} · ${crossParents(c)}` : '(deleted cross)');
const fruitLabel = (f) => `${fmtDate(f.harvestDate)} · ${byId('plants', f.plantId)?.tag ?? '?'}`;
const logLabel = (l) => `${fmtDate(l.date)} · ${l.kind}`;
const LABEL = { varieties: (r) => r.name, plants: plantLabel, crosses: crossLabel, fruits: fruitLabel, logs: logLabel };

function crossStatus(c) {
  if (num(c.germinated) > 0 || S.plants.some((p) => p.crossId === c.id)) return 'Seedlings';
  if (num(c.seedsSown) > 0) return 'Seeds sown';
  if (num(c.fruitSet) > 0) return 'Fruit set';
  if (num(c.fruitSet) === 0) return 'Failed';
  return 'Waiting';
}
const STATUS_TONE = { Waiting: 'warn', 'Fruit set': 'good', 'Seeds sown': 'good', Seedlings: 'brand', Failed: 'dim',
  Active: 'good', Dead: 'dim', 'Given away': 'dim', Culled: 'dim' };

// Next free code with a prefix, e.g. P-007 or X-012.
function nextCode(store, key, prefix) {
  const re = new RegExp('^' + prefix + '-(\\d+)$', 'i');
  const max = S[store].reduce((m, r) => { const x = re.exec(r[key] || ''); return x ? Math.max(m, +x[1]) : m; }, 0);
  return `${prefix}-${String(max + 1).padStart(3, '0')}`;
}

function fieldsFor(store) {
  const custom = (SETTINGS.customFields?.[store] || []).map((f, i) => ({ ...f, group: i === 0 ? 'Your own fields' : undefined, custom: true }));
  return FIELDS[store].concat(custom);
}
const visible = (f, rec) => !f.showIf || f.showIf(rec);

/* ---------- stats ---------- */

function crossStats(c) {
  const fruits = S.fruits.filter((f) => f.crossId === c.id);
  const seedlings = S.plants.filter((p) => p.origin === 'Seedling' && p.crossId === c.id);
  const ids = new Set(seedlings.map((s) => s.id));
  const seedlingFruits = S.fruits.filter((f) => ids.has(f.plantId));
  const flowers = num(c.flowers), set = num(c.fruitSet), sown = num(c.seedsSown), germ = num(c.germinated);
  return {
    fruits, seedlings, seedlingFruits,
    setRate: flowers && set != null ? set / flowers : null,
    germRate: sown && germ != null ? germ / sown : null,
    avgWeight: avg(fruits.map((f) => f.weight)),
    avgBrix: avg(fruits.map(brixOf)),
    avgOverall: avg(fruits.map((f) => f.overall)),
    avgDays: avg(fruits.filter((f) => c.date && f.harvestDate).map((f) => daysBetween(c.date, f.harvestDate))),
  };
}

function fruitStats(fruits) {
  return {
    n: fruits.length,
    weight: avg(fruits.map((f) => f.weight)),
    brix: avg(fruits.map(brixOf)),
    overall: avg(fruits.map((f) => f.overall)),
  };
}

function fruitDerived(f) {
  const out = [];
  if (num(f.weight) && num(f.pulpWeight)) out.push(['Edible share', pct(f.pulpWeight / f.weight)]);
  if (num(f.length) && num(f.diameter)) out.push(['Length ÷ width', fmt(f.length / f.diameter, 2)]);
  if (num(f.brixCenter) != null && num(f.brixEdge) != null) out.push(['Brix drop to edge', fmt(f.brixCenter - f.brixEdge, 1)]);
  const c = byId('crosses', f.crossId);
  if (c && c.date && f.harvestDate) out.push(['Days to ripen', daysBetween(c.date, f.harvestDate)]);
  return out;
}

// Months from germination (or planting) to first flower.
const monthsToFlower = (p) => (p.date && p.firstFlower ? daysBetween(p.date, p.firstFlower) / 30.44 : null);
