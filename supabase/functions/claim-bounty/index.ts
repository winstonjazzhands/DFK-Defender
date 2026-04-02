import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function normalizeAddress(address: string | null | undefined) {
  return String(address || '').trim().toLowerCase();
}


function normalizeOrigin(value: string | null | undefined) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    return new URL(raw).origin.toLowerCase();
  } catch (_error) {
    return '';
  }
}

function requestOrigin(req: Request) {
  return normalizeOrigin(req.headers.get('origin') || req.headers.get('referer') || '');
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function validateSessionContext(req: Request, session: Record<string, unknown>) {
  const expectedOrigin = normalizeOrigin(String(session.session_origin || ''));
  if (expectedOrigin) {
    const actualOrigin = requestOrigin(req);
    if (!actualOrigin || actualOrigin !== expectedOrigin) {
      return json({ error: 'Session origin mismatch.', code: 'session_origin_mismatch' }, 401);
    }
  }

  const expectedUserAgentHash = String(session.user_agent_hash || '').trim();
  if (expectedUserAgentHash) {
    const actualUserAgent = String(req.headers.get('user-agent') || '').trim();
    if (!actualUserAgent) {
      return json({ error: 'User agent missing for session.', code: 'missing_user_agent' }, 401);
    }
    const actualHash = await sha256Hex(actualUserAgent);
    if (actualHash !== expectedUserAgentHash) {
      return json({ error: 'Session device mismatch.', code: 'session_device_mismatch' }, 401);
    }
  }

  return null;
}

function cleanName(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  return text || null;
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) return json({ error: 'Enable run tracking before claiming a bounty.' }, 401);

    const admin = createAdmin();
    const { data: session, error: sessionError } = await admin
      .from('wallet_sessions')
      .select('session_token, wallet_address, expires_at, revoked_at, session_origin, user_agent_hash')
      .eq('session_token', token)
      .single();
    if (sessionError || !session) return json({ error: 'Session not found.' }, 401);
    const contextError = await validateSessionContext(req, session as Record<string, unknown>);
    if (contextError) return contextError;
    if (session.revoked_at) return json({ error: 'Session revoked.' }, 401);
    if (Date.now() >= new Date(session.expires_at).getTime()) return json({ error: 'Session expired.' }, 401);

    const body = await req.json().catch(() => ({}));
    const walletAddress = normalizeAddress(body.walletAddress as string);
    if (!walletAddress || walletAddress !== normalizeAddress(session.wallet_address)) {
      return json({ error: 'Wallet mismatch.' }, 401);
    }

    const { data: rows, error } = await admin
      .from('bounties')
      .select('id, sort_order, title, reward_text, required_wave, detail, unlock_delay_hours, reveal_at, claimed_at')
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const active = (rows || []).find((row) => !row.claimed_at) || null;
    if (!active) return json({ error: 'All bounties have already been claimed.' }, 409);

    const now = new Date();
    if (new Date(active.reveal_at).getTime() > now.getTime()) {
      return json({ error: 'The next bounty has not been revealed yet.' }, 409);
    }

    const { data: qualifyingRuns, error: qualifyingRunsError } = await admin
      .from('runs')
      .select('id, wave_reached, completed_at')
      .eq('wallet_address', walletAddress)
      .gte('wave_reached', Number(active.required_wave || 0))
      .order('wave_reached', { ascending: true })
      .order('completed_at', { ascending: true });
    if (qualifyingRunsError) throw qualifyingRunsError;

    if (!qualifyingRuns || qualifyingRuns.length === 0) {
      return json({ error: `No tracked run has reached wave ${active.required_wave} yet.` }, 409);
    }

    const { data: usedRunRows, error: usedRunRowsError } = await admin
      .from('bounties')
      .select('claimed_run_id')
      .not('claimed_run_id', 'is', null);
    if (usedRunRowsError) throw usedRunRowsError;

    const usedRunIds = new Set(
      (usedRunRows || [])
        .map((row) => row.claimed_run_id)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    );

    const qualifyingRun = qualifyingRuns.find((run) => !usedRunIds.has(run.id));
    if (!qualifyingRun) {
      return json({ error: 'All qualifying tracked runs for this bounty have already been used.' }, 409);
    }

    const { data: player } = await admin
      .from('players')
      .select('display_name, vanity_name')
      .eq('wallet_address', walletAddress)
      .maybeSingle();
    const claimedByName = cleanName(player?.vanity_name) || cleanName(player?.display_name) || walletAddress;

    const { error: claimError } = await admin
      .from('bounties')
      .update({
        claimed_by_wallet: walletAddress,
        claimed_by_name: claimedByName,
        claimed_run_id: qualifyingRun.id,
        claimed_at: now.toISOString(),
      })
      .eq('id', active.id)
      .is('claimed_at', null);
    if (claimError) throw claimError;

    const { data: nextBounty } = await admin
      .from('bounties')
      .select('id')
      .gt('sort_order', Number(active.sort_order || 0))
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    let nextRevealAt: string | null = null;
    if (nextBounty?.id) {
      const revealAt = new Date(now.getTime() + Number(active.unlock_delay_hours || 24) * 60 * 60 * 1000).toISOString();
      nextRevealAt = revealAt;
      const { error: nextError } = await admin
        .from('bounties')
        .update({ reveal_at: revealAt })
        .eq('id', nextBounty.id)
        .is('claimed_at', null);
      if (nextError) throw nextError;
    }

    return json({
      ok: true,
      claimedBountyId: active.id,
      title: active.title,
      nextRevealAt,
      message: `${claimedByName} claimed ${active.title}.`,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to claim bounty.' }, 500);
  }
});
