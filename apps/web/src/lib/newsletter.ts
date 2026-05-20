export type NewsletterStatus = "subscribed" | "duplicate" | "invalid";

export type NewsletterResult = {
  status: NewsletterStatus;
  emails: string[];
};

export function subscribeEmail(
  emails: string[],
  rawEmail: string,
): NewsletterResult {
  const email = rawEmail.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "invalid", emails };
  }

  if (emails.map((item) => item.toLowerCase()).includes(email)) {
    return { status: "duplicate", emails };
  }

  return { status: "subscribed", emails: [...emails, email] };
}
