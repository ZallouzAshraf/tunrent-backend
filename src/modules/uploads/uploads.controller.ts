import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadsService } from './uploads.service';
import type { UploadResult } from './uploads.types';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  uploadImage(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.uploadsService.uploadImage(file, {
      folder: 'tunrent/images',
    });
  }

  @Post('car-photo')
  @UseInterceptors(FileInterceptor('file'))
  uploadCarPhoto(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.uploadsService.uploadImage(file, {
      folder: 'tunrent/car-photos',
      maxWidth: 1600,
      maxHeight: 1200,
    });
  }

  @Post('agency-logo')
  @UseInterceptors(FileInterceptor('file'))
  uploadAgencyLogo(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.uploadsService.uploadImage(file, {
      folder: 'tunrent/agency-logos',
      maxWidth: 512,
      maxHeight: 512,
    });
  }

  @Post('document')
  @UseInterceptors(FileInterceptor('file'))
  uploadDocument(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResult> {
    return this.uploadsService.uploadDocument(file);
  }
}
