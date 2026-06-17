export default async function handler(req, res) {
  const { reqHandler } = await import('../dist/prep-vault/server/server.mjs');
  return reqHandler(req, res);
}
