import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard, Users, FileText, Settings, ShieldCheck, ClipboardList, History,
  CalendarClock, Plus, BarChart3, UserCog, Target, BookOpen, Printer, ClipboardCheck,
  GalleryHorizontal, Cloud, Clock, AlertTriangle, Trophy, GraduationCap, CalendarOff,
  Network, Upload, IdCard, ListTree,
} from 'lucide-react';

// Fonte ÚNICA de navegação — consumida pela Sidebar (desktop) e pela MobileNav.
// Antes a MobileNav tinha listas próprias e desatualizadas (faltavam Histórico,
// Agenda etc. no mobile).
export type NavItem = { href: string; label: string; icon: LucideIcon };

export const FILIAL_NAV: NavItem[] = [
  { href: '/painel',          label: 'Painel',            icon: LayoutDashboard },
  { href: '/guia-rapido',     label: 'Guia Rápido',       icon: BookOpen },
  { href: '/entrevista/nova', label: 'Nova entrevista',   icon: ClipboardList },
  { href: '/historico',       label: 'Histórico',         icon: History },
  { href: '/agenda',          label: 'Agenda',            icon: CalendarClock },
  { href: '/banco-talentos',  label: 'Banco de talentos', icon: Users },
];

export const ADMIN_NAV: NavItem[] = [
  { href: '/admin',            label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/busca',      label: 'Busca global', icon: Users },
  { href: '/admin/relatorios', label: 'Relatórios',   icon: FileText },
  { href: '/admin/config',     label: 'Configuração', icon: Settings },
  { href: '/admin/seguranca',  label: 'Segurança',    icon: ShieldCheck },
];

// Nav para usuários "visualizadores" (regional/nacional): só leitura, acesso a
// indicadores cobrindo as filiais permitidas. Sem rotas de admin nem de filial.
export const VISUALIZADOR_NAV: NavItem[] = [
  { href: '/inicio',                          label: 'Início',      icon: LayoutDashboard },
  { href: '/indicadores?tab=inicio',          label: 'Indicadores', icon: BarChart3 },
];

// Sidebar contextual quando o visualizador navega dentro do módulo Entrevistas
// (/historico, /entrevista/[id], /candidato/[cpf]). Evita oferecer "Indicadores"
// no menu lateral — que apontaria para o módulo errado.
export const ENTREVISTAS_VISUALIZADOR_NAV: NavItem[] = [
  { href: '/inicio',    label: 'Início',    icon: LayoutDashboard },
  { href: '/historico', label: 'Histórico', icon: History },
];

export const AVALIACAO_NAV_BASE: NavItem[] = [
  { href: '/avaliacao',            label: 'Visão geral',    icon: LayoutDashboard },
  { href: '/avaliacao/nova',       label: 'Nova avaliação', icon: Plus },
  { href: '/avaliacao/historico',  label: 'Histórico',      icon: History },
  { href: '/avaliacao/relatorios', label: 'Relatórios',     icon: BarChart3 },
];
export const AVALIACAO_NAV_ADMIN_EXTRAS: NavItem[] = [
  { href: '/admin/config/pessoas',      label: 'Pessoas',                icon: UserCog },
  { href: '/admin/config/competencias', label: 'Competências e fatores', icon: Target },
];

export const INDICADORES_NAV_BASE: NavItem[] = [
  { href: '/indicadores?tab=inicio',          label: 'Início',          icon: Trophy },
  { href: '/indicadores?tab=banco-horas',     label: 'Banco de Horas',  icon: Clock },
  { href: '/indicadores?tab=inconsistencias', label: 'Inconsistências', icon: AlertTriangle },
  { href: '/indicadores?tab=cursos',          label: 'Cursos Obrigatórios', icon: GraduationCap },
  { href: '/indicadores?tab=feriados',        label: 'Feriados Pendentes',  icon: CalendarOff },
];

export const ESCUTA_NAV_BASE: NavItem[] = [
  { href: '/escuta?tab=roteiro',    label: 'Roteiro',    icon: BookOpen },
  { href: '/escuta?tab=formulario', label: 'Formulário', icon: Printer },
  { href: '/escuta?tab=percepcao',  label: 'Percepção',  icon: ClipboardCheck },
  { href: '/escuta?tab=reunioes',   label: 'Reuniões',   icon: GalleryHorizontal },
  { href: '/escuta?tab=nuvem',      label: 'Nuvem',      icon: Cloud },
  { href: '/escuta/historico',      label: 'Histórico',  icon: History },
];
export const ESCUTA_NAV_ADMIN_EXTRAS: NavItem[] = [
  { href: '/admin/config/escuta', label: 'Configuração', icon: Settings },
];

export const QLP_NAV_BASE: NavItem[] = [
  { href: '/qlp',             label: 'Visão geral', icon: LayoutDashboard },
  { href: '/qlp/quadro',      label: 'Quadro',      icon: Users },
  { href: '/qlp/organograma', label: 'Organograma', icon: Network },
  { href: '/qlp/historico',   label: 'Histórico',   icon: History },
  { href: '/qlp/indicadores', label: 'Indicadores', icon: BarChart3 },
];
export const QLP_NAV_ADMIN_EXTRAS: NavItem[] = [
  { href: '/qlp/lideres',  label: 'Líderes',      icon: ListTree },
  { href: '/qlp/cargos',   label: 'Cargos',       icon: IdCard },
  { href: '/qlp/importar', label: 'Importar XLS', icon: Upload },
];
