import { Product, UserProfile } from '../types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [];

export const MOLDOVA_TIMEZONE = 'Europe/Chisinau';

/**
 * Returns year, month, day in Moldova timezone ('Europe/Chisinau')
 */
export function getMoldovaDateParts(date: Date = new Date()): { year: string; month: string; day: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: MOLDOVA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  // 'en-CA' outputs 'YYYY-MM-DD'
  const formatted = formatter.format(date);
  const [year, month, day] = formatted.split('-');
  return { year, month, day };
}

// Helper to get formatted date string for yesterday, today and tomorrow in Moldova timezone
export function getYesterdayString(): string {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const { year, month, day } = getMoldovaDateParts(yesterday);
  return `${year}-${month}-${day}`;
}

export function getTodayString(): string {
  const { year, month, day } = getMoldovaDateParts();
  return `${year}-${month}-${day}`;
}

export function getTomorrowString(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const { year, month, day } = getMoldovaDateParts(tomorrow);
  return `${year}-${month}-${day}`;
}

export function formatMoldovaDateTime(dateInput?: string | Date | number): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return String(dateInput);
  return new Intl.DateTimeFormat('ro-MD', {
    timeZone: MOLDOVA_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatMoldovaTime(dateInput?: string | Date | number): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('ro-MD', {
    timeZone: MOLDOVA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDateDDMMYYYY(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const raw = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = raw.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      if (year.length === 4) {
        return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
      }
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatDateRomanian(dateStr: string): string {
  return formatDateDDMMYYYY(dateStr);
}

export const DEFAULT_CATEGORIES: string[] = [];

export const DEFAULT_USERS: UserProfile[] = [];
