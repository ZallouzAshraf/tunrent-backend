import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from '../mail/mail.service';
import { resolveAdminRecipient } from '../../config/mail.config';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class LandingService {
  private readonly logger = new Logger(LandingService.name);

  constructor(
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async submitContact(dto: ContactDto): Promise<{ message: string }> {
    const recipient = resolveAdminRecipient(
      this.configService.get<string>('mail.adminEmail'),
      this.configService.get<string>('mail.from'),
    );

    const sent = await this.mailService.sendContactMessage(recipient, {
      name: dto.name.trim(),
      email: dto.email.toLowerCase().trim(),
      subject: dto.subject.trim(),
      message: dto.message.trim(),
    });

    if (!sent) {
      this.logger.warn(`Contact form from ${dto.email} — mail not sent`);
      throw new ServiceUnavailableException(
        'Unable to send message at this time. Please try again later or email us directly.',
      );
    }

    return { message: 'Message sent successfully' };
  }
}
