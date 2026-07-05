export interface BrevoAddress {
  email: string;
  name?: string;
}

type NodemailerAddressInput =
  | string
  | { name?: string; address: string }
  | { name?: string; email: string };

function parseAddress(input: NodemailerAddressInput): BrevoAddress {
  if (typeof input === 'object' && input !== null) {
    const email =
      'address' in input && input.address
        ? input.address.trim()
        : 'email' in input && input.email
          ? input.email.trim()
          : '';

    if (!email) {
      throw new Error('Invalid email address object');
    }

    const result: BrevoAddress = { email };
    if (input.name?.trim()) {
      result.name = input.name.trim();
    }
    return result;
  }

  const str = String(input).trim();
  const match = str.match(/^(.+?)\s*<([^>]+)>$/);

  if (match) {
    const name = match[1].trim().replace(/^["']|["']$/g, '');
    const email = match[2].trim();
    return name ? { email, name } : { email };
  }

  return { email: str };
}

function parseAddressList(input: unknown): BrevoAddress[] {
  if (!input) {
    return [];
  }

  const items = Array.isArray(input) ? input : [input];
  return items.map((item) => parseAddress(item as NodemailerAddressInput));
}

export function createBrevoApiTransport(apiKey: string) {
  return {
    name: 'brevo-api',
    version: '1.0.0',
    send(
      mail: { data: Record<string, unknown> },
      callback: (
        err: Error | null,
        info?: {
          messageId?: string;
          envelope?: { from?: string; to?: string[] };
        },
      ) => void,
    ): void {
      void (async () => {
        try {
          const data = mail.data;
          const to = parseAddressList(data.to);
          const from = parseAddress(data.from as NodemailerAddressInput);
          const subject = String(data.subject ?? '');
          const html = String(data.html ?? data.htmlContent ?? '');

          if (to.length === 0) {
            throw new Error('Brevo API transport: missing recipient (to)');
          }

          if (!subject) {
            throw new Error('Brevo API transport: missing subject');
          }

          const body: Record<string, unknown> = {
            sender: from,
            to,
            subject,
            htmlContent: html,
          };

          if (data.replyTo) {
            body.replyTo = parseAddress(data.replyTo as NodemailerAddressInput);
          }

          const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
              'api-key': apiKey,
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: JSON.stringify(body),
          });

          const responseText = await response.text();
          let parsed: {
            messageId?: string;
            message?: string;
            code?: string;
          } = {};

          if (responseText) {
            try {
              parsed = JSON.parse(responseText) as typeof parsed;
            } catch {
              parsed = {};
            }
          }

          if (!response.ok) {
            const detail =
              parsed.message || responseText || `HTTP ${response.status}`;
            throw new Error(
              `Brevo API error (${response.status}): ${detail}`,
            );
          }

          callback(null, {
            messageId: parsed.messageId ?? 'brevo-api',
            envelope: {
              from: from.email,
              to: to.map((recipient) => recipient.email),
            },
          });
        } catch (error) {
          callback(
            error instanceof Error ? error : new Error(String(error)),
          );
        }
      })();
    },
  };
}
