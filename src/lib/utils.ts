import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Strip phone to digits only */
export function stripPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Normaliza um telefone para o formato completo com DDI 55 e retorna
 * ambas as variantes brasileiras: com e sem o dígito 9 do celular.
 * Ex: "5542998224190" → ["5542998224190", "554298224190"]
 *     "554298224190"  → ["5542998224190", "554298224190"]
 */
export function getPhoneVariants(phone: string): string[] {
  const digits = stripPhone(phone);
  // Remove DDI 55 se presente, ficando com DDD + número (10 ou 11 dígitos)
  let base = digits;
  if (base.startsWith("55") && (base.length === 12 || base.length === 13)) {
    base = base.slice(2);
  }
  if (base.length < 10) return [`55${base}`]; // formato desconhecido
  const ddd = base.slice(0, 2);
  const num = base.slice(2);
  if (num.length === 9) {
    // Tem o 9: retorna as duas variantes
    return [`55${ddd}${num}`, `55${ddd}${num.slice(1)}`];
  }
  if (num.length === 8) {
    // Sem o 9: retorna as duas variantes
    return [`55${ddd}9${num}`, `55${ddd}${num}`];
  }
  return [`55${base}`];
}

/**
 * Normaliza telefone brasileiro:
 * - Remove caracteres não-numéricos
 * - Remove DDI duplicado (5555... com >13 dígitos → remove primeiro 55)
 * - Resultado: 55 + DD + 8-9 dígitos (12-13 dígitos total)
 */
export function cleanPhone(phone: string): string {
  let d = stripPhone(phone);

  // DDI duplicado: 5555 (BR), 351351 (PT), 4444 (UK)
  if (d.startsWith("5555") && d.length > 13) d = d.slice(2);
  if (d.startsWith("351351") && d.length > 14) d = d.slice(3);
  if (d.startsWith("4444") && d.length > 12) d = d.slice(2);

  // DDD duplicado sem DDI: 6161..., 2121..., etc.
  const ddd2 = d.slice(0, 2);
  const ddd4 = d.slice(2, 4);
  if (ddd2 === ddd4 && !d.startsWith("55") && !d.startsWith("351") && !d.startsWith("44") && d.length >= 12) {
    d = `55${d.slice(2)}`;
  }

  // BR sem DDI 55 (10-12 dígitos)
  if (!d.startsWith("55") && !d.startsWith("351") && !d.startsWith("44") && d.length >= 10 && d.length <= 12) {
    const possibleDdd = parseInt(d.slice(0, 2), 10);
    if (possibleDdd >= 11 && possibleDdd <= 99) d = `55${d}`;
  }

  if (d.startsWith("55") && d.length > 13) d = d.slice(2);

  return d;
}

/** Format digits-only phone for display: +55 11 98765-4321 */
export function formatPhone(phone: string): string {
  const digits = cleanPhone(phone);
  if (digits.length === 13) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 4)} ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  return digits;
}
