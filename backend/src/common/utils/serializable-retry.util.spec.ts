import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { withSerializableRetry } from './serializable-retry.util';

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError('database error', {
    code,
    clientVersion: '5.10.0',
  });

describe('withSerializableRetry', () => {
  beforeEach(() => jest.spyOn(global, 'setTimeout').mockImplementation(((callback: any) => {
    callback();
    return 0 as any;
  }) as any));

  afterEach(() => jest.restoreAllMocks());

  it('repete P2034 e retorna o resultado da tentativa seguinte', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(prismaError('P2034'))
      .mockResolvedValueOnce('ok');

    await expect(withSerializableRetry(operation)).resolves.toBe('ok');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('converte o terceiro P2034 em ConflictException', async () => {
    const operation = jest.fn().mockRejectedValue(prismaError('P2034'));

    await expect(withSerializableRetry(operation)).rejects.toBeInstanceOf(ConflictException);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('não repete erros de negócio', async () => {
    const operation = jest.fn().mockRejectedValue(new BadRequestException('inválido'));

    await expect(withSerializableRetry(operation)).rejects.toThrow('inválido');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('não repete outros erros conhecidos do Prisma', async () => {
    const operation = jest.fn().mockRejectedValue(prismaError('P2002'));

    await expect(withSerializableRetry(operation)).rejects.toMatchObject({ code: 'P2002' });
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
