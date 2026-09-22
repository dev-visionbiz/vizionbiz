import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { FichaCampoTipo } from '@/domain/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '-'
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatCNPJ(cnpj: string): string {
  return cnpj.replace(/\D/g, '').replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
}

export function formatCPF(cpf: string): string {
  return cpf.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function formatCEP(cep: string): string {
  return cep.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2')
}

export function formatPIS(pis: string): string {
  return pis.replace(/\D/g, '').replace(/(\d{3})(\d{5})(\d{2})(\d{1})/, '$1.$2.$3-$4')
}

export function formatTituloEleitor(titulo: string): string {
  return titulo.replace(/\D/g, '').replace(/(\d{4})(\d{4})(\d{4})/, '$1 $2 $3')
}

export function formatFichaCampoValor(valor: string, tipo: FichaCampoTipo): string {
  const raw = valor.trim()
  switch (tipo) {
    case 'cnpj':           return formatCNPJ(raw)
    case 'cpf':            return formatCPF(raw)
    case 'cep':            return formatCEP(raw)
    case 'pis':            return formatPIS(raw)
    case 'titulo_eleitor': return formatTituloEleitor(raw)
    default:               return raw
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.focus()
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}
