const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, cache-control',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const GRAPHQL_URL = 'https://api.defikingdoms.com/graphql';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return json({ ok: true }, 200);
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);
  try {
    const body = await req.json().catch(() => ({}));
    const address = String(body && body.address || '').trim().toLowerCase();
    const chain = String(body && body.chain || 'metis').trim().toLowerCase();
    if (!address) return json({ error: 'Address is required.' }, 400);

    const query = `query OwnedHeroes($owner: String!, $skip: Int!) { heroes(first: 250, skip: $skip, where: { owner: $owner }) { id normalizedId network level rarity mainClass subClass mainClassStr subClassStr } }`;
    const response = await fetch(GRAPHQL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { owner: address, skip: 0 } }),
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) return json({ error: `Hero API returned ${response.status}` }, response.status);
    if (!payload || payload.errors) return json({ error: 'Hero API query failed.', details: payload && payload.errors ? payload.errors : null }, 502);
    const heroes = Array.isArray(payload.data && payload.data.heroes) ? payload.data.heroes.filter((row) => String(row && row.network || '').trim().toLowerCase() === chain) : [];
    return json({ heroes }, 200);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error || 'wallet-heroes failed.') }, 500);
  }
});

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
