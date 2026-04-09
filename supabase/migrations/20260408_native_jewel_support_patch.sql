-- Makes the JEWEL payment tables compatible with native JEWEL transfers.
alter table if exists public.dfk_token_payment_sessions
  add column if not exists payment_asset text not null default 'native_jewel';

alter table if exists public.dfk_token_payments
  add column if not exists payment_asset text not null default 'native_jewel';

-- Keep token_address compatible with older ERC-20 rows, but allow a native marker.
alter table if exists public.dfk_token_payment_sessions
  alter column token_address drop not null;

alter table if exists public.dfk_token_payments
  alter column token_address drop not null;

update public.dfk_token_payment_sessions
set token_address = 'native',
    payment_asset = 'native_jewel'
where coalesce(payment_asset, '') = ''
   or token_address = 'native'
   or token_address is null;

update public.dfk_token_payments
set token_address = 'native',
    payment_asset = 'native_jewel'
where coalesce(payment_asset, '') = ''
   or token_address = 'native'
   or token_address is null;

create index if not exists dfk_token_payment_sessions_payment_asset_idx
  on public.dfk_token_payment_sessions (payment_asset);

create index if not exists dfk_token_payments_payment_asset_idx
  on public.dfk_token_payments (payment_asset);
