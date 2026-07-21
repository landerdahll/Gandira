import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 20;

const delay = (milliseconds: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, milliseconds));

export async function withSerializableRetry<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const isSerializationConflict =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';

      if (!isSerializationConflict) throw error;
      if (attempt === MAX_ATTEMPTS) {
        throw new ConflictException('A operação entrou em conflito com outra alteração. Tente novamente.');
      }

      const exponentialDelay = BASE_DELAY_MS * 2 ** (attempt - 1);
      const jitter = Math.floor(Math.random() * BASE_DELAY_MS);
      await delay(exponentialDelay + jitter);
    }
  }

  throw new ConflictException('A operação entrou em conflito com outra alteração. Tente novamente.');
}
