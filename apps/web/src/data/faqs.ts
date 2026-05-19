export type Faq = {
  question: string;
  answer: string;
  links?: Array<{ label: string; href: string }>;
};

export const faqs: Faq[] = [
  {
    question: "Where can I buy Zoe&Book physical coloring books?",
    answer:
      "Amazon: Available on Amazon in the US, UK, Canada, Australia, Germany, France, Italy, and more. Availability depends on the official marketplace in your country. Partner bookstores may also carry selected cozy titles.",
    links: [
      { label: "Amazon", href: "https://www.amazon.com/" },
      { label: "Penguin Random House", href: "https://www.penguinrandomhouse.com/" },
    ],
  },
  {
    question: "Where can I buy Zoe&Book digital coloring pages?",
    answer:
      "You can find digital coloring pages as instant downloads through the Etsy-style marketplace link. Choose a favorite, download instantly, and print on your preferred paper or color digitally.",
    links: [{ label: "Etsy", href: "https://www.etsy.com/" }],
  },
  {
    question: "Where can I share my finished coloring pages?",
    answer:
      "We would love to see finished pages on Instagram, TikTok, and the coloring community. Tag your posts with Zoe&Book-friendly hashtags when you share.",
  },
  {
    question: "Need support?",
    answer:
      "Use hello@zoeandbook.com for customer care or studio@zoeandbook.com for licensing inquiries.",
  },
];
