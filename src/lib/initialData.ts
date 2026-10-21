import { Product, UserProfile } from '../types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Pâine albă artizanală cu maia',
    code: 'PA-01',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 0,
    description: 'Pâine cu maia naturală, dospire lentă 24h, coajă crocantă și miez aerat (700g)',
    active: true,
  },
  {
    name: 'Pâine neagră cu secară și semințe',
    code: 'PN-02',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 0,
    description: 'Făină integrală de secară, semințe de floarea-soarelui, in și dovleac (650g)',
    active: true,
  },
  {
    name: 'Baghetă franțuzească tradițională',
    code: 'BG-03',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 0,
    description: 'Baghetă clasică pariziană, crocantă la exterior, miez pufos (300g)',
    active: true,
  },
  {
    name: 'Ciabatta artizanală cu măsline Kalamata',
    code: 'CB-04',
    unit: 'buc',
    category: 'Specialități',
    price: 0,
    description: 'Rețetă italiană autentică cu ulei de măsline extravirgin și măsline negre',
    active: true,
  },
  {
    name: 'Pâine de casă cu cartofi la kilogram',
    code: 'PK-05',
    unit: 'kg',
    category: 'Pâine la Kilogram',
    price: 0,
    description: 'Pâine densă, sățioasă, păstrează prospețimea zile întregi. Cântărită la livrare.',
    active: true,
  },
  {
    name: 'Cozonac moldovenesc tradițional cu nucă și cacao',
    code: 'CZ-06',
    unit: 'kg',
    category: 'Tradiționale & Sărbători',
    price: 0,
    description: 'Cozonac bogat în umplutură de nucă, stafide și rom veritabil. Cântărit la bucată sau feliat.',
    active: true,
  },
  {
    name: 'Plăcintă dobrogeană cu brânză de vaci și telemea',
    code: 'PL-07',
    unit: 'kg',
    category: 'Plăcinte & Patiserie Sărată',
    price: 0,
    description: 'Foi fine trase manual, umplutură generoasă de brânză și ou proaspăt.',
    active: true,
  },
  {
    name: 'Plăcintă de casă cu mere și scorțișoară',
    code: 'PL-08',
    unit: 'kg',
    category: 'Patiserie Dulce',
    price: 0,
    description: 'Mere rase călite cu scorțișoară Ceylon și zahăr brun.',
    active: true,
  },
  {
    name: 'Croissant franțuzesc cu unt 82%',
    code: 'CR-09',
    unit: 'buc',
    category: 'Viennoiserie',
    price: 0,
    description: 'Foietaj lamelar rumenit uniform, aromă intensă de unt de lapte.',
    active: true,
  },
  {
    name: 'Melc cu nucă și scorțișoară',
    code: 'ML-10',
    unit: 'buc',
    category: 'Patiserie Dulce',
    price: 0,
    description: 'Aluat pufos scăldat în sos de scorțișoară și bucățele crocante de nucă.',
    active: true,
  },
  {
    name: 'Chifle burger gourmet cu susan (set 4 buc)',
    code: 'CH-11',
    unit: 'buc',
    category: 'Chifle & Panificație',
    price: 0,
    description: 'Chifle tip brioche extrem de moi, unse cu ou și presărate cu susan auriu.',
    active: true,
  },
  {
    name: 'Cornuri pufoase cu magiun de prune Topoloveni',
    code: 'CN-12',
    unit: 'buc',
    category: 'Patiserie Dulce',
    price: 0,
    description: 'Cornulețe nostalgice ca la bunica, pudrate cu zahăr vanilat.',
    active: true,
  },
];

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

export const DEFAULT_CATEGORIES: string[] = [
  'Pâine Artizanală',
  'Pâine la Kilogram',
  'Specialități',
  'Patiserie Tradițională',
  'Cozonaci & Plăcinte',
  'Chifle & Panificație',
];

export const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'user-covali-admin',
    email: 'covali.andrei.box@gmail.com',
    displayName: 'Andrei Covali',
    role: 'admin',
    phone: '0744 555 888',
    createdAt: '2026-10-17T12:00:00.000Z',
  },
  {
    id: 'user-moscovei-client',
    email: 'moscovei@panpan.md',
    displayName: 'magazin bd.Moscovei',
    tradingPointName: 'Magazin bd. Moscovei',
    role: 'client',
    phone: '069 888 777',
    createdAt: '2026-10-17T19:30:00.000Z',
  },
  {
    id: 'user-prod-seftura',
    email: 'productie.brutarie@panpan.md',
    displayName: 'Mihai - Șef Tură Producție',
    role: 'production',
    phone: '0733 987 654',
    createdAt: '2026-10-17T18:00:00.000Z',
  },
  {
    id: 'user-botanica-client',
    email: 'magazin.centru@panpan.md',
    displayName: 'Elena Popescu',
    tradingPointName: 'Magazin Botanica',
    role: 'client',
    phone: '0722 123 456',
    createdAt: '2026-10-17T18:30:00.000Z',
  },
];
