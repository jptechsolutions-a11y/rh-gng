import postgres from 'postgres';
import { readFileSync } from 'node:fs';
const env = Object.fromEntries(readFileSync('.env.local','utf8').split(/\r?\n/).filter(l=>l && !l.startsWith('#') && l.includes('=')).map(l => { const i=l.indexOf('='); return [l.slice(0,i), l.slice(i+1)]; }));
const sql = postgres(env.DIRECT_URL, { ssl: 'require' });
try {
  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION public.no_modify_logs()
    RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public'
    AS $$
    begin
      if current_setting('app.allow_log_purge', true) = '1' then
        if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
      end if;
      raise exception 'logs sao append-only';
    end
    $$;
  `);
  console.log('OK: no_modify_logs atualizada (bypass via app.allow_log_purge = 1)');
} finally { await sql.end(); }
