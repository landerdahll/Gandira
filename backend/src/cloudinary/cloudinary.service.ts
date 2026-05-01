import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  constructor(config: ConfigService) {
    cloudinary.config({
      cloud_name: config.get('CLOUDINARY_CLOUD_NAME'),
      api_key:    config.get('CLOUDINARY_API_KEY'),
      api_secret: config.get('CLOUDINARY_API_SECRET'),
    });
  }

  uploadBuffer(buffer: Buffer, mimetype: string, folder: string): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        { folder, resource_type: 'image', format: 'webp', quality: 'auto' },
        (err, result) => (err ? reject(err) : resolve(result!)),
      );
      Readable.from(buffer).pipe(upload);
    });
  }

  async deleteByUrl(url: string) {
    const match = url.match(/\/([^/]+)\.[a-z]+$/i);
    if (!match) return;
    const publicId = url.split('/upload/')[1]?.replace(/\.[^.]+$/, '');
    if (publicId) await cloudinary.uploader.destroy(publicId).catch(() => null);
  }
}
