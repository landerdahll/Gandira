import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { EmailOutboxService } from './email-outbox.service';
import { EmailOutboxController } from './email-outbox.controller';
import { EmailTokenService } from './email-token.service';
import { TicketPdfService } from './ticket-pdf.service';

@Global()
@Module({
  controllers: [EmailOutboxController],
  providers: [MailService, EmailOutboxService, EmailTokenService, TicketPdfService],
  exports: [MailService, EmailOutboxService, EmailTokenService, TicketPdfService],
})
export class MailModule {}
