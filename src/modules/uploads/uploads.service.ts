import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import type { UploadApiResponse } from 'cloudinary';
import type { UploadImageOptions, UploadResult } from './uploads.types';

@Injectable()
export class UploadsService {
  private configured = false;

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('cloudinary.cloudName');
    const apiKey = this.configService.get<string>('cloudinary.apiKey');
    const apiSecret = this.configService.get<string>('cloudinary.apiSecret');

    if (cloudName && apiKey && apiSecret) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
      });
      this.configured = true;
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  async uploadImage(
    file: Express.Multer.File,
    options: UploadImageOptions = {},
  ): Promise<UploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Image upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    const transformation: Record<string, number | string>[] = [];
    if (options.maxWidth) {
      transformation.push({
        width: options.maxWidth,
        crop: 'limit',
      });
    }
    if (options.maxHeight) {
      transformation.push({
        height: options.maxHeight,
        crop: 'limit',
      });
    }

    const result = await this.uploadBuffer(file.buffer, {
      folder: options.folder,
      resource_type: 'image',
      transformation: transformation.length > 0 ? transformation : undefined,
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  async uploadDocument(file: Express.Multer.File): Promise<UploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No file uploaded');
    }

    if (!this.configured) {
      throw new ServiceUnavailableException(
        'Document upload is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET.',
      );
    }

    const result = await this.uploadBuffer(file.buffer, {
      folder: 'tunrent/documents',
      resource_type: 'auto',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  }

  private uploadBuffer(
    buffer: Buffer,
    options: Record<string, unknown>,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error || !result) {
            reject(
              error instanceof Error
                ? error
                : new Error('Cloudinary upload failed'),
            );
            return;
          }

          resolve(result);
        },
      );

      stream.end(buffer);
    });
  }
}
