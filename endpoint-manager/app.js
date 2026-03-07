// ── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'ep_manager_v1';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
  catch { return []; }
}

function save(endpoints) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(endpoints));
}

// ── State ─────────────────────────────────────────────────────────────────────
let endpoints = load();
let activeId = null;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const listEl       = document.getElementById('endpoint-list');
const editorEl     = document.getElementById('editor');
const nameEl       = document.getElementById('ep-name');
const methodEl     = document.getElementById('ep-method');
const urlEl        = document.getElementById('ep-url');
const headersEl    = document.getElementById('ep-headers');
const bodyEl       = document.getElementById('ep-body');
const callBtn      = document.getElementById('call-btn');
const saveBtn      = document.getElementById('save-btn');
const deleteBtn    = document.getElementById('delete-btn');
const addBtn       = document.getElementById('add-btn');
const placeholder  = document.getElementById('results-placeholder');
const sheetWrap    = document.getElementById('spreadsheet-wrap');
const sheetEl      = document.getElementById('spreadsheet');
const resultsLabel = document.getElementById('results-label');
const exportBtn    = document.getElementById('export-btn');

// ── Render sidebar ────────────────────────────────────────────────────────────
function renderList() {
  listEl.innerHTML = '';
  endpoints.forEach(ep => {
    const li = document.createElement('li');
    li.dataset.id = ep.id;
    if (ep.id === activeId) li.classList.add('active');
    li.innerHTML = `
      <span class="ep-item-name">${ep.name || 'Unnamed'}</span>
      <span class="ep-item-meta">
        <span class="method-badge ${ep.method}">${ep.method}</span>
        <span>${truncate(ep.url, 28)}</span>
      </span>`;
    li.addEventListener('click', () => selectEndpoint(ep.id));
    listEl.appendChild(li);
  });
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '…' : (str || '');
}

// ── Select / add endpoint ─────────────────────────────────────────────────────
function selectEndpoint(id) {
  activeId = id;
  const ep = endpoints.find(e => e.id === id);
  if (!ep) return;

  nameEl.value    = ep.name    || '';
  methodEl.value  = ep.method  || 'GET';
  urlEl.value     = ep.url     || '';
  headersEl.value = ep.headers || '';
  bodyEl.value    = ep.body    || '';

  editorEl.style.display = '';
  renderList();
  clearSheet();
}

addBtn.addEventListener('click', () => {
  const ep = { id: uid(), name: 'New Endpoint', method: 'GET', url: '', headers: '', body: '' };
  endpoints.push(ep);
  save(endpoints);
  selectEndpoint(ep.id);
});

// ── Save ──────────────────────────────────────────────────────────────────────
saveBtn.addEventListener('click', () => {
  const ep = endpoints.find(e => e.id === activeId);
  if (!ep) return;
  ep.name    = nameEl.value.trim() || 'Unnamed';
  ep.method  = methodEl.value;
  ep.url     = urlEl.value.trim();
  ep.headers = headersEl.value.trim();
  ep.body    = bodyEl.value.trim();
  save(endpoints);
  renderList();
});

// ── Delete ────────────────────────────────────────────────────────────────────
deleteBtn.addEventListener('click', () => {
  if (!activeId) return;
  endpoints = endpoints.filter(e => e.id !== activeId);
  save(endpoints);
  activeId = null;
  editorEl.style.display = 'none';
  clearSheet();
  renderList();
});

// ── Call endpoint ─────────────────────────────────────────────────────────────
callBtn.addEventListener('click', async () => {
  const url = urlEl.value.trim();
  if (!url) return alert('Please enter a URL.');

  let headers = { 'Content-Type': 'application/json' };
  if (headersEl.value.trim()) {
    try { Object.assign(headers, JSON.parse(headersEl.value)); }
    catch { return alert('Headers JSON is invalid.'); }
  }

  const method = methodEl.value;
  const opts = { method, headers };

  if (['POST','PUT','PATCH'].includes(method) && bodyEl.value.trim()) {
    try { opts.body = JSON.stringify(JSON.parse(bodyEl.value)); }
    catch { return alert('Body JSON is invalid.'); }
  }

  callBtn.textContent = 'Calling…';
  callBtn.disabled = true;

  try {
    const res = await fetch(url, opts);
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { data = text; }
    renderSheet(data, `${method} ${url} — ${res.status} ${res.statusText}`);
  } catch (err) {
    renderSheet({ error: err.message }, 'Request failed');
  } finally {
    callBtn.textContent = 'Call';
    callBtn.disabled = false;
  }
});

// ── Spreadsheet renderer ──────────────────────────────────────────────────────
function renderSheet(data, label) {
  resultsLabel.textContent = label;
  placeholder.style.display = 'none';
  sheetWrap.style.display = '';
  sheetEl.innerHTML = '';

  // Normalise to array of flat objects
  const rows = normalise(data);
  if (!rows.length) {
    sheetEl.innerHTML = '<p style="color:#94a3b8;padding:12px">No data returned.</p>';
    return;
  }

  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))];
  const table = document.createElement('table');

  // Header
  const thead = table.createTHead();
  const hr = thead.insertRow();
  cols.forEach(c => {
    const th = document.createElement('th');
    th.textContent = humanise(c);
    hr.appendChild(th);
  });

  // Body
  const tbody = table.createTBody();
  rows.forEach(row => {
    const tr = tbody.insertRow();
    cols.forEach(c => {
      const td = tr.insertCell();
      const val = row[c];
      td.innerHTML = formatCell(val);
    });
  });

  sheetEl.appendChild(table);
}

function clearSheet() {
  placeholder.style.display = '';
  sheetWrap.style.display = 'none';
  sheetEl.innerHTML = '';
}

// Flatten JSON into array of flat objects
function normalise(data) {
  if (Array.isArray(data)) return data.map(flatten);
  if (data && typeof data === 'object') return [flatten(data)];
  return [{ value: data }];
}

function flatten(obj, prefix = '', out = {}) {
  if (obj === null || typeof obj !== 'object') {
    out[prefix || 'value'] = obj;
    return out;
  }
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length <= 6) {
      flatten(v, key, out);
    } else {
      out[key] = v;
    }
  }
  return out;
}

// snake_case / camelCase → Human Readable
function humanise(key) {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_.-]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatCell(val) {
  if (val === null || val === undefined) return '<span class="cell-null">—</span>';
  if (typeof val === 'boolean') return `<span class="cell-bool">${val}</span>`;
  if (typeof val === 'number') return `<span class="cell-number">${val.toLocaleString()}</span>`;
  if (typeof val === 'object') return `<span class="cell-object">${JSON.stringify(val)}</span>`;
  // linkify URLs
  if (typeof val === 'string' && /^https?:\/\//.test(val)) {
    return `<a href="${val}" target="_blank" rel="noopener">${val}</a>`;
  }
  return String(val);
}

// ── CSV Export ────────────────────────────────────────────────────────────────
exportBtn.addEventListener('click', () => {
  const table = sheetEl.querySelector('table');
  if (!table) return;

  const rows = [...table.querySelectorAll('tr')].map(tr =>
    [...tr.querySelectorAll('th,td')].map(c => `"${c.textContent.replace(/"/g,'""')}"`).join(',')
  );
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'results.csv';
  a.click();
});

// ── Utils ─────────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ── Init ──────────────────────────────────────────────────────────────────────
renderList();
