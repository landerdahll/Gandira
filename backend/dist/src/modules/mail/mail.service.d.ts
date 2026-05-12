import { ConfigService } from '@nestjs/config';
export declare class MailService {
    private config;
    private readonly logger;
    private transporter;
    private fromAddress;
    private devMode;
    constructor(config: ConfigService);
    sendVerificationEmail(to: string, name: string, verifyUrl: string): Promise<void>;
    sendPasswordReset(to: string, name: string, resetUrl: string): Promise<void>;
}
