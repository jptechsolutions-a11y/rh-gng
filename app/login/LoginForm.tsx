'use client';

import { useActionState, useState } from 'react';
import { useFormStatus } from 'react-dom';
import { Eye, EyeOff, LogIn, AlertCircle, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction, type LoginState } from '@/actions/auth';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" size="lg" disabled={pending}>
      <LogIn className="h-4 w-4" />
      {pending ? 'Entrando...' : 'Entrar'}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState<LoginState, FormData>(loginAction, undefined);
  const [modoAdmin, setModoAdmin] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  return (
    <form action={formAction} className="space-y-5">
      {modoAdmin && (
        <div className="space-y-2">
          <Label htmlFor="usuario">Usuário</Label>
          <Input id="usuario" name="usuario" autoComplete="username" required placeholder="admin" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="senha">Senha</Label>
        <div className="relative">
          <Input
            id="senha"
            name="senha"
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPwd((v) => !v)}
            aria-label={showPwd ? 'Ocultar senha' : 'Mostrar senha'}
            className="absolute inset-y-0 right-0 px-3 text-perlog-slate hover:text-perlog-navy"
          >
            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {state?.erro && (
        <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{state.erro}</span>
        </div>
      )}

      <SubmitButton />

      <button
        type="button"
        onClick={() => setModoAdmin((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-2 text-xs text-perlog-slate hover:text-perlog-navy"
      >
        <UserCog className="h-3.5 w-3.5" />
        {modoAdmin ? 'Sou usuário de filial' : 'Sou administrador'}
      </button>
    </form>
  );
}
