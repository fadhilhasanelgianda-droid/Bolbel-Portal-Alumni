export interface Mail {
  to: string;
  subject: string;
  text: string;
}

type Transport = (mail: Mail) => Promise<void>;

/** Resend over plain HTTPS (RESEND_API_KEY + MAIL_FROM). Without a key: log the mail in dev, fail in production. */
const defaultTransport: Transport = async (mail) => {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    if (process.env.NODE_ENV === 'production') throw new Error('RESEND_API_KEY is not set; cannot send email');
    console.log(`[mail:dev] to=${mail.to} subject=${mail.subject}\n${mail.text}`);
    return;
  }
  const from = process.env.MAIL_FROM;
  if (!from) throw new Error('MAIL_FROM is not set');
  // Bounded wait + a couple of retries for transient failures (429 / 5xx / network); other 4xx are permanent
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
        body: JSON.stringify({ from, to: mail.to, subject: mail.subject, text: mail.text }),
        signal: AbortSignal.timeout(10_000),
      });
      if (res.ok) return;
      lastError = new Error(`Email provider returned ${res.status}`);
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

let transport: Transport = defaultTransport;

/** Tests swap the transport to capture outgoing mail. */
export function setMailTransport(t: Transport | null): void {
  transport = t ?? defaultTransport;
}

export const sendMail = (mail: Mail) => transport(mail);

export function appUrl(): string {
  const url = process.env.APP_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3000');
  if (!url) throw new Error('Missing required env var APP_URL');
  return url.replace(/\/+$/, '');
}
