import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AgencyUserStatus, NotificationType } from '../../common/enums';
import { AgencyUser } from '../agency-users/entities/agency-user.entity';
import { Notification } from './entities/notification.entity';

export interface CreateNotificationDto {
  userId: string;
  agencyId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(AgencyUser)
    private readonly agencyUserRepo: Repository<AgencyUser>,
  ) {}

  async create(dto: CreateNotificationDto): Promise<Notification> {
    const notification = this.notificationRepo.create({
      userId: dto.userId,
      agencyId: dto.agencyId ?? null,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      data: dto.data ?? null,
    });

    return this.notificationRepo.save(notification);
  }

  async notifyAgencyMembers(
    agencyId: string,
    params: Omit<CreateNotificationDto, 'userId' | 'agencyId'>,
  ): Promise<void> {
    const members = await this.agencyUserRepo.find({
      where: { agencyId, status: AgencyUserStatus.ACTIVE },
    });

    await Promise.all(
      members.map((member) =>
        this.create({
          ...params,
          userId: member.userId,
          agencyId,
        }),
      ),
    );
  }

  async findByUser(
    userId: string,
    agencyId?: string,
  ): Promise<Notification[]> {
    const where: { userId: string; agencyId?: string } = { userId };

    if (agencyId) {
      where.agencyId = agencyId;
    }

    return this.notificationRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      return this.notificationRepo.save(notification);
    }

    return notification;
  }

  async markAllRead(userId: string, agencyId?: string): Promise<{ updated: number }> {
    const qb = this.notificationRepo
      .createQueryBuilder()
      .update(Notification)
      .set({ isRead: true, readAt: new Date() })
      .where('user_id = :userId', { userId })
      .andWhere('is_read = false');

    if (agencyId) {
      qb.andWhere('agency_id = :agencyId', { agencyId });
    }

    const result = await qb.execute();
    return { updated: result.affected ?? 0 };
  }
}
