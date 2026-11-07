'use strict';
/* Add and edit forms. Essentials sit at the top; everything else folds into sections. */

let formDirty = false;

// Short lists are faster to tap than to pick from a dropdown.
const asChips = (f) => f.type === 'select' && f.options.length <= 4 && f.options.every((o) => o.length <= 16);

function inputHtml(f, val, rec) {
  const id = `f_${f.k}`;
  const name = `name="${f.k}" id="${id}"`;
  switch (f.type) {
    case 'textarea':
      return `<textarea ${name} rows="3">${esc(val)}</textarea>`;
    case 'number': {
      const isCount = f.step === 1 && !f.unit;
      const input = `<input type="number" inputmode="${f.step === 1 ? 'numeric' : 'decimal'}" ${name} step="${f.step ?? 'any'}"${f.min != null ? ` min="${f.min}"` : ''} value="${esc(val)}" placeholder="–">`;
      if (isCount) return `<div class="stepper"><button type="button" data-act="step" data-k="${f.k}" data-d="-1" aria-label="One less">${icon('minus')}</button>${input}<button type="button" data-act="step" data-k="${f.k}" data-d="1" aria-label="One more">${icon('plus')}</button></div>`;
      return `<div class="with-unit">${input}${f.unit ? `<span>${esc(f.unit)}</span>` : ''}</div>`;
    }
    case 'date':
      return `<input type="date" ${name} value="${esc(val)}">`;
    case 'select': {
      const opts = [...f.options];
      if (val && !opts.includes(val)) opts.push(val);
      if (asChips(f)) return `<div class="choices" role="radiogroup" aria-labelledby="l_${f.k}">${opts.map((o) => `<label class="choice"><input type="radio" name="${f.k}" value="${esc(o)}"${o === val ? ' checked' : ''}><span>${esc(o)}</span></label>`).join('')}</div>`;
      return `<div class="select"><select ${name}><option value="">Choose…</option>${opts.map((o) => `<option${o === val ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select>${icon('down')}</div>`;
    }
    case 'ref': {
      const rows = S[f.ref].filter((r) => r.id !== rec.id).map((r) => [r.id, LABEL[f.ref](r), r]);
      rows.sort((a, b) => (f.ref === 'crosses' ? natural(b[2].date, a[2].date) : natural(a[1], b[1])));
      const active = rows.filter((r) => !r[2].status || r[2].status === 'Active' || r[0] === val);
      const retired = rows.filter((r) => !active.includes(r));
      const opt = ([rid, label]) => `<option value="${rid}"${rid === val ? ' selected' : ''}>${esc(label)}</option>`;
      return `<div class="select"><select ${name}><option value="">${rows.length ? 'Choose…' : `No ${META[f.ref].pl} yet`}</option>${active.map(opt).join('')}${retired.length ? `<optgroup label="Retired">${retired.map(opt).join('')}</optgroup>` : ''}</select>${icon('down')}</div>`;
    }
    case 'rating':
      return `<div class="choices rating" role="radiogroup" aria-labelledby="l_${f.k}">${[1, 2, 3, 4, 5].map((n) => `<label class="choice"><input type="radio" name="${f.k}" value="${n}"${+val === n ? ' checked' : ''}><span>${n}</span></label>`).join('')}</div>
        ${f.low ? `<div class="scale"><span>1 · ${esc(f.low)}</span><span>${esc(f.high)} · 5</span></div>` : ''}`;
    default:
      return `<input type="text" ${name} value="${esc(val)}" autocomplete="off"${f.k === 'tag' || f.k === 'code' ? ' autocapitalize="characters"' : ''}>`;
  }
}

function fieldHtml(f, rec) {
  const labelTag = ['select', 'rating'].includes(f.type) && (f.type === 'rating' || asChips(f)) ? 'span' : 'label';
  return `<div class="field${f.half ? ' half' : ''}" data-k="${f.k}"${visible(f, rec) ? '' : ' hidden'}>
    <${labelTag} class="label" id="l_${f.k}"${labelTag === 'label' ? ` for="f_${f.k}"` : ''}>${esc(f.label)}</${labelTag}>
    ${inputHtml(f, rec[f.k] ?? '', rec)}
    ${f.hint ? `<small class="hint">${esc(f.hint)}</small>` : ''}
  </div>`;
}

function defaultsFor(store, q) {
  const d = {
    varieties: { origin: 'Named variety', selfFertile: 'Unknown' },
    plants: { origin: 'Acquired', status: 'Active', grafted: 'No', date: today(), tag: nextCode('plants', 'tag', 'P') },
    crosses: { code: nextCode('crosses', 'code', 'X'), date: today(), pollenSource: 'Another plant', flowers: 1, timing: 'Night', bagged: 'Yes' },
    fruits: { harvestDate: today() },
    logs: { date: today(), kind: 'Flowers opened' },
  }[store] || {};
  const rec = { ...d, ...q };
  if (store === 'fruits' && q.crossId && !q.plantId) rec.plantId = byId('crosses', q.crossId)?.seedPlantId || '';
  if (store === 'plants' && q.origin === 'Seedling') { rec.date = ''; rec.location = rec.location || 'Seedling tray'; }
  return rec;
}

const FORM_TITLES = { varieties: 'variety', plants: 'plant', crosses: 'pollination', fruits: 'harvest', logs: 'journal entry' };

function viewForm(store, id, query) {
  const existing = id ? byId(store, id) : null;
  if (id && !existing) { viewDetail(store, id); return; }
  document.body.classList.add('form-mode');
  const rec = existing ? { ...existing } : defaultsFor(store, query);
  const fields = fieldsFor(store);
  setFormBar(existing ? `Edit ${FORM_TITLES[store]}` : `New ${FORM_TITLES[store]}`);
  formDirty = false;
  let photos = [...(rec.photos || [])];
  const newFiles = [];

  // Split into essentials, folding groups, and notes.
  const top = [], groups = [];
  let notesField = null;
  for (const f of fields) {
    if (f.k === 'notes') { notesField = f; continue; }
    if (f.group) groups.push({ name: f.group, fields: [] });
    (groups.length ? groups[groups.length - 1].fields : top).push(f);
  }
  const filled = (g) => g.fields.filter((f) => visible(f, rec) && rec[f.k] != null && rec[f.k] !== '' && !(f.k === 'grafted' && rec[f.k] === 'No')).length;

  view.innerHTML = `
    <form id="form" class="form" novalidate>
      ${PHOTO_STORES.includes(store) ? `<div class="photo-row" id="photoRow"></div>` : ''}
      <div class="card pad fields">${top.map((f) => fieldHtml(f, rec)).join('')}</div>
      ${groups.map((g) => { const n = filled(g); return `
        <details class="card fold"${n && g.name === 'Grafting' ? ' open' : ''}>
          <summary><span class="fold-title">${esc(g.name)}</span><span class="fold-n">${n ? `${n} filled` : 'Optional'}</span>${icon('down')}</summary>
          <div class="fold-body fields">${g.fields.map((f) => fieldHtml(f, rec)).join('')}</div>
        </details>`; }).join('')}
      ${notesField ? `<div class="card pad">${fieldHtml(notesField, rec)}</div>` : ''}
      <button type="submit" class="btn primary block big">Save ${FORM_TITLES[store]}</button>
      ${existing ? `<button type="button" class="btn ghost danger block" data-act="delete" data-store="${store}" data-id="${id}">${icon('trash')}Delete</button>` : ''}
    </form>`;

  const form = view.querySelector('#form');

  const drawPhotos = () => {
    const row = form.querySelector('#photoRow');
    if (!row) return;
    row.innerHTML = photos.map((pid) => {
      const nf = newFiles.find((x) => x.id === pid);
      return `<figure data-id="${pid}"><img ${nf ? '' : `data-photo="${pid}"`} alt="Photo"><button type="button" class="photo-x" data-act="unphoto" aria-label="Remove photo">${icon('x')}</button></figure>`;
    }).join('') + `<label class="photo-add">${icon('camera')}<span>${photos.length ? 'Add' : 'Add photo'}</span><input type="file" accept="image/*" multiple hidden></label>`;
    for (const nf of newFiles) {
      const img = row.querySelector(`figure[data-id="${nf.id}"] img`);
      if (img) { const u = URL.createObjectURL(nf.blob); photoUrls.push(u); img.src = u; }
    }
    loadPhotos(row);
    row.querySelector('input[type=file]').addEventListener('change', async (e) => {
      for (const file of e.target.files) {
        const blob = await resizeImage(file);
        const pid = uid();
        newFiles.push({ id: pid, blob, type: blob.type, createdAt: new Date().toISOString() });
        photos.push(pid);
      }
      formDirty = true;
      drawPhotos();
    });
  };
  drawPhotos();

  const read = () => {
    const fd = new FormData(form);
    const out = {};
    for (const f of fields) {
      const raw = fd.get(f.k);
      out[f.k] = f.type === 'number' || f.type === 'rating' ? num(raw) : (raw ?? '').toString().trim();
    }
    return out;
  };
  const refresh = () => {
    const vals = read();
    for (const f of fields) if (f.showIf) form.querySelector(`.field[data-k="${f.k}"]`).hidden = !f.showIf(vals);
  };
  form.addEventListener('change', refresh);
  form.addEventListener('input', () => { formDirty = true; });

  // Tapping the chosen chip again clears it.
  form.addEventListener('pointerdown', (e) => { const inp = e.target.closest('.choice')?.querySelector('input'); if (inp) inp.dataset.was = inp.checked ? '1' : ''; });
  form.addEventListener('click', (e) => {
    const inp = e.target.closest('.choice input');
    if (inp && inp.dataset.was === '1') { inp.checked = false; inp.dataset.was = ''; formDirty = true; refresh(); }
    const step = e.target.closest('[data-act="step"]');
    if (step) {
      const input = form.querySelector(`#f_${step.dataset.k}`);
      input.value = Math.max(0, (num(input.value) ?? 0) + +step.dataset.d);
      formDirty = true;
    }
    const un = e.target.closest('[data-act="unphoto"]');
    if (un) { const pid = un.closest('figure').dataset.id; photos = photos.filter((x) => x !== pid); formDirty = true; drawPhotos(); }
  });

  // A fruit usually grew on the cross's seed parent.
  form.querySelector('#f_crossId')?.addEventListener('change', (e) => {
    const plantSel = form.querySelector('#f_plantId');
    const c = byId('crosses', e.target.value);
    if (store === 'fruits' && c && plantSel && !plantSel.value) plantSel.value = c.seedPlantId || '';
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const vals = read();
    for (const f of fields) if (f.showIf && !f.showIf(vals)) vals[f.k] = f.type === 'number' || f.type === 'rating' ? null : '';
    const missing = fields.filter((f) => f.required && visible(f, vals) && (vals[f.k] == null || vals[f.k] === ''));
    if (missing.length) {
      form.querySelectorAll('.field.invalid').forEach((el) => el.classList.remove('invalid'));
      missing.forEach((f) => form.querySelector(`.field[data-k="${f.k}"]`)?.classList.add('invalid'));
      const first = form.querySelector(`.field[data-k="${missing[0].k}"]`);
      first?.closest('details')?.setAttribute('open', '');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`Please fill in ${missing.map((f) => f.label.replace(/ [♀♂]$/, '')).join(' and ')}`);
      return;
    }
    const problem = validate(store, vals, id);
    if (problem && !(await confirmBox('Save anyway?', problem, 'Save anyway'))) return;
    const out = { ...(existing || {}), ...vals, id: id || uid(), photos };
    try {
      const kept = newFiles.filter((nf) => photos.includes(nf.id));
      if (kept.length) await DB.putMany('photos', kept);
      const dropped = (existing?.photos || []).filter((p) => !photos.includes(p));
      if (dropped.length) await DB.delMany('photos', dropped);
      await saveRecord(store, out);
    } catch (err) { console.error(err); await notice('Could not save', err.message); return; }
    formDirty = false;
    toast(existing ? 'Changes saved' : `${FORM_TITLES[store][0].toUpperCase() + FORM_TITLES[store].slice(1)} saved`);
    replaceRoute(`#/${store}/${out.id}`);
  });
}

