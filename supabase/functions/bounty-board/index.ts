import { createClient } from 'jsr:@supabase/supabase-js@2';
import { loadValidWalletSession, normalizeAddress } from '../_shared/wallet-session.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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


function capRewardText(value: unknown) {
  const text = typeof value === 'string' ? value.trim() : '';
  const match = text.match(/^(\d+)\s*J$/i);
  if (!match) return text || '100J';
  const amount = Math.min(100, Number(match[1] || 0));
  return `${amount}J`;
}

function createAdmin() {
  return createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

async function resolveSessionWallet(admin: ReturnType<typeof createAdmin>, req: Request) {
  const authHeader = req.headers.get('Authorization') || '';
  const fallbackHeader = req.headers.get('x-session-token') || '';
  const token = String(fallbackHeader).trim() || authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data: session } = await admin
    .from('wallet_sessions')
    .select('wallet_address, expires_at, revoked_at, session_origin, user_agent_hash')
    .eq('session_token', token)
    .maybeSingle();
  if (!session || session.revoked_at) return null;
  const contextError = await validateSessionContext(req, session as Record<string, unknown>);
  if (contextError) return null;
  if (Date.now() >= new Date(session.expires_at).getTime()) return null;
  return normalizeAddress(session.wallet_address);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { status: 200, headers: corsHeaders });
  try {
    const admin = createAdmin();
    const body = await req.json().catch(() => ({}));
    const requestedWallet = normalizeAddress(body.walletAddress as string);
    const sessionWallet = await resolveSessionWallet(admin, req);
    const walletAddress = requestedWallet && sessionWallet === requestedWallet ? requestedWallet : '';

    const { data: rows, error } = await admin
      .from('bounties')
      .select('id, sort_order, title, reward_text, required_wave, detail, unlock_delay_hours, reveal_at, claimed_at, claimed_by_wallet, claimed_by_name')
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const usedRunIds = new Set<string>();
    let viewerBestWave = 0;
    let viewerRuns: Array<{ id: string; wave_reached: number | null; completed_at?: string | null }> = [];
    if (walletAddress) {
      const { data: player } = await admin
        .from('players')
        .select('best_wave')
        .eq('wallet_address', walletAddress)
        .maybeSingle();
      viewerBestWave = Number(player?.best_wave || 0);

      const { data: usedRunRows } = await admin
        .from('bounties')
        .select('claimed_run_id')
        .not('claimed_run_id', 'is', null);
      for (const row of usedRunRows || []) {
        if (typeof row.claimed_run_id === 'string' && row.claimed_run_id) usedRunIds.add(row.claimed_run_id);
      }

      const { data: viewerRunsData } = await admin
        .from('runs')
        .select('id, wave_reached, completed_at')
        .eq('wallet_address', walletAddress)
        .order('completed_at', { ascending: false });
      viewerRuns = (viewerRunsData || []) as Array<{ id: string; wave_reached: number | null; completed_at?: string | null }>;
    }

    const now = new Date();
    const nextUnclaimed = (rows || []).find((row) => !row.claimed_at) || null;
    const nextRevealAt = nextUnclaimed?.reveal_at || null;

    const entries = (rows || []).map((row) => {
      const claimed = Boolean(row.claimed_at);
      const revealed = claimed || new Date(row.reveal_at).getTime() <= now.getTime();
      let status = 'locked';
      if (claimed) status = 'claimed';
      else if (revealed && nextUnclaimed && row.id === nextUnclaimed.id) status = 'open';
      else if (!revealed && nextUnclaimed && row.id === nextUnclaimed.id) status = 'cooldown';
      const claimedByDisplay = cleanName(row.claimed_by_name) || cleanName(row.claimed_by_wallet);
      const requiredWave = Number(row.required_wave || 0);
      const viewerEligible = walletAddress
        ? viewerBestWave >= requiredWave && (viewerRuns || []).some((run) => Number(run.wave_reached || 0) >= requiredWave && !usedRunIds.has(run.id))
        : false;
      return {
        id: row.id,
        tier: row.sort_order,
        title: row.title,
        reward: capRewardText(row.reward_text),
        requiredWave: Number(row.required_wave || 0),
        detail: row.detail,
        status,
        revealed,
        revealAt: row.reveal_at,
        claimedAt: row.claimed_at,
        claimedByDisplay,
        viewerEligible,
        viewerCanClaim: status === 'open' && viewerEligible,
      };
    });

    const runs = viewerRuns.map((run, index) => ({
      id: run.id,
      runNumber: index + 1,
      bestWave: Number(run.wave_reached || 0),
      used: usedRunIds.has(run.id),
      completedAt: run.completed_at || null,
    }));

    return json({
      ok: true,
      currentTime: now.toISOString(),
      nextRevealAt,
      entries,
      runs,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to load bounty board.' }, 500);
  }
});
