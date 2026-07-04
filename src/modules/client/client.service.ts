import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ClientService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
  ): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    if (dto.firstName !== undefined) user.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) user.lastName = dto.lastName.trim();
    if (dto.phone !== undefined) {
      user.phone = dto.phone.trim() || null;
    }
    if (dto.cin !== undefined) {
      user.cin = dto.cin.trim() || null;
    }
    if (dto.drivingLicenseNumber !== undefined) {
      user.drivingLicenseNumber = dto.drivingLicenseNumber.trim() || null;
    }
    if (dto.cinPhotoUrl !== undefined) {
      user.cinPhotoUrl = dto.cinPhotoUrl || null;
    }
    if (dto.drivingLicensePhotoUrl !== undefined) {
      user.drivingLicensePhotoUrl = dto.drivingLicensePhotoUrl || null;
    }
    if (dto.avatarUrl !== undefined) {
      user.avatarUrl = dto.avatarUrl || null;
    }

    const saved = await this.userRepo.save(user);
    return this.sanitizeUser(saved);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'New password must be different from current password',
      );
    }

    const user = await this.userRepo.findOne({ where: { id: userId } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    await this.userRepo.save(user);

    return { message: 'Password changed successfully' };
  }

  private sanitizeUser(user: User): Partial<User> {
    const {
      passwordHash: _passwordHash,
      emailVerificationToken: _emailVerificationToken,
      passwordResetToken: _passwordResetToken,
      ...safe
    } = user;

    return safe;
  }
}
