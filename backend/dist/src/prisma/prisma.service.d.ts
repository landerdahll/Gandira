import { OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
export declare class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger;
    constructor();
    onModuleInit(): Promise<void>;
    onModuleDestroy(): Promise<void>;
    paginate<T>(model: any, args: any, page: number, limit: number): Promise<{
        data: T[];
        meta: {
            total: number;
            page: number;
            lastPage: number;
        };
    }>;
}
