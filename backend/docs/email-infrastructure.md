# Infraestrutura de e-mails

Somente o backend conhece o Resend e os segredos. Nenhuma variável `RESEND_*` ou `EMAIL_TOKEN_SECRET` deve ser configurada no frontend/Vercel.

## Tokens sem persistência do valor puro

Confirmação, recuperação de senha e convite usam `recordId.assinatura`. A assinatura é HMAC-SHA-256 de `purpose:recordId`, usando `EMAIL_TOKEN_SECRET`; o banco guarda somente SHA-256 do token público.

A outbox persiste apenas `recordId`, finalidade e caminho. Em cada tentativa, o processador reconstrói o token em memória, cria a URL, envia e descarta o valor. Token puro e chave não são gravados nem registrados. Na validação, o backend localiza o registro pelo ID, calcula SHA-256 do valor recebido e compara com o hash em tempo constante. `expiresAt` controla a validade e `usedAt`, o uso único.

Trocar `EMAIL_TOKEN_SECRET` invalida todos os links pendentes, inclusive convites. Contas confirmadas, ingressos já transferidos e senhas atuais permanecem válidos. Usuários precisam solicitar novos links; convites pendentes devem ser recriados quando necessário.

## Outbox

Mensagens idempotentes são inseridas na `EmailOutbox`, preferencialmente na transação da operação. Um job periódico faz claim condicional, envia pelo `MailService`, guarda o ID do Resend e aplica backoff exponencial. Itens presos em `PROCESSING` retornam a `RETRY` após o timeout. O payload não pode conter senhas, chaves, tokens puros, QR Codes ou dados de cartão.

## Variáveis do Render

- `RESEND_API_KEY`: segredo do Resend.
- `RESEND_FROM_NAME`: recomendado `Pago by OutraHora`.
- `RESEND_FROM_EMAIL`: remetente autorizado; usar remetente de testes antes da verificação do domínio.
- `RESEND_FROM`: compatibilidade legada temporária.
- `FRONTEND_URL`: recomendado `https://pago.outrahora.com`.
- `EMAIL_TOKEN_SECRET`: segredo aleatório exclusivo com pelo menos 32 bytes.
- `DEMO_EMAIL_MODE`: obrigatoriamente `false` em produção.
- `EMAIL_OUTBOX_POLL_INTERVAL_MS`: padrão `45000`.
- `EMAIL_OUTBOX_MAX_ATTEMPTS`: padrão `5`.
- `EMAIL_OUTBOX_PROCESSING_TIMEOUT_MS`: padrão `600000`.

Não configurar ainda `noreply@outrahora.com`: o domínio precisa ser verificado no Resend.

## Migração dos tokens antigos

A migration `20260729220000_production_email_infrastructure` remove registros antigos de confirmação e recuperação, pois continham tokens puros. Ela não altera contas confirmadas nem senhas. Antes do deploy, faça backup do PostgreSQL e registre a quantidade de tokens e transferências pendentes. Links antigos poderão ser substituídos pelo reenvio.
