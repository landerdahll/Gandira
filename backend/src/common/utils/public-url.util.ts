import { ConfigService } from '@nestjs/config';

const OFFICIAL_PUBLIC_URL = 'https://pago.outrahora.com';

export function getPublicFrontendUrl(config: ConfigService): string {
  const configured = config.get<string>('FRONTEND_URL')?.split(',')[0]?.trim();
  if (configured) return configured.replace(/\/$/, '');
  return config.get<string>('NODE_ENV') === 'production' ? OFFICIAL_PUBLIC_URL : 'http://localhost:3000';
}
