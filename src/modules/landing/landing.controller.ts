import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../../common/decorators/roles.decorator';
import { ContactDto } from './dto/contact.dto';
import { LandingService } from './landing.service';

@Controller('public')
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('contact')
  @HttpCode(HttpStatus.OK)
  submitContact(@Body() dto: ContactDto) {
    return this.landingService.submitContact(dto);
  }
}
