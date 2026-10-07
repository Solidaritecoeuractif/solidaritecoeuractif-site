'use strict';
// Exécution : node scripts/test-laposte-export.cjs
// Données factices uniquement. Aucun accès à la base, à .env.local ou à La Poste.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),os=require('node:os');
const ts=require('typescript');let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('OK',name);};
const previous=require.extensions['.ts'];
require.extensions['.ts']=(mod,file)=>{const r=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});mod._compile(r.outputText,file);};
const root=path.resolve(__dirname,'..');
const {prepareLaPosteExport,laPosteNeedsCustoms}=require(path.join(root,'lib/laposte-export.ts'));
const {normalizeLaPostePhone}=require(path.join(root,'lib/laposte-phone.cjs'));
const {laPosteWorkbook}=require(path.join(root,'lib/laposte-workbook.ts'));
const make=(ref,country='FR',quantity=1,phone='0612345678')=>({id:ref,reference:ref,customer:{firstName:'Client',lastName:'DEMONSTRATION',email:'test@example.com',phone},shippingAddress:{country,address1:'10 rue de test',address2:'Bâtiment B',postalCode:({FR:'06220',CA:'H2X 1Y4',DE:'10115',IT:'00100',BE:'1000',MQ:'97230',CI:'00000'})[country]||'10000',city:'Ville de test'},items:[{id:'line',productTitle:'Livre GRATUIT 365 jours avec le Seigneur Jésus-Christ',quantity,unitAmount:0,offerType:'product',pricingMode:'fixed'}],paymentStatus:'paid',logisticsStatus:'to_process',createdAt:'2026-10-07T10:00:00Z',updatedAt:'2026-10-07T10:00:00Z',currency:'EUR',subtotalAmount:0,shippingAmount:1000,totalAmount:1000});
(async()=>{
 const domestic=prepareLaPosteExport([make('TEST-FR')]);
 test('18 colonnes et aucun champ douane imposé en France',()=>{assert.equal(domestic.headers.length,18);assert.equal(domestic.issues.length,0);assert.equal(domestic.rows[0].reason,undefined);});
 const mixed=prepareLaPosteExport([make('TEST-CA','CA',2,'5145550123'),make('TEST-FR','FR',3),make('TEST-DE','DE',1,'017612345678')]);
 test('Lot mixte conservé dans un fichier de 25 colonnes',()=>{assert.equal(mixed.headers.length,25);assert.equal(mixed.rows.length,3);assert.equal(mixed.mixed,true);assert.equal(mixed.issues.length,0);assert.deepEqual(mixed.rows.map(r=>r.external_reference),['TEST-CA','TEST-FR','TEST-DE']);});
 test('Douane uniquement sur les lignes concernées',()=>{assert.equal(mixed.rows[0].article_1_quantity,2);assert.equal(mixed.rows[0].article_1_unit_price,10);assert.equal(mixed.rows[0].article_1_unit_weight,.53);assert.equal(mixed.rows[0].article_1_tariff_number,'490199');assert.equal(mixed.rows[1].article_1_quantity,undefined);assert.equal(mixed.rows[2].reason,undefined);});
 for(const [n,w,dim] of [[1,.555,[25,18,4]],[2,1.155,[23,16,8]],[3,1.685,[23,16,8]],[4,2.215,[23,16,8]],[5,2.85,[25,20,15]],[6,3.43,[25,20,15]],[7,3.96,[25,20,15]]])test('Barème local '+n+' livre(s)',()=>{const r=prepareLaPosteExport([make('TEST-'+n,'FR',n)]).rows[0];assert.equal(r.package_1_weight,w);assert.equal(r.package_1_value,n*10);assert.deepEqual([r.package_1_length,r.package_1_width,r.package_1_height],dim);});
 for(const [raw,country,expected] of [['06 12 34 56 78','FR','+33612345678'],['612345678','FR','+33612345678'],['0033612345678','FR','+33612345678'],['33612345678','FR','+33612345678'],['(514) 555-0123','CA','+15145550123'],['15145550123','CA','+15145550123'],['017612345678','DE','+4917612345678'],['+49 (0)176 12345678','DE','+4917612345678'],['06 12345678','IT','+390612345678'],['3481234567','IT','+393481234567'],['0476400326','BE','+32476400326'],['0799062905','CH','+41799062905'],['0701234567','CI','+2250701234567'],['0696801875','MQ','+596696801875'],['+33759511406','CA','+33759511406']])test('Téléphone '+raw+' / '+country,()=>{const p=normalizeLaPostePhone(raw,country);assert.equal(p.error,undefined);assert.equal(p.value,expected);});
 for(const phone of ['3,93482E+11','4,91772E+11','2,25071E+12','2,25078E+12','123','06 12 34 56 78 / 07 12 34 56 78'])test('Numéro non inventé : '+phone,()=>{const p=normalizeLaPostePhone(phone,'FR');assert.ok(p.error);assert.equal(p.value,phone);});
 for(const qty of [0,1.5,8,10,100])test('Quantité hors format : '+qty,()=>assert.ok(prepareLaPosteExport([make('BAD','FR',qty)]).issues.length));
 test('Commande impayée bloquée',()=>assert.ok(prepareLaPosteExport([{...make('BAD'),paymentStatus:'pending'}]).issues.length));
 test('Aucune ligne écartée à cause d’une erreur',()=>{const b=prepareLaPosteExport([make('GOOD'),make('BAD','FR',8)]);assert.equal(b.rows.length,2);assert.ok(b.issues.length);});
 test('Autre produit non soumis au barème livre 365',()=>{const b=make('OTHER');b.items[0].productTitle='Prestation de conseil';assert.ok(prepareLaPosteExport([b]).issues.length);});
 test('Numéro et rue doivent rester complets',()=>{const b=make('ADDRESS');b.shippingAddress.address1='31bis';assert.ok(prepareLaPosteExport([b]).issues.length);});
 test('Doublon de référence signalé',()=>assert.ok(prepareLaPosteExport([make('DUP'),make('DUP')]).issues.length));
 test('Cas territorial ambigu non deviné',()=>assert.equal(laPosteNeedsCustoms('FR','97230','Sainte-Marie'),null));
 test('Zéro du code postal conservé',()=>assert.equal(domestic.rows[0].recipient_postal_code,'06220'));
 test('Export pur ne modifie pas les objets d’origine',()=>{const o=make('IMMUTABLE'),before=JSON.stringify(o);prepareLaPosteExport([o]);assert.equal(JSON.stringify(o),before);});
 const dir=process.env.SCA_TEST_OUTPUT||fs.mkdtempSync(path.join(os.tmpdir(),'sca-export-test-'));
 fs.mkdirSync(dir,{recursive:true});
 const files={domestic,mixed,customs:prepareLaPosteExport([make('TEST-MQ','MQ',7,'0696801875')])};
 for(const [label,data] of Object.entries(files)){const bytes=await laPosteWorkbook(data);test('XLSX ZIP '+label,()=>assert.equal(Buffer.from(bytes).readUInt32LE(0),0x04034b50));fs.writeFileSync(path.join(dir,label+'.xlsx'),bytes);fs.writeFileSync(path.join(dir,label+'.json'),JSON.stringify(data));}
 try{await laPosteWorkbook(prepareLaPosteExport([make('BAD','FR',8)]));assert.fail('devait bloquer');}catch(e){test('Workbook refuse une sélection invalide',()=>assert.match(e.message,/non valide/));}
 // Syntaxe des nouveaux fichiers UI et API, sans démarrer ni modifier le serveur.
 for(const file of ['components/LaPosteExportButton.tsx','components/OrdersTableClient.tsx','app/api/orders/export/laposte/route.ts'])test('Syntaxe '+file,()=>{const result=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);});
 console.log('\n'+checks+' contrôles réussis. Exemples factices (NE PAS IMPORTER) : '+dir);
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>{if(previous)require.extensions['.ts']=previous;});
