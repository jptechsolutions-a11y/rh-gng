'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, LogIn, AlertCircle, UserCog, Mail, Lock, Building2 } from 'lucide-react';
import { loginAction, type LoginState } from '@/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="conecta-btn-primary w-full text-base disabled:opacity-70 disabled:cursor-wait"
    >
      <LogIn className="h-5 w-5" />
      {pending ? 'Entrando...' : 'ENTRAR'}
    </button>
  );
}

function Field({
  id,
  name,
  type,
  label,
  autoComplete,
  required,
  icon,
  defaultValue,
  rightSlot,
}: {
  id: string;
  name: string;
  type: string;
  label: string;
  autoComplete?: string;
  required?: boolean;
  icon: React.ReactNode;
  defaultValue?: string;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.18em] font-semibold text-conecta-primary"
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-conecta-accent pointer-events-none">
          {icon}
        </div>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          required={required}
          defaultValue={defaultValue}
          placeholder={label}
          className="w-full bg-white border border-slate-300 rounded-lg pl-10 pr-10 py-3 text-[15px] text-conecta-text placeholder-conecta-muted/60 focus:outline-none focus:border-conecta-accent focus:ring-2 focus:ring-conecta-accent/25 transition-colors"
        />
        {rightSlot && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">{rightSlot}</div>
        )}
      </div>
    </div>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form action={formAction} className="space-y-7">
      {modoAdmin ? (
        <Field
          id="usuario"
          name="usuario"
          type="text"
          label="Usuário administrador"
          autoComplete="username"
          required
          icon={<UserCog className="h-4 w-4" />}
        />
      ) : (
        <Field
          id="filial"
          name="filial"
          type="text"
          label="Código da filial"
          autoComplete="username"
          required
          icon={<Building2 className="h-4 w-4" />}
        />
      )}

      <Field
        id="senha"
        name="senha"
        type={showPwd ? 'text' : 'password'}
        label={modoAdmin ? 'Senha do administrador' : 'Senha da filial'}
        autoComplete="current-password"
        required
        icon={showPwd ? <Mail className="h-4 w-4 opacity-0" /> : <Lock className="h-4 w-4" />}
        rightSlot={
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            className="text-conecta-muted hover:text-conecta-primary px-1"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        }
      />

      <label className="flex items-start gap-3 text-sm text-conecta-muted cursor-pointer select-none">
        <input
          type="checkbox"
          name="lembrar"
          defaultChecked={false}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-conecta-accent focus:ring-conecta-accent/40 accent-[#E8621A]"
        />
        <span className="leading-snug">
          Lembrar acesso neste dispositivo
          <span className="block text-[11px] text-conecta-muted/80 mt-0.5">
            Se desmarcado, a senha será pedida novamente ao fechar o navegador.
          </span>
        </span>
      </label>

      {state?.erro && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{state.erro}</span>
        </div>
      )}

      <SubmitButton />

      <button
        type="button"
        onClick={() => setModoAdmin((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-2 text-xs text-conecta-muted hover:text-conecta-primary transition-colors"
      >
        <UserCog className="h-3.5 w-3.5" />
        {modoAdmin ? 'Sou usuário de filial' : 'Sou administrador'}
      </button>
    </form>
  );
}
