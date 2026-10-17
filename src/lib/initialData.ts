import { Product } from '../types';

export const INITIAL_PRODUCTS: Omit<Product, 'id'>[] = [
  {
    name: 'Pâine albă artizanală cu maia',
    code: 'PA-01',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 9.5,
    description: 'Pâine cu maia naturală, dospire lentă 24h, coajă crocantă și miez aerat (700g)',
    active: true,
  },
  {
    name: 'Pâine neagră cu secară și semințe',
    code: 'PN-02',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 11.0,
    description: 'Făină integrală de secară, semințe de floarea-soarelui, in și dovleac (650g)',
    active: true,
  },
  {
    name: 'Baghetă franțuzească tradițională',
    code: 'BG-03',
    unit: 'buc',
    category: 'Pâine Artizanală',
    price: 5.0,
    description: 'Baghetă clasică pariziană, crocantă la exterior, miez pufos (300g)',
    active: true,
  },
  {
    name: 'Ciabatta artizanală cu măsline Kalamata',
    code: 'CB-04',
    unit: 'buc',
    category: 'Specialități',
    price: 7.5,
    description: 'Rețetă italiană autentică cu ulei de măsline extravirgin și măsline negre',
    active: true,
  },
  {
    name: 'Pâine de casă cu cartofi la kilogram',
    code: 'PK-05',
    unit: 'kg',
    category: 'Pâine la Kilogram',
    price: 13.5,
    description: 'Pâine densă, sățioasă, păstrează prospețimea zile întregi. Cântărită la livrare.',
    active: true,
  },
  {
    name: 'Cozonac moldovenesc tradițional cu nucă și cacao',
    code: 'CZ-06',
    unit: 'kg',
    category: 'Tradiționale & Sărbători',
    price: 65.0,
    description: 'Cozonac bogat în umplutură de nucă, stafide și rom veritabil. Cântărit la bucată sau feliat.',
    active: true,
  },
  {
    name: 'Plăcintă dobrogeană cu brânză de vaci și telemea',
    code: 'PL-07',
    unit: 'kg',
    category: 'Plăcinte & Patiserie Sărată',
    price: 42.0,
    description: 'Foi fine trase manual, umplutură generoasă de brânză și ou proaspăt.',
    active: true,
  },
  {
    name: 'Plăcintă de casă cu mere și scorțișoară',
    code: 'PL-08',
    unit: 'kg',
    category: 'Patiserie Dulce',
    price: 38.0,
    description: 'Mere rase călite cu scorțișoară Ceylon și zahăr brun.',
    active: true,
  },
  {
    name: 'Croissant franțuzesc cu unt 82%',
    code: 'CR-09',
    unit: 'buc',
    category: 'Viennoiserie',
    price: 6.5,
    description: 'Foietaj lamelar rumenit uniform, aromă intensă de unt de lapte.',
    active: true,
  },
  {
    name: 'Melc cu nucă și scorțișoară',
    code: 'ML-10',
    unit: 'buc',
    category: 'Patiserie Dulce',
    price: 5.5,
    description: 'Aluat pufos scăldat în sos de scorțișoară și bucățele crocante de nucă.',
    active: true,
  },
  {
    name: 'Chifle burger gourmet cu susan (set 4 buc)',
    code: 'CH-11',
    unit: 'buc',
    category: 'Chifle & Panificație',
    price: 8.0,
    description: 'Chifle tip brioche extrem de moi, unse cu ou și presărate cu susan auriu.',
    active: true,
  },
  {
    name: 'Cornuri pufoase cu magiun de prune Topoloveni',
    code: 'CN-12',
    unit: 'buc',
    category: 'Patiserie Dulce',
    price: 4.5,
    description: 'Cornulețe nostalgice ca la bunica, pudrate cu zahăr vanilat.',
    active: true,
  },
];

// Helper to get formatted date string for today and tomorrow
export function getTodayString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getTomorrowString(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

export function formatDateRomanian(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const [year, month, day] = dateStr.split('-');
    const months = [
      'Ianuarie', 'Februarie', 'Martie', 'Aprilie', 'Mai', 'Iunie',
      'Iulie', 'August', 'Septembrie', 'Octombrie', 'Noiembrie', 'Decembrie'
    ];
    return `${day} ${months[parseInt(month, 10) - 1]} ${year}`;
  } catch {
    return dateStr;
  }
}
