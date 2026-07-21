"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const serializable_retry_util_1 = require("./serializable-retry.util");
const prismaError = (code) => new client_1.Prisma.PrismaClientKnownRequestError('database error', {
    code,
    clientVersion: '5.10.0',
});
describe('withSerializableRetry', () => {
    beforeEach(() => jest.spyOn(global, 'setTimeout').mockImplementation(((callback) => {
        callback();
        return 0;
    })));
    afterEach(() => jest.restoreAllMocks());
    it('repete P2034 e retorna o resultado da tentativa seguinte', async () => {
        const operation = jest.fn()
            .mockRejectedValueOnce(prismaError('P2034'))
            .mockResolvedValueOnce('ok');
        await expect((0, serializable_retry_util_1.withSerializableRetry)(operation)).resolves.toBe('ok');
        expect(operation).toHaveBeenCalledTimes(2);
    });
    it('converte o terceiro P2034 em ConflictException', async () => {
        const operation = jest.fn().mockRejectedValue(prismaError('P2034'));
        await expect((0, serializable_retry_util_1.withSerializableRetry)(operation)).rejects.toBeInstanceOf(common_1.ConflictException);
        expect(operation).toHaveBeenCalledTimes(3);
    });
    it('não repete erros de negócio', async () => {
        const operation = jest.fn().mockRejectedValue(new common_1.BadRequestException('inválido'));
        await expect((0, serializable_retry_util_1.withSerializableRetry)(operation)).rejects.toThrow('inválido');
        expect(operation).toHaveBeenCalledTimes(1);
    });
    it('não repete outros erros conhecidos do Prisma', async () => {
        const operation = jest.fn().mockRejectedValue(prismaError('P2002'));
        await expect((0, serializable_retry_util_1.withSerializableRetry)(operation)).rejects.toMatchObject({ code: 'P2002' });
        expect(operation).toHaveBeenCalledTimes(1);
    });
});
//# sourceMappingURL=serializable-retry.util.spec.js.map