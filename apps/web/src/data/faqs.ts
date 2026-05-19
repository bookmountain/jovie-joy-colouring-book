import { apiGetFaqs, type Faq } from "@/lib/api";
export type { Faq };

export async function getFaqs(): Promise<Faq[]> {
  return apiGetFaqs();
}
