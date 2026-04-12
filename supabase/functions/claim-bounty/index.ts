import { createClient } from 'jsr:@supabase/supabase-js@2';
import { isAutoJewelPayoutConfigured, tryAutoPayJewelClaim } from '../_shared/reward-payout.ts';

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

async function getWhitelistDecision(admin: ReturnType<typeof createAdmin>, walletAddress: string, claimType: 'daily_quest' | 'bounty', amountValue: number | null, claimDay: string) {
  const { data: rule, error: ruleError } = await admin
    .from('reward_claim_whitelist')
    .select('wallet_address, is_active, auto_daily, auto_bounty, max_claim_amount, daily_cap, notes')
    .eq('wallet_address', walletAddress)
    .maybeSingle();
  if (ruleError) throw ruleError;
  if (!rule || !rule.is_active) return { autoApprove: false, note: '' };

  const allowsType = claimType === 'daily_quest' ? !!rule.auto_daily : !!rule.auto_bounty;
  if (!allowsType) return { autoApprove: false, note: String(rule.notes || '').trim() || '' };

  const numericAmount = Number(amountValue || 0) || 0;
  const maxClaimAmount = rule.max_claim_amount == null ? null : Number(rule.max_claim_amount);
  if (maxClaimAmount != null && numericAmount > maxClaimAmount) {
    return { autoApprove: false, note: 'Whitelist max-claim guard prevented auto-approval.' };
  }

  const dailyCap = rule.daily_cap == null ? null : Number(rule.daily_cap);
  if (dailyCap != null) {
    const { data: sameDayRows, error: sameDayError } = await admin
      .from('reward_claim_requests')
      .select('amount_value, status')
      .eq('wallet_address', walletAddress)
      .eq('claim_day', claimDay)
      .in('status', ['approved', 'paid']);
    if (sameDayError) throw sameDayError;
    const usedToday = (sameDayRows || []).reduce((sum, row) => sum + (Number(row.amount_value || 0) || 0), 0);
    if ((usedToday + numericAmount) > dailyCap) {
      return { autoApprove: false, note: 'Whitelist daily cap prevented auto-approval.' };
    }
  }

  const noteParts = ['Auto-approved by whitelist rule.'];
  const notes = String(rule.notes || '').trim();
  if (notes) noteParts.push(notes);
  return { autoApprove: true, note: noteParts.join(' ') };
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

    const rewardAmountText = String(active.reward_text || '').trim() || 'Reward pending';
    const claimDay = now.toISOString().slice(0, 10);
    const amountValue = Number((rewardAmountText.match(/([\d.]+)/) || [])[1] || 0) || null;
    const whitelistDecision = await getWhitelistDecision(admin, walletAddress, 'bounty', amountValue, claimDay);
    const requestKey = `bounty:${String(active.id)}`;

    const { data: existingClaim, error: existingError } = await admin
      .from('reward_claim_requests')
      .select('id, status, tx_hash, paid_at, reward_currency, amount_value, amount_text, wallet_address, admin_note, approved_at, resolved_at, resolved_by_wallet, failure_reason')
      .eq('request_key', requestKey)
      .maybeSingle();
    if (existingError) throw existingError;
    if (existingClaim?.id) {
      return json({
        ok: true,
        claimedBountyId: active.id,
        title: active.title,
        status: existingClaim.status || 'pending',
        txHash: existingClaim.tx_hash || null,
        message: (existingClaim.status === 'paid' || existingClaim.tx_hash)
          ? `${claimedByName} already received the payout for ${active.title}.`
          : `${claimedByName} already claimed ${active.title}.`,
      });
    }

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

    const rewardInsert = {
      request_key: requestKey,
      wallet_address: walletAddress,
      claim_type: 'bounty',
      status: whitelistDecision.autoApprove ? 'approved' : 'pending',
      player_name_snapshot: claimedByName,
      amount_text: rewardAmountText,
      amount_value: amountValue,
      reward_currency: /avax/i.test(rewardAmountText) ? 'AVAX' : (/jewel/i.test(rewardAmountText) || /\bJ\b/i.test(rewardAmountText) ? 'JEWEL' : null),
      reason_text: active.title,
      source_ref: `bounty:${String(active.id)}`,
      run_id: qualifyingRun.id,
      claim_day: claimDay,
      approved_at: whitelistDecision.autoApprove ? now.toISOString() : null,
      resolved_at: whitelistDecision.autoApprove ? now.toISOString() : null,
      resolved_by_wallet: whitelistDecision.autoApprove ? 'whitelist:auto' : null,
      admin_note: whitelistDecision.note || null,
    };
    const { data: insertedClaim, error: rewardRequestError } = await admin
      .from('reward_claim_requests')
      .insert(rewardInsert)
      .select('id, status, tx_hash, paid_at, reward_currency, amount_value, amount_text, wallet_address, admin_note, approved_at, resolved_at, resolved_by_wallet, failure_reason')
      .single();
    if (rewardRequestError) throw rewardRequestError;

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

    let status = insertedClaim?.status || 'pending';
    let txHash = insertedClaim?.tx_hash || null;
    let message = whitelistDecision.autoApprove
      ? `${claimedByName} claimed ${active.title}. Claim auto-approved for this whitelisted wallet.`
      : `${claimedByName} claimed ${active.title}.`;

    if (whitelistDecision.autoApprove && insertedClaim?.id) {
      const payoutResult = await tryAutoPayJewelClaim(admin, {
        id: insertedClaim.id,
        wallet_address: insertedClaim.wallet_address || walletAddress,
        status: insertedClaim.status,
        amount_value: insertedClaim.amount_value,
        reward_currency: insertedClaim.reward_currency,
        amount_text: insertedClaim.amount_text,
        admin_note: insertedClaim.admin_note,
        approved_at: insertedClaim.approved_at,
        resolved_at: insertedClaim.resolved_at,
        resolved_by_wallet: insertedClaim.resolved_by_wallet,
        tx_hash: insertedClaim.tx_hash,
        paid_at: insertedClaim.paid_at,
        failure_reason: insertedClaim.failure_reason,
      });
      if (payoutResult.paid) {
        status = 'paid';
        txHash = payoutResult.txHash || null;
        message = `${claimedByName} claimed ${active.title} and treasury paid it automatically.`;
      } else if (payoutResult.attempted) {
        status = 'approved';
        message = `${claimedByName} claimed ${active.title}. Auto-approved, but treasury payout failed and needs review: ${payoutResult.message}`;
      } else if (isAutoJewelPayoutConfigured()) {
        message = `${claimedByName} claimed ${active.title}. Auto-approved. ${payoutResult.message}`;
      } else {
        message = `${claimedByName} claimed ${active.title}. Auto-approved. Set TREASURY_PRIVATE_KEY in Supabase secrets to enable automatic JEWEL payouts.`;
      }
    }

    return json({
      ok: true,
      claimedBountyId: active.id,
      title: active.title,
      nextRevealAt,
      status,
      txHash,
      message,
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Failed to claim bounty.' }, 500);
  }
});
