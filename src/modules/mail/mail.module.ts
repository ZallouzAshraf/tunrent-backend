import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import appConfig from '../../config/app.config';
import mailConfig, { buildSmtpTransportOptions } from '../../config/mail.config';
import { MailService } from './mail.service';

@Module({
  imports: [
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(mailConfig),
    MailerModule.forRootAsync({
      imports: [ConfigModule.forFeature(mailConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const host = configService.get<string>('mail.host')!;
        const port = configService.get<number>('mail.port')!;
        const user = configService.get<string>('mail.user')!;
        const pass = configService.get<string>('mail.pass')!;

        return {
          transport: buildSmtpTransportOptions({ host, port, user, pass }),
          defaults: {
            from: configService.get<string>('mail.from'),
          },
          template: {
            dir: join(__dirname, 'templates'),
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
