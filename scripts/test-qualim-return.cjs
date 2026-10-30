const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const { handleQualimReturn, qualimCheckoutOptions, QUALIM_RETURN_URL, QUALIM_COOKIE } = require('../lib/qualim-return.ts');

// Every provider and storage dependency is replaced. These tests make no payments,
// write no real orders, send no emails, and never access a network or a database.
const sessionId = 'cs_test_Example12345678';
const session = {
  id: sessionId, status: 'complete', payment_status: 'paid',
  client_reference_id: 'SCA-test-only',
  metadata: { orderReference: 'SCA-test-only' },
};
const order = {
  reference: 'SCA-test-only', stripeSessionId: sessionId, paymentStatus: 'paid',
  items: [{ productId: 'prod_book_365' }],
};
const ticketSession = {
  ...session,
  client_reference_id: 'BIL-test-only',
  metadata: { checkoutType: 'ticketing', ticketingReference: 'BIL-test-only', eventId: 'evt_test', eventTitle: 'Rencontre de test' },
};
const ticketOrder = {
  reference: 'BIL-test-only', stripeSessionId: sessionId, paymentStatus: 'paid',
  eventId: 'evt_test',
};
function dependencies(overrides = {}) {
  return {
    retrieveSession: async id => { assert.equal(id, sessionId); return session; },
    getOrder: async reference => { assert.equal(reference, order.reference); return order; },
    getTicketingOrder: async () => assert.fail('must not read ticketing for a storefront session'),
    ...overrides,
  };
}
function ticketDependencies(overrides = {}) {
  return dependencies({
    retrieveSession: async id => { assert.equal(id, sessionId); return ticketSession; },
    getOrder: async () => assert.fail('must not read storefront for a ticketing session'),
    getTicketingOrder: async reference => { assert.equal(reference, ticketOrder.reference); return ticketOrder; },
    ...overrides,
  });
}
const request = (extra = '') => new Request(`https://www.solidaritecoeuractif.com/api/checkout/retour-qualim?session_id=${sessionId}${extra}`);
function loadRoute(relativePath, replacements, env = {}) {
  const filename = path.join(__dirname, '..', relativePath);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, {
    module, exports: module.exports,
    require: name => name in replacements ? replacements[name] : require(name),
    process: { env }, Request, Response, URL, console, crypto,
  }, { filename });
  return module.exports;
}
async function assertConfirmed(response) {
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('location'), null, 'confirmation must remain visible before timed navigation');
  assert.match(response.headers.get('content-type'), /text\/html/);
  assert.match(response.headers.get('cache-control'), /no-store/);
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.match(response.headers.get('set-cookie'), /Max-Age=0/);
  const body = await response.text();
  assert.match(body, /http-equiv="refresh"[^>]*content="5;\s*url=https:\/\/quali-m-consult\.com\/boutique"/i);
  assert.match(body, /href="https:\/\/quali-m-consult\.com\/boutique"/);
  assert.doesNotMatch(body, /target=["']_blank|window\.open|<script|javascript:/i);
  assert.doesNotMatch(body, /cs_test_Example12345678|return_url|private@example\.test|evil\.test/);
  return body;
}

test('every storefront checkout uses the verified return, without a referral or product restriction', () => {
  const result = qualimCheckoutOptions('https://sca.test');
  assert.equal(result.success_url, 'https://sca.test/api/checkout/retour-qualim?session_id={CHECKOUT_SESSION_ID}');
  assert.deepEqual(result.metadata, { returnPartner: 'qualim' });
  assert.equal(QUALIM_RETURN_URL, 'https://quali-m-consult.com/boutique');
});

test('paid storefront order shows confirmation then opens only the fixed boutique in the same tab', async () => {
  await assertConfirmed(await handleQualimReturn(request('&return_url=https://evil.test&email=private@example.test'), dependencies()));
});

test('direct SCA, legacy partner, and other-product purchases are all eligible after verified payment', async () => {
  for (const metadata of [null, {}, { returnPartner: 'qualim', returnProductId: 'prod_book_365' }, { returnPartner: 'qualim', returnProductId: 'other' }]) {
    await assertConfirmed(await handleQualimReturn(request(), dependencies({
      retrieveSession: async () => ({ ...session, metadata }),
      getOrder: async () => ({ ...order, items: [{ productId: 'another-product' }] }),
    })));
  }
});

test('paid ticketing orders use their own storage and the same fixed boutique return', async () => {
  const body = await assertConfirmed(await handleQualimReturn(request(), ticketDependencies()));
  assert.match(body, /Rencontre de test/);
  assert.match(body, /BIL-test-only/);
});

test('missing or malformed Stripe identifiers are rejected without provider calls', async () => {
  for (const id of ['', 'SCA-test-only', '<script>', 'cs_test_%22%3E']) {
    const response = await handleQualimReturn(new Request(`https://sca.test/api/checkout/retour-qualim?session_id=${id}`), dependencies({ retrieveSession: async () => assert.fail('must not call Stripe') }));
    assert.equal(response.status, 400);
    assert.equal(response.headers.get('location'), null);
    assert.doesNotMatch(await response.text(), /http-equiv="refresh"/);
  }
});

test('unknown checkout kinds and inconsistent provider references cannot access either order store', async () => {
  for (const mutation of [
    { id: 'cs_test_Wrong12345678' },
    { client_reference_id: null },
    { metadata: { checkoutType: 'unrelated-service' } },
    { metadata: { orderReference: 'SCA-unrelated' } },
    { metadata: { checkoutType: 'ticketing', ticketingReference: 'BIL-other', eventId: 'evt_test' } },
  ]) {
    const response = await handleQualimReturn(request(), dependencies({
      retrieveSession: async () => ({ ...session, ...mutation }),
      getOrder: async () => assert.fail('must reject before reading an unrelated order'),
      getTicketingOrder: async () => assert.fail('must reject before reading an unrelated order'),
    }));
    assert.equal(response.status, 404);
  }
});

test('missing, unrelated or wrong-session storefront orders never confirm', async () => {
  for (const record of [undefined, { ...order, reference: 'other' }, { ...order, stripeSessionId: 'cs_test_Other123456' }]) {
    const response = await handleQualimReturn(request(), dependencies({ getOrder: async () => record }));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('location'), null);
    assert.doesNotMatch(await response.text(), /http-equiv="refresh"/);
  }
});

