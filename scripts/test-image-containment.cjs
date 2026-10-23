const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const { NextRequest } = require('next/server');
const { unstable_doesMiddlewareMatch } = require('next/experimental/testing/server');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../middleware.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(compiled, { module: loaded, exports: loaded.exports, require, URL });
const { middleware, config } = loaded.exports;

test('image requests are matched and rejected before any image work', async () => {
  for (const path of ['/_next/image?url=%2Flogo-association.png&w=640&q=75', '/_next/image/', '/_next/image/extra']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: path }), true);
    const response = await middleware(new NextRequest('https://sca.test' + path));
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(response.headers.get('location'), null);
  }
});

test('original images, public pages and payment webhooks are not intercepted', () => {
  for (const url of ['/logo-association.png', '/produit/livre', '/api/webhook', '/_next/static/app.js']) {
    assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url }), false);
  }
});

test('unauthenticated admin protection remains active', async () => {
  assert.equal(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: '/admin/commandes' }), true);
  const response = await middleware(new NextRequest('https://sca.test/admin/commandes'));
  assert.equal(response.status, 307);
  assert.equal(response.headers.get('location'), 'https://sca.test/admin-login');
});
