import test from "node:test";
import assert from "node:assert/strict";
import { showSevlogosDiscovery } from "../lib/sevlogos-publication-policy.mjs";

const paper = {
  slug: "livre-gratuit-365-jours-avec-le-seigneur-jesus-christ",
  isPhysical: true,
};
test("default OFF with missing, unavailable or false settings", () => {
  for (const value of [null, undefined, {}, {ready:false,enabled:true},
    {ready:true,enabled:false}, {ready:false,enabled:false}]) {
    assert.equal(showSevlogosDiscovery(paper, value), false);
  }
});
test("only the manually enabled 365 paper-book page is eligible", () => {
  const enabled = {ready:true,enabled:true};
  assert.equal(showSevlogosDiscovery(paper, enabled), true);
  assert.equal(showSevlogosDiscovery({...paper,isPhysical:false},enabled), false);
  assert.equal(showSevlogosDiscovery({...paper,slug:"un-autre-livre"},enabled), false);
  assert.equal(showSevlogosDiscovery(null,enabled), false);
});
