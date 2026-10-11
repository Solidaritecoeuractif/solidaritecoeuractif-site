const eligible = new Set([
  'livre-gratuit-365-jours-avec-le-seigneur-jesus-christ',
  '365-jours-avec-le-seigneur-jesus-christ',
]);
export function showSevlogosDiscovery(product, setting) {
  return Boolean(product && product.isPhysical === true &&
    eligible.has(product.slug) && setting &&
    setting.ready === true && setting.enabled === true);
}
