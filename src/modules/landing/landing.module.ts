import { Module } from '@nestjs/common';
import { MailModule } from '../mail/mail.module';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

@Module({
  imports: [MailModule],
  controllers: [LandingController],
  providers: [LandingService],
})
export class LandingModule {}
