const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function loader(overrides = {}, env = {}) {
  const cache = new Map();
  function load(relative) {
    const filename = path.resolve(__dirname, '..', relative);
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = { exports: {} };
    cache.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    vm.runInNewContext(compiled, {
      module, exports: module.exports,
      require(name) {
        if (name in overrides) return overrides[name];
        if (name.startsWith('@/')) return load(name.slice(2) + '.ts');
        return require(name);
      },
      process: { env, cwd: () => path.resolve(__dirname, '..') },
      Request, Response, URL, FormData, File, Buffer, console, structuredClone,
    }, { filename });
    return module.exports;
  }
  return load;
}
const load = loader();
const { DEFAULT_GROUPED_SHIPPING, groupedTierLabel } = load('lib/grouped-shipping.ts');
const { resolveCart, computeTotals } = load('lib/cart.ts');
const { calculateZoneAdjustedLineMinimum, resolveDestinationCodeForPostalCode } = load('lib/destinations.ts');
const { orderItemTotal, stripeOrderLine } = load('lib/order-amounts.ts');
const { productFormSchema } = load('lib/validators.ts');
const product = {
  id: 'prod_book_365', slug: 'livre-365', title: 'Livre 365', shortDescription: 'Livre offert pour tous', longDescription: 'Livre offert pour accompagner la prière',
  offerType: 'product', pricingMode: 'flexible', isPhysical: true, requiresShipping: true, isActive: true,
  minimumAmount: 1398, minimumAmountOutreMer: 1996, minimumAmountInternational: 3694, maxQuantity: 10,
  groupedShipping: structuredClone(DEFAULT_GROUPED_SHIPPING), createdAt: '2026-10-19T12:00:00Z', updatedAt: '2026-10-19T12:00:00Z',
};
const cartInput = quantity => [{ productId: product.id, quantity }];
const expected = (base, quantity) => base * quantity - (quantity === 2 ? 400 : quantity >= 3 ? 600 : 0);

for (const [destination, base] of [['FR', 1398], ['FR-GP', 1996], ['FR-PF', 1996], ['BE', 3694], ['BF', 3694], ['US', 3694]]) {
  test(`exact grouped total and Stripe charge for quantities 1–10, ${destination}`, () => {
    for (let quantity = 1; quantity <= 10; quantity++) {
      const cart = resolveCart(cartInput(quantity), [product], destination);
      assert.equal(cart.errors.length, 0);
      const total = expected(base, quantity);
      assert.equal(calculateZoneAdjustedLineMinimum(product, quantity, destination), total);
      assert.equal(cart.subtotal, total);
      assert.equal(computeTotals(cart.items).totalAmount, total);
      const item = { ...cart.items[0], id: 'test-item', productTitle: product.title, offerType: 'product', pricingMode: 'flexible' };
      assert.equal(orderItemTotal(item), total);
      const stripe = stripeOrderLine(item, 'eur', 'TEST');
      assert.equal(stripe.quantity * stripe.price_data.unit_amount, total);
      assert.equal(cart.items[0].quantity, quantity);
    }
  });
}

test('postal codes select the correct overseas base', () => {
  const destination = resolveDestinationCodeForPostalCode('FR', '97110');
  assert.equal(resolveCart(cartInput(2), [product], destination).subtotal, 3592);
});

test('duplicate lines combine once and cannot bypass the quantity cap or multiply savings', () => {
  const cart = resolveCart([...cartInput(2), ...cartInput(2)], [product], 'FR');
  assert.equal(cart.items.length, 1);
  assert.equal(cart.subtotal, 4992);
  assert.equal(cart.items[0].quantity, 4);
  assert.ok(resolveCart([...cartInput(6), ...cartInput(6)], [product], 'FR').errors.length);
});

test('invalid quantity, inactive offer and insufficient stock are rejected', () => {
  for (const q of [0, -1, 2.5, 11, NaN]) assert.ok(resolveCart(cartInput(q), [product], 'FR').errors.length);
  assert.ok(resolveCart(cartInput(2), [{ ...product, isActive: false }], 'FR').errors.length);
  assert.ok(resolveCart(cartInput(3), [{ ...product, stock: 2 }], 'FR').errors.length);
});

