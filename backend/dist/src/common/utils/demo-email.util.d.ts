import { ConfigService } from '@nestjs/config';
export declare function isDemoEmailMode(config: ConfigService): boolean;
export declare function maskEmail(email: string): string;
