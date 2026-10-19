const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { handleQualimReturn, qualimCheckoutOptions, QUALIM_RETURN_URL, QUALIM_COOKIE } = require('../lib/qualim-return.ts');

const sessionId = 'cs_test_Example12345678';
const session = {
  id: sessionId, status: 'complete', payment_status: 'paid',
  client_reference_id: 'SCA-test-only',
  metadata: { returnPartner: 'qualim', returnProductId: 'prod_book_365' },
};
const order = {
  reference: 'SCA-test-only', stripeSessionId: sessionId, paymentStatus: 'paid',
  items: [{ productId: 'prod_book_365' }],
};
function dependencies(overrides = {}) {
  return {
    enabled: true,
    retrieveSession: async id => { assert.equal(id, sessionId); return session; },
    getOrder: async reference => { assert.equal(reference, order.reference); return order; },
    ...overrides,
  };
}
const request = (extra = '') => new Request(`https://www.solidaritecoeuractif.com/api/checkout/retour-qualim?session_id=${sessionId}${extra}`);
function loadRoute(relativePath, replacements, env = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports, require: name => name in replacements ? replacements[name] : require(name),
    process: { env }, Request, Response, URL, console,
  }, { filename });
  return module.exports;
}

test('only an enabled Quali-M journey containing the paper 365 changes Stripe success URL', () => {
  for (const [cookie, products, enabled] of [[undefined, ['prod_book_365'], true], ['1', ['other'], true], ['1', ['prod_book_365'], false], ['qualim', ['prod_book_365'], true]]) {
    const result = qualimCheckoutOptions('https://sca.test', 'SCA-test-only', cookie, products, enabled);
    assert.equal(result.success_url, 'https://sca.test/confirmation?reference=SCA-test-only');
    assert.deepEqual(result.metadata, {});
  }
  const result = qualimCheckoutOptions('https://sca.test', 'SCA-test-only', '1', ['other', 'prod_book_365'], true);
  assert.equal(result.success_url, 'https://sca.test/api/checkout/retour-qualim?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(result.metadata.returnPartner, 'qualim');
});

test('verified paid session and persisted paid order redirect immediately to fixed Quali-M destination', async () => {
  const response = await handleQualimReturn(request('&return_url=https://evil.test&email=private@example.test'), dependencies());
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), QUALIM_RETURN_URL);
  assert.equal(await response.text(), '');
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.doesNotMatch(response.headers.get('location'), /session|reference|email|evil/);
});

test('activation switch can stop the external return even for an existing paid session', async () => {
  const response = await handleQualimReturn(request(), dependencies({ enabled: false }));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://www.solidaritecoeuractif.com/confirmation?reference=SCA-test-only');
});