test('automatic totals ignore stale browser prices; donation and fixed-price items stay unchanged', () => {
  for (const customAmount of [1, 1398, 999999]) assert.equal(resolveCart([{ ...cartInput(2)[0], customAmount }], [product], 'FR').subtotal, 2396);
  const donation = { ...product, id: 'donation', isPhysical: false, requiresShipping: false, minimumAmount: 100 };
  const fixed = { ...product, id: 'fixed', pricingMode: 'fixed', fixedPrice: 1500 };
  const cart = resolveCart([...cartInput(2), { productId: donation.id, quantity: 1, customAmount: 500 }, { productId: fixed.id, quantity: 2 }], [product, donation, fixed], 'FR');
  assert.equal(cart.subtotal, 2396 + 500 + 3000);
  assert.equal(cart.errors.length, 0);
});

test('editable tiers, disabled scheme and destination base values drive the real totals', () => {
  const changed = { ...product, minimumAmount: 1500, groupedShipping: { ...product.groupedShipping, tiers: [{ minQuantity: 2, savingsAmount: 500 }, { minQuantity: 4, savingsAmount: 800 }] } };
  assert.equal(resolveCart(cartInput(3), [changed], 'FR').subtotal, 4000);
  assert.equal(resolveCart(cartInput(4), [changed], 'FR').subtotal, 5200);
  assert.equal(groupedTierLabel(changed.groupedShipping.tiers, 0), '2 à 3 exemplaires');
  assert.equal(groupedTierLabel(changed.groupedShipping.tiers, 1), '4 exemplaires ou plus');
  assert.equal(resolveCart(cartInput(3), [{ ...changed, groupedShipping: { ...changed.groupedShipping, enabled: false } }], 'FR').subtotal, 4500);
});

test('admin validation rejects duplicates, decreasing savings and prices that fall at thresholds', () => {
  assert.equal(productFormSchema.safeParse(product).success, true);
  for (const tiers of [
    [{ minQuantity: 2, savingsAmount: 400 }, { minQuantity: 2, savingsAmount: 600 }],
    [{ minQuantity: 2, savingsAmount: 600 }, { minQuantity: 3, savingsAmount: 400 }],
    [{ minQuantity: 2, savingsAmount: 99999 }],
    [{ minQuantity: 1, savingsAmount: 400 }],
    [{ minQuantity: 2, savingsAmount: 4.5 }],
  ]) assert.equal(productFormSchema.safeParse({ ...product, groupedShipping: { ...product.groupedShipping, tiers } }).success, false);
  assert.equal(productFormSchema.safeParse({ ...product, minimumAmount: 100 }).success, false);
});

function checkoutHarness(products = [product]) {
  const writes = []; let stripeOptions;
  const module = loader({
    'next/headers': { cookies: async () => ({ get: () => ({ value: '1' }) }) },
    '@/lib/storage': { storage: () => ({ getProducts: async () => products, saveOrder: async order => writes.push(structuredClone(order)), updateOrder: async (_, order) => writes.push(structuredClone(order)) }) },
    '@/lib/stripe': { stripe: () => ({ checkout: { sessions: { create: async options => { stripeOptions = options; return { id: 'cs_test_grouped_shipping', url: 'https://checkout.stripe.com/test-only' }; } } } }) },
  }, { QUALIM_RETURN_ENABLED: 'true', STRIPE_CURRENCY: 'eur' });
  return { module, writes, get stripeOptions() { return stripeOptions; } };
}
const checkoutBody = (quantity, supportAmount = 0) => ({
  items: cartInput(quantity), supportEnabled: supportAmount > 0, supportAmount,
  customer: { firstName: 'Test', lastName: 'Only', email: 'test@example.test', phone: '0000000000' },
  shippingAddress: { country: 'FR', address1: 'Adresse de test', postalCode: '45000', city: 'Test' },
});

