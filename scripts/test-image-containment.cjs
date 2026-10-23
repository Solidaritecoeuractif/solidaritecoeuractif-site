const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const compiled = ts.transpileModule(fs.readFileSync(require.resolve('../next.config.ts'), 'utf8'), {
  compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022},
}).outputText;
const loaded = {exports: {}};
vm.runInNewContext(compiled, {module: loaded, exports: loaded.exports, require});
const config = loaded.exports.default;
const { ImageOptimizerCache } = require('next/dist/server/image-optimizer');
const { getImgProps } = require('next/dist/shared/lib/get-img-props');
const { imageConfigDefault } = require('next/dist/shared/lib/image-config');
const images = {...imageConfigDefault, ...config.images};
const nextConfig = {images};

test('local image optimization is refused before fetching or decoding', () => {
  for (const url of ['/logo-association.png', '/api/couvertures/book', '/cover.jpg?x=1']) {
    const result = ImageOptimizerCache.validateParams({}, {url, w: '640', q: '75'}, nextConfig, false);
    assert.equal(result.errorMessage, '\"url\" parameter is not allowed');
  }
});

test('remote image optimization is refused before fetching or decoding', () => {
  for (const url of ['https://images.unsplash.com/photo-test', 'https://plus.unsplash.com/photo-test', 'https://example.com/cover.jpg']) {
    const result = ImageOptimizerCache.validateParams({}, {url, w: '640', q: '75'}, nextConfig, false);
    assert.equal(result.errorMessage, '\"url\" parameter is not allowed');
  }
});

test('visible images keep their original URL and do not request optimization', () => {
  for (const src of ['/logo-association.png', '/api/couvertures/book', 'https://images.unsplash.com/photo-test']) {
    const {props} = getImgProps({src, alt: 'Book', width: 640, height: 480}, {imgConf: images, defaultLoader: () => {throw new Error('Unexpected image optimization');}});
    assert.equal(props.src, src);
    assert.equal(props.srcSet, undefined);
  }
});
