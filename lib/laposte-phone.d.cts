export type PhoneResult = { value: string; original: string; note: string; error?: string };
export function normalizeLaPostePhone(raw: unknown, destination: string): PhoneResult;
