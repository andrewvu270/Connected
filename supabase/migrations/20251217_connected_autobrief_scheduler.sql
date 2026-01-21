create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net;
create extension if not exists vault;

create table if not exists public.connected_job_runs (
  job_name text not null,
  run_date date not null,
  ran_at timestamptz not null default now(),
  request_id bigint,
  primary key (job_name, run_date)
);

create or replace function public.connected_get_secret(secret_name text)
returns text
language plpgsql
security definer
as $$
declare
  v text;
begin
  select decrypted_secret
    into v
  from vault.decrypted_secrets
  where name = secret_name
  limit 1;

  if v is null or length(trim(v)) = 0 then
    raise exception 'Missing required vault secret: %', secret_name;
  end if;

  return v;
end;
$$;

create or replace function public.connected_http_post_job(job_name text, path text)
returns void
language plpgsql
security definer
as $$
declare
  tz text := 'America/New_York';
  local_now timestamp;
  local_date date;
  base_url text;
  admin_key text;
  url text;
  req_id bigint;
begin
  local_now := (now() at time zone tz);
  local_date := local_now::date;

  if exists (
    select 1
    from public.connected_job_runs r
    where r.job_name = connected_http_post_job.job_name
      and r.run_date = local_date
  ) then
    return;
  end if;

  base_url := public.connected_get_secret('connected_backend_base_url');
  admin_key := public.connected_get_secret('connected_backend_admin_key');

  url := rtrim(base_url, '/') || path;

  select net.http_post(
    url := url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-admin-key', admin_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into req_id;

  insert into public.connected_job_runs(job_name, run_date, ran_at, request_id)
  values (connected_http_post_job.job_name, local_date, now(), req_id)
  on conflict (job_name, run_date) do nothing;
end;
$$;

create or replace function public.connected_autobrief_tick()
returns void
language plpgsql
security definer
as $$
declare
  tz text := 'America/New_York';
  local_now timestamp;
  h int;
  m int;
begin
  local_now := (now() at time zone tz);
  h := extract(hour from local_now);
  m := extract(minute from local_now);

  if h = 5 and m = 0 then
    perform public.connected_http_post_job('news_pull', '/jobs/news/run');
  end if;

  if h = 6 and m = 0 then
    perform public.connected_http_post_job('cleanup', '/jobs/daily/cleanup');
  end if;

  if h = 6 and m = 5 then
    perform public.connected_http_post_job('brief_morning', '/jobs/brief/run_global?edition=morning');
  end if;

  if h = 12 and m = 5 then
    perform public.connected_http_post_job('brief_midday', '/jobs/brief/run_global?edition=midday');
  end if;

  if h = 18 and m = 5 then
    perform public.connected_http_post_job('brief_evening', '/jobs/brief/run_global?edition=evening');
  end if;
end;
$$;

select cron.schedule(
  'connected_autobrief_tick_every_minute',
  '* * * * *',
  $$ select public.connected_autobrief_tick(); $$
);
