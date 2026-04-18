import type { Product, User } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5080';

type ApiProduct = {
  id: string; title: string; priceCents: number; pages: number;
  age: string; theme: string; difficulty: string;
  color: string; accent: string; badge: string | null; description: string;
};

export async function fetchProducts(): Promise<Product[]> {
  try {
    const res = await fetch(`${API_URL}/api/products`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`status ${res.status}`);
    return (await res.json()) as ApiProduct[];
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`${API_URL}/api/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return FALLBACK_PRODUCTS.find(p => p.id === id) ?? null;
    return (await res.json()) as ApiProduct;
  } catch {
    return FALLBACK_PRODUCTS.find(p => p.id === id) ?? null;
  }
}

export function authHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = window.localStorage.getItem('jovie_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchMe(): Promise<User | null> {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem('jovie_token');
  if (!token) return null;
  try {
    const res = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return null;
    return (await res.json()) as User;
  } catch { return null; }
}

export async function createCheckoutSession(body: {
  email: string; name: string | null;
  items: { productId: string; quantity: number }[];
  promoCode: string | null;
}): Promise<{ checkoutUrl: string; orderId: string }> {
  const res = await fetch(`${API_URL}/api/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Checkout failed' }));
    throw new Error(err.error || 'Checkout failed');
  }
  return res.json();
}

export const apiUrl = API_URL;

export type SiteContentMap = Record<string, string>;

export async function fetchSiteContent(): Promise<SiteContentMap> {
  try {
    const res = await fetch(`${API_URL}/api/content`, { next: { revalidate: 60 } });
    if (!res.ok) return {};
    const items: { key: string; value: string }[] = await res.json();
    return Object.fromEntries(items.map(i => [i.key, i.value]));
  } catch { return {}; }
}

// Keeps the site functional when the API is unreachable (e.g. static preview).
// Data matches DbSeeder.cs exactly.
export const FALLBACK_PRODUCTS: Product[] = [
  { id: 'p01', title: 'Sleepy Safari',       priceCents: 800,  pages: 36, age: '3-5',  theme: 'Animals',   difficulty: 'Easy',   color: '#FFC94A', accent: '#FF6A4D', badge: 'Bestseller', description: 'Gentle jungle friends for littlest hands — big shapes, bold outlines.' },
  { id: 'p02', title: 'Ocean Giggles',       priceCents: 900,  pages: 42, age: '5-8',  theme: 'Ocean',     difficulty: 'Easy',   color: '#7EC8E3', accent: '#D94C8B', badge: 'New',        description: 'Dolphins, octopi & bubbly patterns. Splashy fun for early colourers.' },
  { id: 'p03', title: 'Dino Doodle Dash',    priceCents: 1000, pages: 48, age: '5-8',  theme: 'Dinosaurs', difficulty: 'Medium', color: '#9DD4A9', accent: '#231F1A', badge: null,         description: 'T-Rex, triceratops and puzzle mazes stomping across 48 pages.' },
  { id: 'p04', title: 'Fairy Tea Party',     priceCents: 900,  pages: 40, age: '3-5',  theme: 'Fantasy',   difficulty: 'Easy',   color: '#D94C8B', accent: '#FFC94A', badge: null,         description: 'Tiny teapots, toadstools and winged things having a lovely afternoon.' },
  { id: 'p05', title: 'Space Cadet Club',    priceCents: 1100, pages: 52, age: '8-12', theme: 'Space',     difficulty: 'Hard',   color: '#C9A9E0', accent: '#7EC8E3', badge: 'Bestseller', description: 'Rocketships, planets and astronaut cats. For patient rocket scientists.' },
  { id: 'p06', title: 'Farmyard Friends',    priceCents: 800,  pages: 36, age: '3-5',  theme: 'Animals',   difficulty: 'Easy',   color: '#FFC94A', accent: '#9DD4A9', badge: null,         description: 'A cow, a duck, a happy pig. Classic barnyard for calm afternoons.' },
  { id: 'p07', title: 'Robot Repair Shop',   priceCents: 1000, pages: 44, age: '5-8',  theme: 'Robots',    difficulty: 'Medium', color: '#7EC8E3', accent: '#231F1A', badge: null,         description: 'Bolts, gears and googly-eyed bots. For builders and tinkerers.' },
  { id: 'p08', title: 'Garden of Goodnight', priceCents: 900,  pages: 38, age: '5-8',  theme: 'Nature',    difficulty: 'Medium', color: '#9DD4A9', accent: '#D94C8B', badge: null,         description: 'Bedtime flowers, owls and moons for calming wind-down time.' },
  { id: 'p09', title: 'Cupcake Kingdom',     priceCents: 800,  pages: 36, age: '3-5',  theme: 'Food',      difficulty: 'Easy',   color: '#D94C8B', accent: '#FFC94A', badge: null,         description: 'Sprinkle castles, donut moats, and a king-sized éclair on his throne.' },
  { id: 'p10', title: 'Mermaid Mystery',     priceCents: 1100, pages: 50, age: '8-12', theme: 'Ocean',     difficulty: 'Hard',   color: '#7EC8E3', accent: '#C9A9E0', badge: 'New',        description: 'Intricate scales, coral cathedrals, and hidden pearls to find.' },
  { id: 'p11', title: 'Construction Crew',   priceCents: 900,  pages: 40, age: '3-5',  theme: 'Vehicles',  difficulty: 'Easy',   color: '#FFC94A', accent: '#231F1A', badge: null,         description: 'Diggers, dumpers and cranes. For kids who point at trucks.' },
  { id: 'p12', title: 'Unicorn Daydream',    priceCents: 1000, pages: 46, age: '5-8',  theme: 'Fantasy',   difficulty: 'Medium', color: '#C9A9E0', accent: '#FFC94A', badge: null,         description: 'Rainbows, stars and one very fluffy unicorn. Enough said.' },
];

export const AGES = ['All ages', '3-5', '5-8', '8-12'];
export const THEMES = ['All themes', 'Animals', 'Ocean', 'Fantasy', 'Space', 'Dinosaurs', 'Robots', 'Nature', 'Food', 'Vehicles'];
export const DIFFICULTIES = ['Any', 'Easy', 'Medium', 'Hard'];

export const dollars = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
