import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

describe('email migration expand/contract', () => {
  const root = process.cwd();
  const expansionPath = join(root, 'prisma/migrations/20260729220000_expand_email_infrastructure/migration.sql');
  const cleanupPath = join(root, 'prisma/deferred-migrations/20260729230000_cleanup_legacy_email_tokens/migration.sql');
  const expansion = readFileSync(expansionPath, 'utf8');
  const cleanup = readFileSync(cleanupPath, 'utf8');
  const schema = readFileSync(join(root, 'prisma/schema.prisma'), 'utf8');

  it('mantém dados e colunas legadas na expansão', () => {
    expect(expansion).toContain('ALTER COLUMN "token" DROP NOT NULL');
    expect(expansion).toContain('ADD COLUMN "tokenHash" TEXT');
    expect(expansion).not.toMatch(/DELETE FROM "(?:EmailVerificationToken|PasswordResetToken)"/);
    expect(expansion).not.toMatch(/DROP COLUMN "token"/);
  });

  it('representa token e tokenHash nullable no schema transitório', () => {
    expect(schema.match(/token\s+String\?\s+@unique/g)).toHaveLength(2);
    expect(schema.match(/tokenHash\s+String\?\s+@unique/g)).toHaveLength(2);
  });

  it('mantém a limpeza fora do diretório executado pelo Prisma', () => {
    expect(existsSync(cleanupPath)).toBe(true);
    expect(existsSync(join(root, 'prisma/migrations/20260729230000_cleanup_legacy_email_tokens'))).toBe(false);
    expect(cleanup).toContain('WHERE "tokenHash" IS NULL');
    expect(cleanup).toContain('DROP COLUMN "token"');
    expect(cleanup).toContain('ALTER COLUMN "tokenHash" SET NOT NULL');
  });
});
