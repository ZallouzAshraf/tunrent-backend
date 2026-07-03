import { registerAs } from '@nestjs/config';

const PLACEHOLDER_MARKERS = ['your-user', 'your-pass', 'changeme'];

export interface SmtpTransportConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

function resolveMailUser(): string {
  return (process.env.MAIL_USER || '').trim();
}

function resolveMailPass(): string {
  return (process.env.MAIL_PASS || '').trim();
}

export function isMailConfigured(user?: string, pass?: string): boolean {
  const resolvedUser = user ?? resolveMailUser();
  const resolvedPass = pass ?? resolveMailPass();

  if (!resolvedUser || !resolvedPass) {
    return false;
  }

  const lowerUser = resolvedUser.toLowerCase();
  const lowerPass = resolvedPass.toLowerCase();

  return !PLACEHOLDER_MARKERS.some(
    (marker) => lowerUser === marker || lowerPass === marker,
  );
}

/** Shared SMTP options for Nest MailerModule and standalone scripts. */
export function buildSmtpTransportOptions(config: SmtpTransportConfig) {
  const { host, port, user, pass } = config;

  return {
    host,
    port,
    // Brevo : 587/2525 = STARTTLS (secure false), 465 = SSL
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
  };
}

export default registerAs('mail', () => {
  const host = process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io';
  const port = parseInt(process.env.MAIL_PORT || '2525', 10);
  const user = resolveMailUser();
  const pass = resolveMailPass();

  return {
    enabled: process.env.MAIL_ENABLED !== 'false',
    configured: isMailConfigured(user, pass),
    host,
    port,
    user,
    pass,
    from:
      process.env.MAIL_FROM || 'TunRent <noreply@tunrent.tn>',
    adminEmail: (process.env.MAIL_ADMIN_EMAIL || '').trim(),
    testRecipient: (
      process.env.MAIL_TEST_TO ||
      process.env.MAIL_ADMIN_EMAIL ||
      ''
    ).trim(),
  };
});