test('ticketing rejects missing or mismatched event bindings and cannot fall through to storefront storage', async () => {
  for (const overrides of [
    { getTicketingOrder: async () => undefined },
    { getTicketingOrder: async () => ({ ...ticketOrder, eventId: 'evt_other' }) },
    { getTicketingOrder: async () => ({ ...ticketOrder, reference: 'BIL-other' }) },
    { getTicketingOrder: async () => ({ ...ticketOrder, stripeSessionId: 'cs_test_Other123456' }) },
    { retrieveSession: async () => ({ ...ticketSession, metadata: { checkoutType: 'ticketing', ticketingReference: 'BIL-test-only' } }) },
    { retrieveSession: async () => ({ ...ticketSession, metadata: { checkoutType: 'ticketing', eventId: 'evt_test' } }) },
  ]) {
    const response = await handleQualimReturn(request(), ticketDependencies(overrides));
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /http-equiv="refresh"/);
  }
});

test('success reference and event title are escaped before appearing in HTML', async () => {
  const hostileReference = 'BIL-<img src=x onerror=alert(1)>&"';
  const hostileTitle = '<script>alert(2)</script> & "event"';
  const body = await assertConfirmed(await handleQualimReturn(request(), ticketDependencies({
    retrieveSession: async () => ({
      ...ticketSession,
      client_reference_id: hostileReference,
      metadata: { ...ticketSession.metadata, ticketingReference: hostileReference, eventTitle: hostileTitle },
    }),
    getTicketingOrder: async reference => {
      assert.equal(reference, hostileReference);
      return { ...ticketOrder, reference: hostileReference };
    },
  })));
  assert.doesNotMatch(body, /<img|<script/i);
  assert.match(body, /&lt;script&gt;/);
  assert.match(body, /&lt;img/);
});

