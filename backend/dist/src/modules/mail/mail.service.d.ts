import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    private fromAddress;
    private devMode;
    constructor(config: ConfigService);
    sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void>;
}
