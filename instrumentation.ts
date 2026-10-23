// Server-only operational evidence for Node.js security patch verification.
// Logs only the runtime version; never credentials, requests or user data.
export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.info('[runtime-version]', JSON.stringify({ node: process.versions.node }));
  }
}