test('webhook delay polls internally, then confirms only after the persisted paid status arrives', async () => {
  for (const ticketing of [false, true]) {
    const paidOrder = ticketing ? ticketOrder : order;
    let stored = { ...paidOrder, paymentStatus: 'pending' };
    const deps = ticketing
      ? ticketDependencies({ getTicketingOrder: async () => stored })
      : dependencies({ getOrder: async () => stored });
    const waiting = await handleQualimReturn(request(), deps);
    assert.equal(waiting.status, 202);
    const body = await waiting.text();
    assert.match(body, /http-equiv="refresh"/);
    assert.match(body, /attempt=1/);
    assert.doesNotMatch(body, /quali-m-consult\.com/);
    stored = paidOrder;
    await assertConfirmed(await handleQualimReturn(request('&attempt=1'), deps));
  }
});

test('unpaid, incomplete, or not yet linked purchases do not claim success or open the boutique', async () => {
  for (const ticketing of [false, true]) {
    const baseSession = ticketing ? ticketSession : session;
    const baseOrder = ticketing ? ticketOrder : order;
    for (const mutation of [
      { session: { payment_status: 'unpaid' } },
      { session: { payment_status: 'no_payment_required' } },
      { session: { status: 'open' } },
      { order: { stripeSessionId: undefined } },
    ]) {
      const overrides = {
        retrieveSession: async () => ({ ...baseSession, ...(mutation.session || {}) }),
        [ticketing ? 'getTicketingOrder' : 'getOrder']: async () => ({ ...baseOrder, ...(mutation.order || {}) }),
      };
      const response = await handleQualimReturn(request(), ticketing ? ticketDependencies(overrides) : dependencies(overrides));
      assert.equal(response.status, 202);
      assert.equal(response.headers.get('location'), null);
      assert.doesNotMatch(await response.text(), /paiement a bien été reçu|Commande confirmée|Inscription confirmée|quali-m-consult\.com/i);
    }
  }
});

test('expired payments and cancelled orders stop without redirecting or polling', async () => {
  for (const ticketing of [false, true]) {
    const baseSession = ticketing ? ticketSession : session;
    const baseOrder = ticketing ? ticketOrder : order;
    for (const overrides of [
      { retrieveSession: async () => ({ ...baseSession, status: 'expired' }) },
      { [ticketing ? 'getTicketingOrder' : 'getOrder']: async () => ({ ...baseOrder, paymentStatus: 'cancelled' }) },
    ]) {
      const response = await handleQualimReturn(request(), ticketing ? ticketDependencies(overrides) : dependencies(overrides));
      assert.equal(response.status, 409);
      assert.doesNotMatch(await response.text(), /http-equiv="refresh"|quali-m-consult\.com/);
    }
  }
});

test('temporary provider/database errors reveal no details and stop polling after five minutes', async () => {
  for (const overrides of [
    { retrieveSession: async () => { throw Error('private provider detail'); } },
    { getOrder: async () => { throw Error('private database detail'); } },
  ]) {
    const deps = dependencies(overrides);
    const initial = await handleQualimReturn(request(), deps);
    assert.equal(initial.status, 202);
    const body = await initial.text();
    assert.match(body, /attempt=1/);
    assert.doesNotMatch(body, /private provider detail|private database detail/);
    for (const attempt of ['60', '999', 'bad']) {
      const response = await handleQualimReturn(request(`&attempt=${attempt}`), deps);
      assert.doesNotMatch(await response.text(), /http-equiv="refresh"/);
    }
  }
});

