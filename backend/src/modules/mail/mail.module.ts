import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailOutboxService } from './email-outbox.service';
import { EmailOutboxController } from './email-outbox.controller';
import { EmailTokenService } from './email-token.service';

@Global()
@Module({
  controllers: [EmailOutboxController],
  providers: [MailService, EmailOutboxService, EmailTokenService],
  exports: [MailService, EmailOutboxService, EmailTokenService],
})
export class MailModule {}