test('real quote and checkout agree on exact cents and separate optional support', async () => {
  for (const quantity of [1, 2, 3, 4, 7, 9, 10]) {
    const h = checkoutHarness(); const body = checkoutBody(quantity, 777);
    const quote = await h.module('app/api/cart/quote/route.ts').POST(new Request('https://sca.test/api/cart/quote', { method: 'POST', body: JSON.stringify({ ...body, country: 'FR' }) }));
    assert.equal(quote.status, 200);
    const quoted = await quote.json();
    assert.equal(quoted.totalAmount, expected(1398, quantity) + 777);
    const response = await h.module('app/api/checkout/route.ts').POST(new Request('https://sca.test/api/checkout', { method: 'POST', body: JSON.stringify({ ...body, expectedTotalAmount: quoted.totalAmount }) }));
    assert.equal(response.status, 200);
    const saved = h.writes.at(-1);
    assert.equal(saved.totalAmount, quoted.totalAmount);
    assert.equal(saved.items[0].lineTotal, quoted.subtotalAmount);
    assert.equal(saved.items[0].quantity, quantity);
    assert.equal(h.stripeOptions.line_items.reduce((sum, line) => sum + line.quantity * line.price_data.unit_amount, 0), quoted.totalAmount);
    assert.equal(h.stripeOptions.metadata.supportAmount, '777');
    assert.equal(h.stripeOptions.metadata.totalPhysicalQuantity, String(quantity));
    assert.equal(h.stripeOptions.metadata.returnPartner, 'qualim');
  }
});

test('checkout with changed prices is rejected before order writes or Stripe', async () => {
  const h = checkoutHarness();
  const response = await h.module('app/api/checkout/route.ts').POST(new Request('https://sca.test/api/checkout', { method: 'POST', body: JSON.stringify({ ...checkoutBody(2), expectedTotalAmount: 2796 }) }));
  assert.equal(response.status, 409);
  assert.equal(h.writes.length, 0);
  assert.equal(h.stripeOptions, undefined);
});

test('historical orders retain their amounts; new email and exports use exact line totals', async () => {
  assert.equal(orderItemTotal({ quantity: 7, unitAmount: 1398 }), 9786);
  const h = checkoutHarness();
  await h.module('app/api/checkout/route.ts').POST(new Request('https://sca.test/api/checkout', { method: 'POST', body: JSON.stringify(checkoutBody(7)) }));
  const order = h.writes.at(-1);
  let email;
  const modules = loader({ resend: { Resend: class { emails = { send: async payload => { email = payload; } }; } } }, { EMAIL_FROM: 'test@example.test', RESEND_API_KEY: 'mock-only' });
  await modules('lib/email.ts').sendPaymentConfirmationEmail(order);
  assert.match(email.html, /91,86/);
  assert.doesNotMatch(email.html, /91,84/);
  const row = modules('lib/exports.ts').exportRows([order])[0];
  assert.equal(row.sous_total, '91.86');
  assert.match(row.lignes_commande, /total 91.86/);
});

test('product edit is authenticated and saves editable tiers and copy', async () => {
  const form = new FormData();
  for (const [key, value] of Object.entries(product)) if (typeof value === 'string' || typeof value === 'number') form.set(key, String(value));
  for (const key of ['isPhysical', 'requiresShipping', 'isActive']) form.set(key, 'on');
  const changed = { ...product.groupedShipping, title: 'À partager ensemble', tiers: [{ minQuantity: 2, savingsAmount: 500 }, { minQuantity: 4, savingsAmount: 700 }] };
  form.set('groupedShipping', JSON.stringify(changed));
  let saved;
  for (const authenticated of [false, true]) {
    const module = loader({
      '@/lib/auth': { isAdminAuthenticated: async () => authenticated },
      'next/cache': { revalidatePath: () => {} },
      '@/lib/storage': { storage: () => ({ getProductById: async () => product, updateProduct: async (_, value) => { saved = value; } }) },
    });
    const response = await module('app/api/products/[id]/route.ts').POST(new Request('https://sca.test/api/products/prod_book_365', { method: 'POST', body: form }), { params: Promise.resolve({ id: product.id }) });
    assert.equal(response.status, authenticated ? 303 : 401);
    if (!authenticated) assert.equal(saved, undefined);
  }
  assert.equal(saved.groupedShipping.title, changed.title);
  assert.equal(resolveCart(cartInput(2), [saved], 'FR').subtotal, 2296);
});