test('legacy partner entry still opens the real book product in the same tab', async () => {
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

test('inactive partner book does not set a referral cookie or redirect', async () => {
  const { GET } = loadRoute('app/partenaires/qualim/365/route.ts', {
    '@/lib/storage': { storage: () => ({ getProductById: async () => ({ isActive: false, isPhysical: true }) }) },
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
  });
  const response = await GET(new Request('https://sca.test/partenaires/qualim/365'));
  assert.equal(response.status, 404);
  assert.equal(response.headers.get('set-cookie'), null);
});

test('storefront checkout keeps the same amounts, cancellation URL and writes for all products and origins', async () => {
  for (const productId of ['prod_book_365', 'another-product']) {
    let stripeOptions;
    const writes = [];
    const input = {
      customer: { firstName: 'Test', lastName: 'Only', email: 'test@example.test', phone: '0000000000' },
      items: [{ productId, quantity: 2 }],
      shippingAddress: { country: 'FR', address1: 'Test', postalCode: '45000', city: 'Test' },
      supportEnabled: false,
    };
    const { POST } = loadRoute('app/api/checkout/route.ts', {
      'next/headers': { cookies: async () => assert.fail('referrer cookie must not govern a checkout return') },
      '@/lib/qualim-return': require('../lib/qualim-return.ts'),
      '@/lib/order-amounts': require('../lib/order-amounts.ts'),
      '@/lib/storage': { storage: () => ({
        getProducts: async () => [],
        saveOrder: async value => writes.push(structuredClone(value)),
        updateOrder: async (reference, value) => writes.push(structuredClone(value)),
      }) },
      '@/lib/validators': { checkoutSchema: { safeParse: value => ({ success: true, data: value }) } },
      '@/lib/cart': {
        resolveCart: () => ({ errors: [], requiresShipping: true, items: [{ product: { id: productId, title: 'Produit de test', offerType: 'product', pricingMode: 'flexible' }, unitAmount: 500, quantity: 2 }] }),
        computeTotals: () => ({ subtotalAmount: 1000, shippingAmount: 0, totalAmount: 1000, totalPhysicalQuantity: 2 }),
      },
      '@/lib/destinations': { resolveDestinationCodeForPostalCode: () => 'FR' },
      '@/lib/utils': { uniqueId: prefix => `${prefix}_test`, orderReference: () => 'SCA-test-only' },
      '@/lib/stripe': { stripe: () => ({ checkout: { sessions: { create: async options => { stripeOptions = options; return { id: sessionId, url: 'https://checkout.stripe.com/test-only' }; } } } }) },
    }, { QUALIM_RETURN_ENABLED: 'false' });
    const response = await POST(new Request('https://sca.test/api/checkout', { method: 'POST', body: JSON.stringify(input) }));
    assert.equal(response.status, 200);
    assert.equal(stripeOptions.cancel_url, 'https://sca.test/annulation?reference=SCA-test-only');
    assert.equal(stripeOptions.success_url, 'https://sca.test/api/checkout/retour-qualim?session_id={CHECKOUT_SESSION_ID}');
    assert.equal(stripeOptions.metadata.returnPartner, 'qualim');
    assert.equal(stripeOptions.metadata.totalAmount, '1000');
    assert.equal(stripeOptions.line_items[0].quantity, 2);
    assert.equal(stripeOptions.line_items[0].price_data.unit_amount, 500);
    assert.equal(writes.length, 2);
    assert.equal(writes[0].paymentStatus, 'pending');
    assert.equal(writes[1].stripeSessionId, sessionId);
    assert.equal(writes[1].totalAmount, 1000);
    assert.equal((await response.json()).url, 'https://checkout.stripe.com/test-only');
  }
});

test('paid ticket checkout preserves event, participant, amount, cancellation and pending-order writes', async () => {
  let stripeOptions;
  const writes = [];
  const event = { id: 'evt_test', slug: 'rencontre-test', title: 'Rencontre de test', isVisible: true, status: 'published', allowExtraDonation: true, organizerEmail: 'organizer@example.test', organizerPhone: '0000000000' };
  const input = {
    eventSlug: event.slug,
    payer: { firstName: 'Test', lastName: 'Only', email: 'test@example.test', phone: '0000000000' },
    lines: [{ rateId: 'rate_test', quantity: 1 }],
    participants: [{ rateId: 'rate_test', firstName: 'Participant', lastName: 'Test', age: '30', email: 'participant@example.test', phone: '0000000000', originCity: 'Test' }],
    extraDonationAmount: 100,
  };
  const { POST } = loadRoute('app/api/ticketing/checkout/route.ts', {
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
    '@/lib/ticketing': { ticketingStorage: () => ({
      getTicketingEventBySlug: async slug => { assert.equal(slug, event.slug); return event; },
      getTicketingRates: async id => { assert.equal(id, event.id); return [{ id: 'rate_test', name: 'Tarif test', type: 'fixed', amount: 1200, isActive: true }]; },
      getTicketingCustomFields: async () => [],
      getTicketingOrderByReference: async () => undefined,
      saveTicketingOrder: async value => writes.push(structuredClone(value)),
      updateTicketingOrder: async (reference, value) => { assert.equal(reference, value.reference); writes.push(structuredClone(value)); },
    }) },
    '@/lib/stripe': { stripe: () => ({ checkout: { sessions: { create: async options => { stripeOptions = options; return { id: sessionId, url: 'https://checkout.stripe.com/test-only' }; } } } }) },
  }, { QUALIM_RETURN_ENABLED: 'false' });
  const response = await POST(new Request('https://sca.test/api/ticketing/checkout', { method: 'POST', body: JSON.stringify(input) }));
  assert.equal(response.status, 200);
  const output = await response.json();
  assert.match(output.reference, /^BIL-/);
  assert.equal(stripeOptions.success_url, 'https://sca.test/api/checkout/retour-qualim?session_id={CHECKOUT_SESSION_ID}');
  assert.equal(stripeOptions.cancel_url, `https://sca.test/evenements/rencontre-test?paiement=cancel&reference=${output.reference}`);
  assert.equal(stripeOptions.metadata.checkoutType, 'ticketing');
  assert.equal(stripeOptions.metadata.ticketingReference, output.reference);
  assert.equal(stripeOptions.metadata.eventId, event.id);
  assert.equal(stripeOptions.metadata.totalAmount, '1300');
  assert.equal(stripeOptions.line_items.length, 2);
  assert.equal(stripeOptions.line_items[0].price_data.unit_amount, 1200);
  assert.equal(stripeOptions.line_items[1].price_data.unit_amount, 100);
  assert.equal(writes.length, 2);
  assert.equal(writes[0].paymentStatus, 'pending');
  assert.equal(writes[1].stripeSessionId, sessionId);
  assert.equal(writes[1].participants.length, 1);
  assert.equal(writes[1].eventId, event.id);
  assert.equal(writes[1].totalAmount, 1300);
  assert.equal(output.url, 'https://checkout.stripe.com/test-only');
});

const redirectSignal = location => {
  const error = new Error('Test-only navigation');
  error.testRedirect = location;
  throw error;
};
function renderedText(element) {
  if (element == null || typeof element === 'boolean') return '';
  if (typeof element === 'string' || typeof element === 'number') return String(element);
  if (Array.isArray(element)) return element.map(renderedText).join(' ');
  return renderedText(element.props?.children);
}
function loadConfirmationPage(getOrderByReference) {
  return loadRoute('app/confirmation/page.tsx', {
    'next/navigation': { redirect: redirectSignal },
    '@/lib/storage': { storage: () => ({ getOrderByReference }) },
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
  }).default;
}
const legacyEvent = { id: 'evt_test', slug: 'rencontre-test', title: 'Rencontre de test', isVisible: true, status: 'published' };
function loadEventPage(getTicketingOrderByReference) {
  return loadRoute('app/evenements/[slug]/page.tsx', {
    'next/navigation': { redirect: redirectSignal, notFound: () => { throw Error('Unexpected event not found'); } },
    '@/components/PublicTicketingSelectionClient': { default: () => null, __esModule: true },
    '@/lib/auth': { getOrganizerSession: async () => null },
    '@/lib/ticketing': { ticketingStorage: () => ({
      getTicketingEventBySlug: async () => legacyEvent,
      getTicketingOrderByReference,
      getTicketingRates: async () => [],
      getTicketingCustomFields: async () => [],
    }) },
    '@/lib/qualim-return': require('../lib/qualim-return.ts'),
  }).default;
}

test('legacy storefront confirmation resolves its stored session but never bypasses verified-payment checks', async () => {
  for (const paymentStatus of ['paid', 'pending']) {
    const Page = loadConfirmationPage(async reference => { assert.equal(reference, order.reference); return { ...order, paymentStatus }; });
    await assert.rejects(Page({ searchParams: Promise.resolve({ reference: order.reference }) }), error => {
      assert.equal(error.testRedirect, `/api/checkout/retour-qualim?session_id=${sessionId}`);
      assert.doesNotMatch(error.testRedirect, /quali-m-consult/);
      return true;
    });
  }
});

test('unknown, malformed, mismatched or unavailable legacy storefront records never display success', async () => {
  for (const record of [undefined, { ...order, reference: 'different' }, { ...order, stripeSessionId: undefined }, { ...order, stripeSessionId: 'not-a-session' }]) {
    const Page = loadConfirmationPage(async () => record);
    const tree = await Page({ searchParams: Promise.resolve({ reference: order.reference }) });
    assert.match(renderedText(tree), /Vérification de votre commande/);
    assert.doesNotMatch(renderedText(tree), /Commande confirmée|paiement a bien été reçu/);
  }
  for (const reference of ['', 'x'.repeat(121)]) {
    const Page = loadConfirmationPage(async () => assert.fail('must not look up an invalid reference'));
    const tree = await Page({ searchParams: Promise.resolve({ reference }) });
    assert.doesNotMatch(renderedText(tree), /Commande confirmée|paiement a bien été reçu/);
  }
  const Page = loadConfirmationPage(async () => { throw Error('private database detail'); });
  const tree = await Page({ searchParams: Promise.resolve({ reference: order.reference }) });
  assert.doesNotMatch(renderedText(tree), /private database detail|Commande confirmée/);
});

test('legacy ticketing success links must bind the stored order to the displayed event before verification', async () => {
  const Page = loadEventPage(async reference => { assert.equal(reference, ticketOrder.reference); return ticketOrder; });
  await assert.rejects(Page({ params: Promise.resolve({ slug: legacyEvent.slug }), searchParams: Promise.resolve({ paiement: 'success', reference: ticketOrder.reference }) }), error => {
    assert.equal(error.testRedirect, `/api/checkout/retour-qualim?session_id=${sessionId}`);
    return true;
  });
  for (const record of [undefined, { ...ticketOrder, eventId: 'other-event' }, { ...ticketOrder, stripeSessionId: undefined }, { ...ticketOrder, stripeSessionId: 'not-a-session' }]) {
    const OtherPage = loadEventPage(async () => record);
    const tree = await OtherPage({ params: Promise.resolve({ slug: legacyEvent.slug }), searchParams: Promise.resolve({ paiement: 'success', reference: ticketOrder.reference }) });
    assert.match(renderedText(tree), /Vérification de votre inscription/);
    assert.doesNotMatch(renderedText(tree), /Inscription confirmée|paiement a bien été reçu/);
  }
});

test('ordinary event visits and cancellation returns never start a confirmation redirect', async () => {
  for (const paiement of [undefined, 'cancel']) {
    const Page = loadEventPage(async () => assert.fail('ordinary event visit must not look up a paid order'));
    const tree = await Page({ params: Promise.resolve({ slug: legacyEvent.slug }), searchParams: Promise.resolve({ paiement, reference: ticketOrder.reference }) });
    assert.match(renderedText(tree), /Rencontre de test/);
    assert.doesNotMatch(renderedText(tree), /Inscription confirmée|paiement a bien été reçu|Vérification de votre inscription/);
  }
});

test('public verified-return route wires both order stores without consulting the obsolete activation flag', async () => {
  for (const ticketing of [false, true]) {
    const { GET } = loadRoute('app/api/checkout/retour-qualim/route.ts', {
      '@/lib/qualim-return': require('../lib/qualim-return.ts'),
      '@/lib/stripe': { stripe: () => ({ checkout: { sessions: { retrieve: async id => { assert.equal(id, sessionId); return ticketing ? ticketSession : session; } } } }) },
      '@/lib/storage': { storage: () => ({ getOrderByReference: async reference => { assert.equal(ticketing, false); assert.equal(reference, order.reference); return order; } }) },
      '@/lib/ticketing': { ticketingStorage: () => ({ getTicketingOrderByReference: async reference => { assert.equal(ticketing, true); assert.equal(reference, ticketOrder.reference); return ticketOrder; } }) },
    }, { QUALIM_RETURN_ENABLED: 'false' });
    await assertConfirmed(await GET(request()));
  }
});
