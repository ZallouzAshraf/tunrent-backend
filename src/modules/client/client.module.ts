import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ReviewsModule } from '../reviews/reviews.module';
import { User } from '../users/entities/user.entity';
import { ClientController } from './client.controller';
import { ClientService } from './client.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    AuthModule,
    NotificationsModule,
    ReviewsModule,
  ],
  controllers: [ClientController],
  providers: [ClientService],
})
export class ClientModule {}
