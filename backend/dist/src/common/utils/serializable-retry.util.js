"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withSerializableRetry = withSerializableRetry;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const MAX_ATTEMPTS = 3;
const BASE_DELAY_MS = 20;
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
async function withSerializableRetry(operation) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
        try {
            return await operation();
        }
        catch (error) {
            const isSerializationConflict = error instanceof client_1.Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
            if (!isSerializationConflict)
                throw error;
            if (attempt === MAX_ATTEMPTS) {
                throw new common_1.ConflictException('A operação entrou em conflito com outra alteração. Tente novamente.');
            }
            const exponentialDelay = BASE_DELAY_MS * 2 ** (attempt - 1);
            const jitter = Math.floor(Math.random() * BASE_DELAY_MS);
            await delay(exponentialDelay + jitter);
        }
    }
    throw new common_1.ConflictException('A operação entrou em conflito com outra alteração. Tente novamente.');
}
//# sourceMappingURL=serializable-retry.util.js.map