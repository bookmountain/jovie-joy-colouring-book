export type Product = {
  id: string;
  title: string;
  priceCents: number;
  pages: number;
  age: string;
  theme: string;
  difficulty: string;
  color: string;
  accent: string;
  badge: string | null;
  description: string;
};

export type CartItem = Product & { qty: number };

export type User = {
  id: string;
  email: string;
  name: string | null;
  avatarUrl: string | null;
};
