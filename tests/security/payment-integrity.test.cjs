const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");

const source = fs.readFileSync(path.join(__dirname,"../../lib/payment-integrity.ts"),"utf8");
const compiled = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
const moduleValue={exports:{}};
new Function("exports","module",compiled.outputText)(moduleValue.exports,moduleValue);
const {paymentSessionMatchesOrder}=moduleValue.exports;

const session={id:"cs_test_1",mode:"payment",status:"complete",payment_status:"paid",
  client_reference_id:"ORD-1",currency:"eur",amount_total:1400};
const order={reference:"ORD-1",stripeSessionId:"cs_test_1",currency:"EUR",totalAmount:1400,paymentStatus:"pending"};
test("paiement validé après rapprochement de la commande",()=>assert.equal(paymentSessionMatchesOrder(session,order),true));
for(const [reason,key,value] of [
  ["non payé","payment_status","unpaid"],
  ["incomplet","status","open"],
  ["mauvais mode","mode","setup"],
  ["autre session","id","cs_test_2"],
  ["autre commande","client_reference_id","ORD-2"],
  ["autre montant","amount_total",1500],
  ["autre devise","currency","usd"],
]){
  test("rejette "+reason,()=>assert.equal(paymentSessionMatchesOrder({...session,[key]:value},order),false));
}
test("rejette les commandes incomplètes ou annulées",()=>{
  assert.equal(paymentSessionMatchesOrder(session,{...order,stripeSessionId:undefined}),false);
  assert.equal(paymentSessionMatchesOrder(session,{...order,totalAmount:0}),false);
  assert.equal(paymentSessionMatchesOrder(session,{...order,paymentStatus:"cancelled"}),false);
});