function validate(store, v, id) {
  if (store === 'plants' && S.plants.some((p) => p.id !== id && p.tag.toLowerCase() === v.tag.toLowerCase())) return `Another plant already has the tag ${v.tag}.`;
  if (store === 'crosses') {
    if (S.crosses.some((c) => c.id !== id && c.code.toLowerCase() === v.code.toLowerCase())) return `Another cross already uses the code ${v.code}.`;
    if (v.pollenSource === 'Another plant' && v.pollenPlantId && v.pollenPlantId === v.seedPlantId) return 'The seed and pollen parent are the same plant. Did you mean “Self”?';
    if (num(v.fruitSet) != null && num(v.flowers) != null && v.fruitSet > v.flowers) return 'More fruits set than flowers pollinated.';
    if (num(v.germinated) != null && num(v.seedsSown) != null && v.germinated > v.seedsSown) return 'More seeds came up than were sown.';
  }
  if (store === 'fruits' && num(v.pulpWeight) != null && num(v.weight) != null && v.pulpWeight > v.weight) return 'The flesh weighs more than the whole fruit.';
  if (store === 'varieties' && S.varieties.some((x) => x.id !== id && x.name.toLowerCase() === v.name.toLowerCase())) return `There is already a variety called ${v.name}.`;
  return null;
}

async function leaveForm() {
  if (formDirty && !(await confirmBox('Discard changes?', 'What you entered on this form will be lost.', 'Discard', true))) return;
  formDirty = false;
  goBack();
}
