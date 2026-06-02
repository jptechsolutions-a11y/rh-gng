import 'server-only';
import { hash, verify } from '@node-rs/argon2';

// algorithm: 2 = Argon2id (mantém compatível com isolatedModules sem importar o const enum)
const OPTIONS = {
  algorithm: 2,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;

export const hashPassword = (senha: string) => hash(senha, OPTIONS);
export const verifyPassword = (h: string, senha: string) =>
  verify(h, senha).catch(() => false);
