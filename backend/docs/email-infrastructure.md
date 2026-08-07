# Infraestrutura de e-mails

Somente o backend conhece o Resend e os segredos. Nenhuma variável `RESEND_*` ou `EMAIL_TOKEN_SECRET` deve ser configurada no frontend/Vercel.

## Tokens sem persistência do valor puro

Novos links de confirmação, recuperação de senha e convite usam `recordId.assinatura`. A assinatura é HMAC-SHA-256 de `purpose:recordId`, usando `EMAIL_TOKEN_SECRET`; para registros novos o banco guarda somente SHA-256 do token público.

A outbox persiste apenas `recordId`, finalidade e caminho. Em cada tentativa, o processador reconstrói o token em memória, cria a URL, envia e descarta o valor. Token puro e chave não são gravados nem registrados. Na validação, o backend localiza o registro pelo ID, calcula SHA-256 do valor recebido e compara com o hash em tempo constante. `expiresAt` controla a validade e `usedAt`, o uso único.

Durante a expansão, as colunas legadas `token` permanecem nullable exclusivamente para compatibilidade com a versão anterior. O backend novo prioriza `tokenHash`, aceita temporariamente um registro legado existente e nunca cria um novo token puro.

Trocar `EMAIL_TOKEN_SECRET` invalida todos os links novos ainda pendentes, inclusive convites HMAC. Links legados existentes continuam sujeitos à coluna legada até a limpeza. Contas confirmadas, ingressos já transferidos e senhas atuais permanecem válidos. Usuários precisam solicitar novos links; convites pendentes devem ser recriados quando necessário.

## Outbox

Mensagens idempotentes são inseridas na `EmailOutbox`, preferencialmente na transação da operação. Um job periódico faz claim condicional, envia pelo `MailService`, guarda o ID do Resend e aplica backoff exponencial. Itens presos em `PROCESSING` retornam a `RETRY` após o timeout. O payload não pode conter senhas, chaves, tokens puros, QR Codes ou dados de cartão.

Na confirmação de compra, o worker consulta o estado atual do pedido e gera em memória um único PDF com uma página por ingresso ainda elegível. Cada QR contém o `Ticket.token` vigente, usado pelo check-in; PDFs, imagens base64 e tokens nunca são persistidos na outbox. Ingressos cancelados, usados, em transferência ou que já pertencem a outro usuário são omitidos. Se nenhum ingresso estiver elegível, a confirmação segue sem anexo e gera um aviso operacional. O PDF possui limite interno de 10 MB e é descartado depois da tentativa.

O envio usa a chave idempotente `email-outbox-<id>` no Resend. Falhas de PDF são registradas com `[PDF_GENERATION]`; falhas do provedor, com `[RESEND]`.

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

## Estratégia expand/contract

### 1. Expansão

`prisma/migrations/20260729220000_expand_email_infrastructure` é a única fase descoberta por `prisma migrate deploy`. Ela:

- mantém todos os registros;
- mantém `token`, tornando-o nullable;
- adiciona `tokenHash` nullable;
- cria cooldowns, outbox, índices e enums;
- permite que o backend antigo continue gravando `token`;
- permite que o backend novo grave somente `tokenHash`;
- permite rollback temporário para o backend antigo.

Depois da expansão, implante o backend novo e valide cadastro, confirmação, recuperação, outbox, pagamento e transferência. Registros criados pelo backend antigo durante a troca podem continuar legados e serão invalidados somente na limpeza.

### 2. Limpeza adiada

`prisma/deferred-migrations/20260729230000_cleanup_legacy_email_tokens` fica deliberadamente fora de `prisma/migrations`, portanto não é executada por `prisma migrate deploy`.

Somente depois de um período de estabilidade, sem intenção de rollback, deve-se:

1. fazer um novo backup completo;
2. contar registros com `tokenHash IS NULL`;
3. mover o diretório de limpeza para `prisma/migrations` em um commit próprio;
4. invalidar apenas registros legados sem hash;
5. remover `token`;
6. tornar `tokenHash` obrigatório;
7. remover do backend o fallback de validação legado.

### Rollback durante a expansão

Antes da limpeza, é possível reimplantar a versão anterior: a coluna `token` continua existindo e aceita os valores que ela grava. O rollback não entende tokens novos que possuem apenas `tokenHash`; esses usuários precisarão solicitar outro link depois da estabilização. Não execute a limpeza enquanto rollback ainda for uma possibilidade.

Após a limpeza, rollback para uma versão que exige `token` deixa de ser compatível e requer restauração do backup ou uma nova migration de compatibilidade.
