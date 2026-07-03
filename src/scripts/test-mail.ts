import 'dotenv/config';
import * as nodemailer from 'nodemailer';
import {
  buildSmtpTransportOptions,
  isMailConfigured,
} from '../config/mail.config';

async function main(): Promise<void> {
  const host = process.env.MAIL_HOST || 'sandbox.smtp.mailtrap.io';
  const port = parseInt(process.env.MAIL_PORT || '2525', 10);
  const user = (process.env.MAIL_USER || '').trim();
  const pass = (process.env.MAIL_PASS || '').trim();
  const from =
    process.env.MAIL_FROM || 'TunRent <noreply@tunrent.tn>';
  const to =
    (process.env.MAIL_TEST_TO || process.env.MAIL_ADMIN_EMAIL || '').trim() ||
    'test@example.com';

  console.log('--- TunRent SMTP test ---');
  console.log(`Host: ${host}:${port}`);
  console.log(`User: ${user ? `${user.slice(0, 4)}…` : '(vide)'}`);
  console.log(`To:   ${to}`);
  console.log('');

  if (!isMailConfigured(user, pass)) {
    console.error('❌ MAIL_USER / MAIL_PASS manquants.');
    console.error('');
    console.error('Mailtrap (le plus simple en dev) :');
    console.error('1. https://mailtrap.io → Sandboxes → Integration → SMTP');
    console.error('2. Copiez Username + Password dans .env');
    console.error('3. npm run mail:test');
    process.exit(1);
  }

  const transport = nodemailer.createTransport(
    buildSmtpTransportOptions({ host, port, user, pass }),
  );

  try {
    console.log('Vérification de la connexion SMTP…');
    await transport.verify();
    console.log('✓ Connexion SMTP OK');

    const info = await transport.sendMail({
      from,
      to,
      subject: 'TunRent — test SMTP',
      text: 'Configuration email TunRent OK.',
      html: '<p>Configuration email <strong>TunRent</strong> OK.</p>',
    });

    console.log(`✓ Email envoyé (messageId: ${info.messageId})`);
    console.log('');
    console.log('→ Ouvrez https://mailtrap.io/inboxes pour voir le message.');
  } catch (error) {
    console.error('❌ Échec SMTP');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
