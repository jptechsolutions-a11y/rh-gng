'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export function CargoSelect({ cargos, atual }: { cargos: string[]; atual: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex-1 max-w-xs flex items-center gap-2">
      <select
        defaultValue={atual}
        onChange={(e) => start(() => router.push(`/comparar?cargo=${encodeURIComponent(e.target.value)}`))}
        className="h-9 w-full rounded-md border border-slate-200 bg-white text-sm px-2"
      >
        {cargos.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>
      {pending && <span className="text-xs text-perlog-slate">…</span>}
    </div>
  );
}
