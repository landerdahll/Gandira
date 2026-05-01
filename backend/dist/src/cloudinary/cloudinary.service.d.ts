import { ConfigService } from '@nestjs/config';
import { UploadApiResponse } from 'cloudinary';
export declare class CloudinaryService {
    constructor(config: ConfigService);
    uploadBuffer(buffer: Buffer, mimetype: string, folder: string): Promise<UploadApiResponse>;
    deleteByUrl(url: string): Promise<void>;
}
