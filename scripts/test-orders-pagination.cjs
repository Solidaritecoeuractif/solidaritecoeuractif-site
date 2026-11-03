const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { JSDOM } = require('jsdom');

function load(file, overrides = {}, browserWindow = global.window) {
  const filename = path.resolve(__dirname, '..', file);
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, { module, exports: module.exports, console, process, URLSearchParams, window: browserWindow,
    require(name) { return name in overrides ? overrides[name] : require(name); },
  }, { filename });
  return module.exports;
}

test('3840 orders: paginate rendering, retain whole-dataset search and export selection', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.test/admin/orders' });
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const React = require('react');
  const { createRoot } = require('react-dom/client');
  let exportReferences = [];
  const browserWindow = { location: { href: '' } };
  const Table = load('components/OrdersTableClient.tsx', {
    '@/lib/utils': { euros: n => String(n / 100) },
    '@/lib/destinations': { getDestinationZone: country => country === 'CA' ? 'international' : 'france_metropolitaine' },
    '@/components/LaPosteExportButton': { default: ({ references, children }) => {
      exportReferences = references; return children(() => {}, false);
    } },
  }, browserWindow).default;
  const orders = Array.from({ length: 3840 }, (_, i) => ({
    reference: `TEST-${i + 1}`, createdAt: '2026-11-02T12:00:00Z', updatedAt: '2026-11-02T12:00:00Z',
    totalAmount: 1398, paymentStatus: 'paid', logisticsStatus: 'to_process',
    customer: { firstName: 'Fixture', lastName: `Client${i + 1}`, email: `fixture${i + 1}@example.test` },
    shippingAddress: { country: 'FR', city: 'Test', postalCode: '75001', address1: 'Test' },
    items: [{ productTitle: '365 jours', quantity: 1 }],
  }));
  const root = createRoot(document.getElementById('root'));
  const click = async el => { await React.act(() => el.click()); };
  const choose = async (select, value) => React.act(() => {
    select.value = value;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  });
  const selectWithOption = value => [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === value));
  await React.act(() => root.render(React.createElement(Table, { orders })));
  assert.equal(document.querySelectorAll('tbody tr').length, 50);
  assert.match(document.querySelector('nav').textContent, /1–50 sur 3840/);
  await click(document.querySelector('thead input'));
  assert.equal(exportReferences.length, 50);
  await click([...document.querySelectorAll('nav button')].find(b => b.textContent === 'Suivant'));
  assert.match(document.querySelector('nav').textContent, /51–100 sur 3840/);
  assert.equal(document.querySelector('thead input').checked, false);
  await click(document.querySelector('thead input'));
  assert.equal(exportReferences.length, 100);
  const selection = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === 'select_visible'));
  await React.act(() => { selection.value = 'select_visible'; selection.dispatchEvent(new dom.window.Event('change', { bubbles: true })); });
  assert.equal(exportReferences.length, 3840);
  assert.equal(new Set(exportReferences).size, 3840);
  const search = document.querySelector('input[type="text"]');
  const changeSearch = async value => React.act(() => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(search, value);
    search.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
  });
  await changeSearch('TEST-3840');
  assert.equal(document.querySelectorAll('tbody tr').length, 1);
  assert.match(document.querySelector('tbody').textContent, /TEST-3840/);
  assert.match(document.querySelector('nav').textContent, /Page 1 \/ 1/);
  assert.equal(exportReferences.length, 3840, 'search must preserve the entire selection');
  assert.match(document.body.textContent, /Dont 3839 hors des filtres actuels/);
  await changeSearch('NO-SUCH-FIXTURE');
  assert.equal(document.querySelectorAll('tbody input').length, 0);
  assert.match(document.querySelector('nav').textContent, /0–0 sur 0/);
  assert.ok([...document.querySelectorAll('nav button')].every(b => b.disabled));
  assert.equal(exportReferences.length, 3840, 'no results must not erase selected orders');

  await choose(selection, 'clear');
  assert.equal(exportReferences.length, 0);
  await changeSearch('TEST-3840');
  await click(document.querySelector('tbody input'));
  await changeSearch('');
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840'], 'clearing search keeps the selected order');
  await click([...document.querySelectorAll('nav button')].find(b => b.textContent === 'Suivant'));
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840'], 'changing page keeps selection');
  await changeSearch('TEST-3839');
  await click(document.querySelector('tbody input'));
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840', 'TEST-3839'], 'successive searches accumulate selections');
  await changeSearch('TEST-3838');
  await choose(selection, 'select_visible');
  await choose(selection, 'select_visible');
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840', 'TEST-3839', 'TEST-3838'], 'select all results is additive and deduplicated');
  await choose(selection, 'deselect_visible');
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840', 'TEST-3839'], 'deselect filtered results preserves hidden selections');
  await choose(selection, 'toggle_visible');
  await choose(selection, 'toggle_visible');
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840', 'TEST-3839']);

  // Every filter can hide a selected order without silently removing it.
  for (const value of ['shipped', 'exported', 'multiple', 'international']) {
    await choose(selectWithOption(value), value);
    assert.equal(exportReferences.length, 2);
  }
  for (const input of document.querySelectorAll('input[type="datetime-local"]')) {
    await React.act(() => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, '2026-11-03T12:00');
      input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
    });
    assert.equal(exportReferences.length, 2);
  }
  assert.match(document.body.textContent, /Dont 2 hors des filtres actuels/);
  // Export URLs must use explicit references, not the current view's dates/status.
  for (const format of ['csv', 'xlsx', 'chronopost', 'word']) {
    await choose(selectWithOption(format), format);
    const url = new URL(browserWindow.location.href, 'https://example.test');
    assert.deepEqual(url.searchParams.getAll('refs'), ['TEST-3840', 'TEST-3839']);
    assert.equal(url.pathname, `/api/orders/export/${format}`);
    assert.equal(url.searchParams.get('selectionOnly'), 'true');
    for (const key of ['dateFrom', 'dateTo', 'logisticsStatus']) assert.equal(url.searchParams.has(key), false);
  }
  await click([...document.querySelectorAll('button')].find(b => b.textContent === 'Réinitialiser'));
  assert.equal(exportReferences.length, 2, 'resetting filters keeps selection');
  assert.doesNotMatch(document.body.textContent, /hors des filtres actuels/);
  await changeSearch('TEST-3840');
  assert.equal(document.querySelector('tbody input').checked, true, 'returning to a selected result restores its checkbox');
  await click(document.querySelector('tbody input'));
  assert.deepEqual(Array.from(exportReferences), ['TEST-3839'], 'explicit unchecking removes only that order');
  await React.act(() => root.render(React.createElement(Table, { orders: [...orders] })));
  assert.deepEqual(Array.from(exportReferences), ['TEST-3839'], 'refreshing equivalent data preserves selection');
  await changeSearch('TEST-3840');
  await click(document.querySelector('tbody input'));
  await React.act(() => root.render(React.createElement(Table, { orders: orders.filter(o => o.reference !== 'TEST-3839') })));
  assert.deepEqual(Array.from(exportReferences), ['TEST-3840'], 'removed orders are pruned, remaining selection survives');
  await React.act(() => root.render(React.createElement(Table, { orders: orders.map(o => o.reference === 'TEST-3840' ? { ...o, paymentStatus: 'refunded' } : o) })));
  assert.equal(exportReferences.length, 0, 'no-longer-paid orders are removed from the selection');
  await React.act(() => root.unmount()); dom.window.close();
});

