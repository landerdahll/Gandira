"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcrypt"));
const auth_service_1 = require("./auth.service");
jest.mock('bcrypt', () => ({ hash: jest.fn() }));
describe('AuthService registration with transfer invite', () => {
    const dto = {
        name: 'Recipient',
        email: 'recipient@example.com',
        password: 'StrongPass1',
        invitationToken: 'raw-invite',
    };
    function setup(completeInvite, configValues = {}) {
        const committedUsers = [];
        const tx = {
            ticketTransfer: {
                findUnique: jest.fn().mockResolvedValue({
                    status: 'PENDING_REGISTRATION',
                    expiresAt: new Date(Date.now() + 60_000),
                    recipientEmail: dto.email,
                }),
            },
            user: {
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn(async ({ data }) => ({ id: 'user-new', ...data, role: 'CUSTOMER', isVerified: data.isVerified ?? false })),
            },
            auditLog: { create: jest.fn().mockResolvedValue({}) },
            emailVerificationToken: { create: jest.fn().mockResolvedValue({}) },
            refreshToken: { create: jest.fn().mockResolvedValue({}) },
        };
        const prisma = {
            user: { findUnique: jest.fn().mockResolvedValue(null), create: tx.user.create },
            refreshToken: { create: jest.fn().mockResolvedValue({}) },
            auditLog: { create: jest.fn() },
            emailVerificationToken: { create: jest.fn(), deleteMany: jest.fn() },
            $transaction: jest.fn(async (callback) => {
                const snapshot = [...committedUsers];
                try {
                    const result = await callback(tx);
                    committedUsers.push(result.user);
                    return result;
                }
                catch (error) {
                    committedUsers.splice(0, committedUsers.length, ...snapshot);
                    throw error;
                }
            }),
        };
        const mail = { sendVerificationEmail: jest.fn().mockResolvedValue(undefined) };
        const transfers = {
            prepareInviteCompletion: jest.fn().mockResolvedValue({ nextToken: 'new-ticket-token', qrCodeUrl: 'data:image/png' }),
            hashInviteToken: jest.fn().mockReturnValue('invite-hash'),
            completeInviteInTransaction: completeInvite,
            notifyInviteCompleted: jest.fn(),
        };
        const jwt = { signAsync: jest.fn().mockResolvedValue('access-token') };
        const config = { get: jest.fn((key, fallback) => configValues[key] ?? fallback) };
        const service = new auth_service_1.AuthService(prisma, jwt, config, mail, transfers);
        return { service, prisma, tx, mail, transfers, jwt, committedUsers };
    }
    beforeEach(() => bcrypt.hash.mockResolvedValue('password-hash'));
    afterEach(() => jest.restoreAllMocks());
    it('marca cadastro comum como verificado e registra o link quando DEMO_EMAIL_MODE=true', async () => {
        const context = setup(jest.fn(), { DEMO_EMAIL_MODE: 'true', FRONTEND_URL: 'https://demo.gandira.test' });
        const logger = jest.spyOn(context.service.logger, 'log');
        const result = await context.service.register({ ...dto, invitationToken: undefined });
        expect(result.user.isVerified).toBe(true);
        expect(context.prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({ isVerified: true }),
        }));
        expect(context.mail.sendVerificationEmail).toHaveBeenCalledWith(dto.email, dto.name, expect.stringMatching(/^https:\/\/demo\.gandira\.test\/auth\/verify-email\?token=/));
        expect(logger).toHaveBeenCalledWith(expect.stringContaining('[DEMO EMAIL MODE] Confirmação de e-mail'));
        expect(logger).toHaveBeenCalledWith(expect.stringContaining('Destinatário: r***@e***.com'));
    });
    it('preserva cadastro não verificado quando DEMO_EMAIL_MODE=false', async () => {
        const context = setup(jest.fn(), { DEMO_EMAIL_MODE: 'false' });
        const result = await context.service.register({ ...dto, invitationToken: undefined });
        expect(result.user.isVerified).toBe(false);
        expect(context.prisma.user.create.mock.calls[0][0].data).not.toHaveProperty('isVerified');
    });
    it('conclui convite criando o destinatário já verificado no modo demo', async () => {
        const completion = { transfer: { id: 'transfer-1' }, user: { id: 'user-new', email: dto.email, name: dto.name } };
        const completeInvite = jest.fn().mockResolvedValue(completion);
        const context = setup(completeInvite, { DEMO_EMAIL_MODE: 'true' });
        const result = await context.service.register(dto);
        expect(result.user.isVerified).toBe(true);
        expect(completeInvite).toHaveBeenCalled();
        expect(context.transfers.notifyInviteCompleted).toHaveBeenCalledWith(completion.transfer, completion.user);
    });
    it('reverte usuário, audit log e token de verificação quando completeInvite falha', async () => {
        const context = setup(jest.fn().mockRejectedValue(new common_1.ConflictException('claim perdido')));
        await expect(context.service.register(dto)).rejects.toThrow('claim perdido');
        expect(context.committedUsers).toHaveLength(0);
        expect(context.tx.auditLog.create).toHaveBeenCalledTimes(1);
        expect(context.tx.emailVerificationToken.create).toHaveBeenCalledTimes(1);
        expect(context.tx.refreshToken.create).toHaveBeenCalledTimes(1);
        expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
        expect(context.prisma.refreshToken.create).not.toHaveBeenCalled();
    });
    it('mantém o commit quando o e-mail falha depois da transação', async () => {
        const completion = { transfer: { id: 'transfer-1' }, user: { id: 'user-new', email: dto.email, name: dto.name } };
        const context = setup(jest.fn().mockResolvedValue(completion));
        context.mail.sendVerificationEmail.mockRejectedValue(new Error('mail unavailable'));
        await expect(context.service.register(dto)).resolves.toMatchObject({ user: { id: 'user-new' } });
        expect(context.committedUsers).toHaveLength(1);
        expect(context.transfers.notifyInviteCompleted).toHaveBeenCalledWith(completion.transfer, completion.user);
        expect(context.tx.refreshToken.create).toHaveBeenCalledTimes(1);
        expect(context.prisma.refreshToken.create).not.toHaveBeenCalled();
    });
    it('reverte o cadastro convidado quando a assinatura do access token falha', async () => {
        const context = setup(jest.fn());
        context.jwt.signAsync.mockRejectedValue(new Error('jwt unavailable'));
        await expect(context.service.register(dto)).rejects.toThrow('jwt unavailable');
        expect(context.committedUsers).toHaveLength(0);
        expect(context.tx.refreshToken.create).not.toHaveBeenCalled();
        expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
    });
    it('reverte o cadastro convidado quando a persistência do refresh token falha', async () => {
        const context = setup(jest.fn());
        context.tx.refreshToken.create.mockRejectedValue(new Error('refresh unavailable'));
        await expect(context.service.register(dto)).rejects.toThrow('refresh unavailable');
        expect(context.committedUsers).toHaveLength(0);
        expect(context.transfers.completeInviteInTransaction).not.toHaveBeenCalled();
        expect(context.mail.sendVerificationEmail).not.toHaveBeenCalled();
    });
});
//# sourceMappingURL=auth.service.spec.js.map