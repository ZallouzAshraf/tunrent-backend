import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import appConfig from '../../config/app.config';
import mailConfig, {
  buildSmtpTransportOptions,
} from '../../config/mail.config';
import { createBrevoApiTransport } from '../../config/brevo-api.transport';
import { registerMailTemplatePartials } from './mail-templates.setup';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(mailConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule.forFeature(mailConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const templatesDir = join(__dirname, 'templates');
        registerMailTemplatePartials(templatesDir);

        const useApi = configService.get<boolean>('mail.useApi') ?? false;
        const apiKey = configService.get<string>('mail.apiKey') ?? '';

        const transport = useApi
          ? createBrevoApiTransport(apiKey)
          : buildSmtpTransportOptions({
              host: configService.get<string>('mail.host')!,
              port: configService.get<number>('mail.port')!,
              user: configService.get<string>('mail.user')!,
              pass: configService.get<string>('mail.pass')!,
            });

        return {
          transport,
          defaults: {
            from: configService.get<string>('mail.from'),
          },
          template: {
            dir: templatesDir,
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
