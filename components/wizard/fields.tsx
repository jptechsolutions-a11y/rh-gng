'use client';
import { useFormContext } from 'react-hook-form';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/cn';
import type { EntrevistaInput } from '@/lib/validators';

type FieldName = keyof EntrevistaInput;

export function TextField({ name, label, type = 'text', placeholder, required, className }:
  { name: FieldName; label: string; type?: string; placeholder?: string; required?: boolean; className?: string }) {
  const { register, formState: { errors } } = useFormContext<EntrevistaInput>();
  const err = errors[name]?.message as string | undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={String(name)}>{label}{required && <span className="text-perlog-orange ml-0.5">*</span>}</Label>
      <Input id={String(name)} type={type} placeholder={placeholder} {...register(name)} />
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function SelectField({ name, label, options, required, className, placeholder }:
  { name: FieldName; label: string; options: string[]; required?: boolean; className?: string; placeholder?: string }) {
  const { register, formState: { errors } } = useFormContext<EntrevistaInput>();
  const err = errors[name]?.message as string | undefined;
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={String(name)}>{label}{required && <span className="text-perlog-orange ml-0.5">*</span>}</Label>
      <select
        id={String(name)}
        {...register(name)}
        className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60 focus-visible:border-perlog-orange"
      >
        <option value="">{placeholder ?? 'Selecione...'}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {err && <p className="text-xs text-red-600">{err}</p>}
    </div>
  );
}

export function TextareaField({ name, label, rows = 4, className }:
  { name: FieldName; label: string; rows?: number; className?: string }) {
  const { register } = useFormContext<EntrevistaInput>();
  return (
    <div className={cn('space-y-1.5', className)}>
      <Label htmlFor={String(name)}>{label}</Label>
      <textarea
        id={String(name)}
        rows={rows}
        {...register(name)}
        className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-perlog-orange/60 focus-visible:border-perlog-orange"
      />
    </div>
  );
}
