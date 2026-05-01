"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const app_module_1 = require("./app.module");
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const logging_interceptor_1 = require("./common/interceptors/logging.interceptor");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule, {
        bufferLogs: true,
        rawBody: true,
    });
    const config = app.get(config_1.ConfigService);
    const isDev = config.get('NODE_ENV') !== 'production';
    const frontendUrl = config.get('FRONTEND_URL');
    app.use((0, helmet_1.default)({
        contentSecurityPolicy: isDev ? false : undefined,
        crossOriginEmbedderPolicy: false,
    }));
    app.use((0, compression_1.default)());
    app.use((0, cookie_parser_1.default)());
    const allowedOrigins = (frontendUrl ?? '')
        .split(',')
        .map((u) => u.trim())
        .filter(Boolean);
    app.enableCors({
        origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
    });
    app.enableVersioning({ type: common_1.VersioningType.URI });
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter());
    app.useGlobalInterceptors(new logging_interceptor_1.LoggingInterceptor());
    if (isDev) {
        const swaggerConfig = new swagger_1.DocumentBuilder()
            .setTitle('OutraHora API')
            .setDescription('Plataforma de venda e gestão de ingressos')
            .setVersion('1.0')
            .addBearerAuth()
            .build();
        swagger_1.SwaggerModule.setup('api/docs', app, swagger_1.SwaggerModule.createDocument(app, swaggerConfig));
    }
    const expressApp = app.getHttpAdapter().getInstance();
    expressApp.get('/health', (_req, res) => res.json({ status: 'ok' }));
    const port = config.get('PORT', 3001);
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 OutraHora API running on http://localhost:${port}/api`);
    if (isDev)
        console.log(`📚 Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map