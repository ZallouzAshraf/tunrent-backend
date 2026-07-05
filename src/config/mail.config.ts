import { registerAs } from '@nestjs/config';

const PLACEHOLDER_MARKERS = ['your-user', 'your-pass', 'changeme'];

export type MailProvider = 'brevo' | 'mailtrap' | 'gmail' | 'smtp';

export interface SmtpTransportConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

export interface ResolvedMailConfig extends SmtpTransportConfig {
  provider: MailProvider;
  enabled: boolean;
  configured: boolean;
  useApi: boolean;
  apiKey: string;
  from: string;
  adminEmail: string;
  testRecipient: string;
}

const PROVIDER_PRESETS: Record<
  MailProvider,
  { host: string; port: number; label: string }
> = {
  brevo: {
    host: 'smtp-relay.brevo.com',
    port: 587,
    label: 'Brevo (gratuit, dev + prod, 300 emails/jour)',
  },
  mailtrap: {
    host: 'sandbox.smtp.mailtrap.io',
    port: 2525,
    label: 'Mailtrap (sandbox, emails fictifs)',
  },
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    label: 'Gmail (mot de passe application)',
  },
  smtp: {
    host: '',
    port: 587,
    label: 'SMTP personnalisé (MAIL_HOST requis)',
  },
};

function resolveMailUser(): string {
  return (process.env.MAIL_SMTP_LOGIN || process.env.MAIL_USER || '').trim();
}

function resolveMailPass(): string {
  return (process.env.MAIL_PASS || '').trim();
}

export function resolveMailProvider(): MailProvider {
  const raw = (process.env.MAIL_PROVIDER || '').toLowerCase();

  if (
    raw === 'brevo' ||
    raw === 'mailtrap' ||
    raw === 'gmail' ||
    raw === 'smtp'
  ) {
    return raw;
  }

  // Rétrocompat .env sans MAIL_PROVIDER
  const legacyHost = (process.env.MAIL_HOST || '').toLowerCase();
  if (legacyHost.includes('mailtrap')) {
    return 'mailtrap';
  }
  if (legacyHost.includes('gmail')) {
    return 'gmail';
  }

  return 'brevo';
}

export function getMailProviderLabel(provider: MailProvider): string {
  return PROVIDER_PRESETS[provider].label;
}

export function parseMailAddress(value: string): string {
  const trimmed = value.trim();
  const match = trimmed.match(/<([^>]+)>/);
  return (match?.[1] ?? trimmed).trim();
}

export function resolveAdminRecipient(
  adminEmail?: string,
  fromAddress?: string,
  fallback = 'contact@tunrent.tn',
): string {
  if (adminEmail?.trim()) {
    return parseMailAddress(adminEmail);
  }

  if (fromAddress?.trim()) {
    return parseMailAddress(fromAddress);
  }

  return fallback;
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

function resolveFromAddress(user: string): string {
  const explicit = (process.env.MAIL_FROM || '').trim();
  if (explicit) {
    return explicit;
  }

  const senderEmail = (process.env.MAIL_USER || '').trim();
  if (senderEmail.includes('@') && !senderEmail.includes('@smtp-brevo.com')) {
    return `TunRent <${senderEmail}>`;
  }

  if (user.includes('@') && !user.includes('@smtp-brevo.com')) {
    return `TunRent <${user}>`;
  }

  return 'TunRent <noreply@tunrent.tn>';
}

function resolveMailApiKey(): string {
  return (process.env.MAIL_API_KEY || '').trim();
}

export function resolveUseApi(apiKey?: string): boolean {
  const key = (apiKey ?? resolveMailApiKey()).trim();
  const transport = (process.env.MAIL_TRANSPORT || '').toLowerCase();

  if (transport === 'api') {
    return Boolean(key);
  }

  if (transport === 'smtp') {
    return false;
  }

  return Boolean(key) && process.env.NODE_ENV === 'production';
}

/** Single source of truth for SMTP settings (dev + prod). */
export function resolveMailConfig(): ResolvedMailConfig {
  const provider = resolveMailProvider();
  const preset = PROVIDER_PRESETS[provider];
  const user = resolveMailUser();
  const pass = resolveMailPass();
  const apiKey = resolveMailApiKey();
  const useApi = resolveUseApi(apiKey);

  const explicitHost = (process.env.MAIL_HOST || '').trim();
  const explicitPort = process.env.MAIL_PORT
    ? parseInt(process.env.MAIL_PORT, 10)
    : undefined;

  const host = provider === 'smtp' ? explicitHost : preset.host;
  const port =
    explicitPort ??
    (provider === 'brevo' && process.env.NODE_ENV === 'production'
      ? 465
      : preset.port);

  const from = resolveFromAddress(user);
  const adminEmail = (process.env.MAIL_ADMIN_EMAIL || '').trim();
  const testRecipient = (
    process.env.MAIL_TEST_TO ||
    process.env.MAIL_ADMIN_EMAIL ||
    user ||
    ''
  ).trim();

  const hostOk =
    provider !== 'smtp' || Boolean((process.env.MAIL_HOST || '').trim());

  const smtpConfigured = isMailConfigured(user, pass) && hostOk;
  const apiConfigured = Boolean(apiKey);

  return {
    provider,
    enabled: process.env.MAIL_ENABLED !== 'false',
    configured: useApi ? apiConfigured : smtpConfigured,
    useApi,
    apiKey,
    host,
    port,
    user,
    pass,
    from,
    adminEmail,
    testRecipient,
  };
}

/** Shared SMTP options for Nest MailerModule and standalone scripts. */
export function buildSmtpTransportOptions(config: SmtpTransportConfig) {
  const { host, port, user, pass } = config;
  const isProd = process.env.NODE_ENV === 'production';
  const timeoutMs = isProd ? 30_000 : 12_000;

  return {
    host,
    port,
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    requireTLS: port === 587,
    pool: false,
    tls: {
      minVersion: 'TLSv1.2' as const,
      servername: host,
    },
  };
}

export async function verifySmtpConnection(
  config: SmtpTransportConfig,
): Promise<void> {
  const nodemailer = await import('nodemailer');
  const isProd = process.env.NODE_ENV === 'production';
  const attempts = isProd ? 3 : 1;
  const timeoutMs = isProd ? 30_000 : 12_000;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const transport = nodemailer.createTransport(
      buildSmtpTransportOptions(config),
    );

    try {
      await Promise.race([
        transport.verify(),
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error(`SMTP verify timeout (${timeoutMs}ms)`)),
            timeoutMs,
          ),
        ),
      ]);
      transport.close();
      return;
    } catch (error) {
      lastError = error;
      transport.close();
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
      }
    }
  }

  throw lastError;
}

export default registerAs('mail', () => resolveMailConfig());
