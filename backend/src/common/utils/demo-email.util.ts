import { ConfigService } from '@nestjs/config';

export function isDemoEmailMode(config: ConfigService): boolean {
  return config.get<string>('DEMO_EMAIL_MODE', 'false').trim().toLowerCase() === 'true';
}

export function maskEmail(email: string): string {
  const [local = '', domain = ''] = email.split('@');
  const maskedLocal = local ? `${local[0]}***` : '***';
  const [domainName = '', ...suffix] = domain.split('.');
  const maskedDomain = domainName ? `${domainName[0]}***` : '***';
  return `${maskedLocal}@${maskedDomain}${suffix.length ? `.${suffix.join('.')}` : ''}`;
}
