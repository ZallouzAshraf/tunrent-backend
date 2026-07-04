import 'dotenv/config';
import * as nodemailer from 'nodemailer';
import {
  buildSmtpTransportOptions,
  getMailProviderLabel,
  resolveMailConfig,
} from '../config/mail.config';

const EMAIL_TYPES = [
  'Inscription — code de vérification',
  'Mot de passe oublié — lien reset',
  'Bienvenue après vérification',
  'Nouvelle réservation → agence',
  'Réservation confirmée / refusée / annulée',
  'Location terminée + demande d\'avis',
  'Invitation équipe agence',
  'Agence en attente / approuvée',
  'Formulaire contact',
];

async function main(): Promise<void> {
  const config = resolveMailConfig();
  const to = config.testRecipient || 'test@example.com';

  console.log('═══════════════════════════════════════');
  console.log('  TunRent — test email (gratuit)');
  console.log('═══════════════════════════════════════');
  console.log(`Provider : ${config.provider} — ${getMailProviderLabel(config.provider)}`);
  console.log(`Host     : ${config.host}:${config.port}`);
  console.log(`User     : ${config.user ? `${config.user.slice(0, 4)}…` : '(vide)'}`);
  console.log(`From     : ${config.from}`);
  console.log(`To       : ${to}`);
  console.log('');
  console.log('Emails gérés automatiquement :');
  EMAIL_TYPES.forEach((line) => console.log(`  • ${line}`));
  console.log('');

  if (!config.configured) {
    console.error('❌ Configuration incomplète.');
    console.error('');
    printBrevoSetup();
    process.exit(1);
  }

  const transport = nodemailer.createTransport(
    buildSmtpTransportOptions(config),
  );

  try {
    console.log('Connexion SMTP…');
    await transport.verify();
    console.log('✓ Connexion OK');

    const info = await transport.sendMail({
      from: config.from,
      to,
      subject: `TunRent — test ${config.provider} OK`,
      text: [
        `Provider: ${config.provider}`,
        'Configuration email TunRent validée.',
        '',
        'Testez maintenant : inscription, mot de passe oublié, réservation.',
      ].join('\n'),
      html: `<p>Configuration <strong>TunRent</strong> OK via <strong>${config.provider}</strong>.</p>`,
    });

    console.log(`✓ Email envoyé (messageId: ${info.messageId})`);
    console.log('');

    if (config.provider === 'mailtrap') {
      console.log('→ Sandbox : https://mailtrap.io/inboxes');
    } else {
      console.log(`→ Vérifiez la boîte : ${to}`);
      console.log('  (regardez aussi les spams les premières fois)');
    }
  } catch (error) {
    console.error('❌ Échec envoi');
    console.error(error instanceof Error ? error.message : error);
    console.error('');
    if (config.provider === 'brevo') {
      printBrevoTroubleshooting();
    }
    process.exit(1);
  }
}

function printBrevoSetup(): void {
  console.error('── Brevo (gratuit, dev + prod, 300 emails/jour) ──');
  console.error('');
  console.error('1. Créez un compte : https://www.brevo.com');
  console.error('2. Vérifiez votre email expéditeur :');
  console.error('   Paramètres → Expéditeurs → Ajouter une adresse email');
  console.error('3. Générez une clé SMTP :');
  console.error('   SMTP & API → Clés SMTP → Générer');
    console.error('4. Dans tunrent-backend/.env :');
    console.error('');
    console.error('   MAIL_PROVIDER=brevo');
    console.error('   MAIL_SMTP_LOGIN=login-copie-depuis-brevo-smtp');
    console.error('   MAIL_USER=tunrentcontact@gmail.com');
    console.error('   MAIL_PASS=xsmtpsib-votre-cle-smtp');
  console.error('   MAIL_ADMIN_EMAIL=votre-email@gmail.com');
  console.error('   MAIL_TEST_TO=votre-email@gmail.com');
  console.error('');
  console.error('5. npm run mail:test');
  console.error('');
  console.error('── Alternative sandbox (pas de vrai email) ──');
  console.error('   MAIL_PROVIDER=mailtrap + identifiants Mailtrap');
}

function printBrevoTroubleshooting(): void {
  console.error('Dépannage Brevo :');
  console.error('• MAIL_SMTP_LOGIN = identifiant SMTP (onglet SMTP, souvent xxx@smtp-brevo.com)');
  console.error('• MAIL_USER = email expéditeur vérifié (Expéditeurs)');
  console.error('• MAIL_PASS = clé xsmtpsib-… (onglet Clés SMTP, pas clé API xkeysib)');
  console.error('• Plan gratuit : max 300 emails/jour');
}

main();
