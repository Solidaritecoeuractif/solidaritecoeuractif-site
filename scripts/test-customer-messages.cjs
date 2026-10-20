const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loader(overrides = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, {
      module, exports: module.exports,
      require(name) { return name in overrides ? overrides[name] : name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name); },
      process: { env: { EMAIL_FROM: 'test@example.test', RESEND_API_KEY: 'mock-only', DATABASE_URL: 'mock-only' } },
      Request, Response, URL, Buffer, console: { error() {} },
    }, { filename });
    return module.exports;
  }
  return load;
}

const order = {
  reference: 'SCA-test-only', currency: 'eur', items: [], subtotalAmount: 1398, shippingAmount: 0, totalAmount: 1398,
  customer: { firstName: 'Test', lastName: 'Client', email: 'nobody@example.test', phone: '000' },
  shippingAddress: { address1: 'Adresse de test', country: 'FR', city: 'Test', postalCode: '00000' },
};

function harness({ authenticated = true, value, failure = false } = {}) {
  const state = { value, reads: 0, writes: 0, emails: [] };
  const load = loader({
    '@/lib/storage': { storage: () => ({
      async getCustomerMessages() { state.reads++; if (failure) throw Error('test outage'); return state.value; },
      async saveCustomerMessages(value) { if (failure) throw Error('test outage'); state.value = value; state.writes++; },
    }) },
    '@/lib/auth': { isAdminAuthenticated: async () => authenticated },
    'next/cache': { revalidatePath() {} },
    resend: { Resend: class { emails = { send: async value => { state.emails.push(value); } }; } },
  });
  return { state, load, save: load('app/api/admin/messages-clients/route.ts').POST, send: load('lib/email.ts').sendPaymentConfirmationEmail };
}

function request(deliveryMessage, origin = 'https://sca.test') {
  return new Request('https://sca.test/api/admin/messages-clients', {
    method: 'POST', headers: { 'Content-Type': 'application/json', origin }, body: JSON.stringify({ deliveryMessage }),
  });
}

test('physical confirmation uses the complete default 3–15 day message without sending real email', async () => {
  const h = harness();
  await h.send(order);
  assert.match(h.state.emails[0].html, /3 à 15 jours/);
  assert.match(h.state.emails[0].html, /traitement de votre demande, l’expédition et l’acheminement/);
  assert.doesNotMatch(h.state.emails[0].html, /3 à 10 jours/);
});

test('authenticated admin changes reach the next confirmation and HTML is escaped', async () => {
  const h = harness();
  const response = await h.save(request('  Réception sous 5 à 20 jours.\nTraitement & envoi <script>alert(1)</script>  '));
  assert.equal(response.status, 200);
  assert.equal(h.state.writes, 1);
  await h.send(order);
  assert.match(h.state.emails[0].html, /5 à 20 jours\.<br \/>Traitement &amp; envoi &lt;script&gt;/);
  assert.doesNotMatch(h.state.emails[0].html, /3 à 15 jours|<script>/);
  assert.equal((await response.json()).deliveryMessage, h.state.value.deliveryMessage);
});

test('anonymous, cross-origin and invalid saves cannot change the settings', async () => {
  const anonymous = harness({ authenticated: false });
  assert.equal((await anonymous.save(request('Texte'))).status, 401);
  assert.equal(anonymous.state.writes, 0);
  const h = harness();
  assert.equal((await h.save(request('Texte', 'https://other.test'))).status, 403);
  for (const value of ['', '   ', 'a'.repeat(2001), 15]) assert.equal((await h.save(request(value))).status, 400);
  assert.equal(h.state.writes, 0);
});

test('settings failure is reported on saving and does not prevent payment confirmations', async () => {
  const h = harness({ failure: true });
  assert.equal((await h.save(request('Texte'))).status, 500);
  await h.send(order);
  assert.match(h.state.emails[0].html, /3 à 15 jours/);
});

test('non-shipping orders contain no delivery promise and do not read delivery settings', async () => {
  const h = harness();
  await h.send({ ...order, shippingAddress: undefined });
  assert.equal(h.state.reads, 0);
  assert.doesNotMatch(h.state.emails[0].html, /3 à 15 jours|délai estimé de réception/);
});

test('Postgres adapter persists the editable message across adapter instances', async () => {
  let saved;
  let closed = 0;
  const load = loader({ pg: { Pool: class {
    async query(sql, args) {
      assert.equal(args[0], 'customer_messages');
      if (sql.startsWith('insert')) { saved = JSON.parse(args[1]); return { rows: [] }; }
      return { rows: saved ? [{ value: saved }] : [] };
    }
    async end() { closed++; }
  } } });
  const { PostgresStorageAdapter } = load('lib/storage/postgres.ts');
  const value = { deliveryMessage: 'Réception estimée sous 4 à 16 jours.' };
  await new PostgresStorageAdapter().saveCustomerMessages(value);
  assert.deepEqual(await new PostgresStorageAdapter().getCustomerMessages(), value);
  assert.equal(closed, 2);
});
