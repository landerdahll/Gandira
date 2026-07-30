import { EmailTokenService } from './email-token.service';

describe('EmailTokenService', () => {
  const config: any = { get: (key: string) => key === 'EMAIL_TOKEN_SECRET' ? 'a-secure-test-secret-with-more-than-32-bytes' : 'test' };
  const service = new EmailTokenService(config);

  it('reconstrói deterministicamente e valida somente pelo hash', () => {
    const token = service.reconstruct('record-1', 'email-verification');
    const hash = service.hashForRecord('record-1', 'email-verification');
    expect(token).not.toBe(hash);
    expect(service.matches(token, hash)).toBe(true);
    expect(service.matches(`${token}x`, hash)).toBe(false);
  });

  it('separa tokens por finalidade', () => {
    expect(service.reconstruct('record-1', 'email-verification')).not.toBe(service.reconstruct('record-1', 'password-reset'));
  });
});