test('malformed or missing session identifiers never call Stripe', async () => {
  for (const id of ['', 'SCA-test-only', '<script>', 'cs_test_%22%3E']) {
    const response = await handleQualimReturn(new Request(`https://sca.test/api/checkout/retour-qualim?session_id=${id}`), dependencies({ retrieveSession: async () => assert.fail('must not call Stripe') }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('location'), null);
  }
});

test('direct SCA or ticketing sessions cannot trigger a Quali-M redirect', async () => {
  for (const metadata of [null, {}, { checkoutType: 'ticketing' }, { returnPartner: 'qualim', returnProductId: 'other' }]) {
    const response = await handleQualimReturn(request(), dependencies({ retrieveSession: async () => ({ ...session, metadata }), getOrder: async () => assert.fail('must not read an unrelated order') }));
    assert.equal(response.status, 404);
  }
});

test('missing, unrelated or wrong-product orders never redirect', async () => {
  for (const record of [undefined, { ...order, reference: 'other' }, { ...order, stripeSessionId: 'cs_test_Other123456' }, { ...order, items: [{ productId: 'other' }] }]) {
    const response = await handleQualimReturn(request(), dependencies({ getOrder: async () => record }));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
  }
});

test('webhook delay polls automatically then redirects once the order is persisted as paid', async () => {
  let stored = { ...order, paymentStatus: 'pending' };
  const deps = dependencies({ getOrder: async () => stored });
  const waiting = await handleQualimReturn(request(), deps);
  assert.equal(waiting.status, 202);
  assert.match(await waiting.text(), /http-equiv="refresh"/);
  stored = order;
  assert.equal((await handleQualimReturn(request('&attempt=1'), deps)).status, 303);
});

test('unpaid, incomplete or not yet linked sessions never claim payment success', async () => {
  for (const overrides of [
    { retrieveSession: async () => ({ ...session, payment_status: 'unpaid' }) },
    { retrieveSession: async () => ({ ...session, status: 'open' }) },
    { getOrder: async () => ({ ...order, stripeSessionId: undefined }) },
  ]) {
    const response = await handleQualimReturn(request(), dependencies(overrides));
    assert.equal(response.status, 202);
    assert.equal(response.headers.get('location'), null);
    assert.doesNotMatch(await response.text(), /paiement a bien été reçu|Commande confirmée/);
  }
});

test('expired sessions and cancelled orders stop without redirecting', async () => {
  for (const overrides of [
    { retrieveSession: async () => ({ ...session, status: 'expired' }) },
    { getOrder: async () => ({ ...order, paymentStatus: 'cancelled' }) },
  ]) {
    const response = await handleQualimReturn(request(), dependencies(overrides));
    assert.equal(response.status, 409);
    assert.doesNotMatch(await response.text(), /refresh/);
  }
});

test('transient provider errors retry without disclosing errors, then stop polling after five minutes', async () => {
  const deps = dependencies({ retrieveSession: async () => { throw Error('private provider detail'); } });
  const initial = await handleQualimReturn(request(), deps);
  const body = await initial.text();
  assert.match(body, /attempt=1/);
  assert.doesNotMatch(body, /private provider detail/);
  for (const attempt of ['60', '999', 'bad']) {
    const response = await handleQualimReturn(request(`&attempt=${attempt}`), deps);
    assert.doesNotMatch(await response.text(), /http-equiv="refresh"/);
  }
});

test('partner entry uses the real product slug, same-tab HTTP redirect and a short-lived private cookie', async () => {
  const { GET } = loadRoute('app/partenaires/qualim/365/route.ts', {
    '@/lib/storage': { storage: () => ({ getProductById: async id => {
      assert.equal(id, 'prod_book_365');
      return { slug: 'livre-gratuit-365-jours-avec-le-seigneur-jesus-christ', isActive: true, isPhysical: true };
    } }) },
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
  });
  const response = await GET(new Request('https://www.solidaritecoeuractif.com/partenaires/qualim/365?return_url=https://evil.test'));
  assert.equal(response.status, 303);
  assert.equal(response.headers.get('location'), 'https://www.solidaritecoeuractif.com/produit/livre-gratuit-365-jours-avec-le-seigneur-jesus-christ');
  const cookie = response.headers.get('set-cookie');
  for (const part of [`${QUALIM_COOKIE}=1`, 'HttpOnly', 'Secure', 'SameSite=lax', 'Max-Age=7200']) assert.ok(cookie.includes(part), part);
});

test('inactive paper product does not set a referral cookie or redirect', async () => {
  const { GET } = loadRoute('app/partenaires/qualim/365/route.ts', {
    '@/lib/storage': { storage: () => ({ getProductById: async () => ({ isActive: false, isPhysical: true }) }) },
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
  });
  const response = await GET(new Request('https://sca.test/partenaires/qualim/365'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('real checkout handler preserves amount, cancellation and order writes while attaching the partner return', async () => {
  for (const enabled of [true, false]) {
    let stripeOptions;
    const writes = [];
    const input = {
      customer: { firstName: 'Test', lastName: 'Only', email: 'test@example.test', phone: '0000000000' },
      items: [{ productId: 'prod_book_365', quantity: 2 }],
      shippingAddress: { country: 'FR', address1: 'Test', postalCode: '45000', city: 'Test' },
      supportEnabled: false,
    };
    const { POST } = loadRoute('app/api/checkout/route.ts', {
      'next/headers': { cookies: async () => ({ get: name => { assert.equal(name, QUALIM_COOKIE); return { value: '1' }; } }) },
      '@/lib/qualim-return': require('../lib/qualim-return.ts'),
      '@/lib/order-amounts': require('../lib/order-amounts.ts'),
      '@/lib/storage': { storage: () => ({
        getProducts: async () => [],
        saveOrder: async value => writes.push(structuredClone(value)),
        updateOrder: async (reference, value) => writes.push(structuredClone(value)),
      }) },
      '@/lib/validators': { checkoutSchema: { safeParse: value => ({ success: true, data: value }) } },
      '@/lib/cart': {
        resolveCart: () => ({ errors: [], requiresShipping: true, items: [{ product: { id: 'prod_book_365', title: 'Livre 365', offerType: 'product', pricingMode: 'flexible' }, unitAmount: 500, quantity: 2 }] }),
        computeTotals: () => ({ subtotalAmount: 1000, shippingAmount: 0, totalAmount: 1000, totalPhysicalQuantity: 2 }),
      },
      '@/lib/destinations': { resolveDestinationCodeForPostalCode: () => 'FR' },
      '@/lib/utils': { uniqueId: prefix => `${prefix}_test`, orderReference: () => 'SCA-test-only' },
      '@/lib/stripe': { stripe: () => ({ checkout: { sessions: { create: async options => { stripeOptions = options; return { id: sessionId, url: 'https://checkout.stripe.com/test-only' }; } } } }) },
    }, { QUALIM_RETURN_ENABLED: String(enabled) });
    const response = await POST(new Request('https://sca.test/api/checkout', { method: 'POST', body: JSON.stringify(input) }));
    assert.equal(response.status, 200);
    assert.equal(stripeOptions.cancel_url, 'https://sca.test/annulation?reference=SCA-test-only');
    assert.equal(stripeOptions.metadata.returnPartner, enabled ? 'qualim' : undefined);
    assert.equal(stripeOptions.metadata.totalAmount, '1000');
    assert.equal(stripeOptions.line_items[0].quantity, 2);
    assert.equal(stripeOptions.line_items[0].price_data.unit_amount, 500);
    assert.equal(writes.length, 2);
    assert.equal(writes[0].paymentStatus, 'pending');
    assert.equal(writes[1].stripeSessionId, sessionId);
    assert.equal(writes[1].totalAmount, 1000);
    assert.equal((await response.json()).url, 'https://checkout.stripe.com/test-only');
    assert.equal(stripeOptions.success_url.includes('{CHECKOUT_SESSION_ID}'), enabled);
  }
});
