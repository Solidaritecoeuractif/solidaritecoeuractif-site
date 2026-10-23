const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');

function load(relative) {
  const filename = path.resolve(__dirname, '..', relative);
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    module, exports: module.exports,
    require: name => name.startsWith('@/') ? load(name.slice(2) + '.ts') : require(name),
    Buffer, Date,
  }, { filename });
  return module.exports;
}

test('patched SheetJS preserves order export text, accents, leading zeros and amounts', () => {
  const { toXlsxBuffer } = load('lib/exports.ts');
  const rows = [{ reference: 'SCA-TEST', nom: 'Échantillon', telephone: '0612345678',
    code_postal: '06220', montant: '23.96', quantite: 2, note: '=1+1' }];
  const bytes = toXlsxBuffer(rows);
  assert.ok(Buffer.isBuffer(bytes));
  const workbook = XLSX.read(bytes, { type: 'buffer' });
  assert.deepEqual(XLSX.utils.sheet_to_json(workbook.Sheets.Commandes), rows);
  assert.equal(workbook.Sheets.Commandes.G2.f, undefined);
});

test('ExcelJS remains compatible with the patched CommonJS UUID dependency', async () => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Inscriptions');
  sheet.columns = [{ header: 'Référence', key: 'ref' }, { header: 'Téléphone', key: 'phone' },
    { header: 'Montant', key: 'amount' }];
  sheet.addRow({ ref: 'TEST', phone: '0612345678', amount: 23.96 });
  sheet.getCell('C2').numFmt = '0.00';
  const bytes = await workbook.xlsx.writeBuffer();
  const restored = new ExcelJS.Workbook();
  await restored.xlsx.load(bytes);
  const result = restored.getWorksheet('Inscriptions');
  assert.equal(result.getCell('B2').value, '0612345678');
  assert.equal(result.getCell('C2').value, 23.96);
});
