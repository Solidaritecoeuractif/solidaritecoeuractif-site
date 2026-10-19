/** Invalid JSON is intentionally left invalid for the server schema to reject. */
export function groupedShippingFromForm(data: FormData) {
  const raw = data.get("groupedShipping");
  if (typeof raw !== "string" || !raw) return undefined;
  try { return JSON.parse(raw); } catch { return raw; }
}