test('storage reuses its pool and associates each item once with the correct order', async () => {
  let pools = 0, releases = 0, ends = 0;
  const now = new Date();
  const rows = [{ id: 'a', reference: 'A', created_at: now, updated_at: now }, { id: 'b', reference: 'B', created_at: now, updated_at: now }];
  const items = [{ id: '1', order_id: 'b', quantity: 2 }, { id: '2', order_id: 'a', quantity: 5 }, { id: '3', order_id: 'b', quantity: 3 }];
  class Pool {
    constructor() { pools++; }
    on() {}
    async end() { ends++; }
    async query(sql) { return { rows: sql.includes('app_settings') ? [{ value: { title: 'Fixture' } }] : sql.includes('order_items') ? items : rows }; }
    async connect() { return { query: this.query, release: () => releases++ }; }
  }
  const previous = process.env.DATABASE_URL; process.env.DATABASE_URL = 'postgres://fixture-only';
  try {
    const { PostgresStorageAdapter } = load('lib/storage/postgres.ts', { pg: { Pool } });
    const store = new PostgresStorageAdapter();
    for (let i = 0; i < 3; i++) {
      const result = await store.getOrders();
      assert.equal(result[0].items.map(x => x.id).join(','), '2');
      assert.equal(result[1].items.map(x => x.id).join(','), '1,3');
      await store.getCustomerMessages();
    }
    assert.equal(pools, 1); assert.equal(releases, 3); assert.equal(ends, 0);
  } finally {
    if (previous === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = previous;
  }
});
