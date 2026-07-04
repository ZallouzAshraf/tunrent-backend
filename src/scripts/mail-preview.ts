import 'dotenv/config';
import * as fs from 'fs';
import * as handlebars from 'handlebars';
import * as nodemailer from 'nodemailer';
import { join } from 'path';
import {
  buildSmtpTransportOptions,
  resolveMailConfig,
} from '../config/mail.config';
import { registerMailTemplatePartials } from '../modules/mail/mail-templates.setup';

const SAMPLE_CONTEXT: Record<string, Record<string, unknown>> = {
  'verify-email': {
    firstName: 'Ashraf',
    verificationCode: '482916',
    expiresMinutes: 15,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    supportEmail: 'tunrentcontact@gmail.com',
    currentYear: new Date().getFullYear(),
  },
  'reset-password': {
    firstName: 'Ashraf',
    resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:3001'}/reset-password/demo-token`,
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3001',
    supportEmail: 'tunrentcontact@gmail.com',
    currentYear: new Date().getFullYear(),
  },
};

async function main(): Promise<void> {
  const templateName = process.argv[2] || 'verify-email';
  const config = resolveMailConfig();
  const templatesDir = join(__dirname, '..', 'modules', 'mail', 'templates');
  const templatePath = join(templatesDir, `${templateName}.hbs`);

  if (!fs.existsSync(templatePath)) {
    console.error(`Template introuvable : ${templateName}.hbs`);
    process.exit(1);
  }

  registerMailTemplatePartials(templatesDir);

  const source = fs.readFileSync(templatePath, 'utf8');
  const compile = handlebars.compile(source, { strict: true });
  const context = SAMPLE_CONTEXT[templateName];

  if (!context) {
    console.error(`Pas de contexte sample pour "${templateName}"`);
    process.exit(1);
  }

  const html = compile(context);
  const outPath = join(__dirname, '..', '..', 'mail-preview.html');
  fs.writeFileSync(outPath, html, 'utf8');
  console.log(`✓ Preview générée : ${outPath}`);

  if (!config.configured) {
    console.log('(SMTP non configuré — preview HTML seulement)');
    return;
  }

  const to = config.testRecipient || config.adminEmail;
  const transport = nodemailer.createTransport(buildSmtpTransportOptions(config));
  await transport.sendMail({
    from: config.from,
    to,
    subject: `[Preview] TunRent — ${templateName}`,
    html,
  });
  console.log(`✓ Email preview envoyé à ${to}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
