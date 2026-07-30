# Fundação multi-organização

## Fontes de autoridade

- `User.platformRole` representa somente o alcance da plataforma: `MEMBER` ou
  `SUPER_ADMIN`.
- `OrganizationMember.role` representa o cargo dentro de uma organização:
  `ORG_ADMIN`, `PRODUCER` ou `STAFF`.
- `User.role` permanece temporariamente como contrato legado para permitir uma
  implantação e um rollback compatíveis. Novas regras de autorização não devem
  usá-lo como fonte de verdade.
- `Event.organizationId` define a organização proprietária. `producerId`
  permanece como autoria e compatibilidade durante a transição.

Clientes comuns têm `platformRole = MEMBER` e nenhuma membership automática.
Todos os eventos e usuários administrativos legados são associados à organização
inicial `OutraHora` pela migration de fundação.

## Organização ativa

Um usuário pode ter qualquer quantidade de linhas em `OrganizationMember`, com
uma restrição única apenas por par `(organizationId, userId)`. Não existe uma
restrição global por usuário.

A organização ativa não é persistida em `User` nesta fase. Nas fases seguintes,
ela deve ser selecionada pelo contexto administrativo da requisição (por rota,
header ou sessão dedicada) e sempre validada contra uma membership `ACTIVE` e
uma `Organization.isActive = true`. Isso evita assumir uma organização única e
permite sessões ou abas operando em organizações diferentes.

Enquanto a interface de seleção ainda não existe, o resolvedor transitório da
Fase 1 aceita exatamente uma membership ativa e recusa escolher silenciosamente
quando encontra mais de uma.

## Convites futuros

A Fase 4 deve introduzir uma entidade própria, sem reutilizar
`OrganizationMember`. Modelo planejado:

```prisma
model OrganizationInvitation {
  id             String                     @id @default(cuid())
  organizationId String
  email          String
  role           OrganizationRole           // somente PRODUCER ou STAFF
  status         OrganizationInvitationStatus
  tokenHash      String                     @unique
  invitedById    String
  acceptedById   String?
  expiresAt      DateTime
  acceptedAt     DateTime?
  createdAt      DateTime                   @default(now())
  updatedAt      DateTime                   @updatedAt
}
```

O convite deverá normalizar o e-mail, possuir unicidade para convites pendentes
por organização/e-mail e criar ou reativar a membership apenas após a aceitação
ou o cadastro com o mesmo e-mail. Nenhuma tabela ou rotina de convite é criada na
Fase 1.

## Limites desta fase

O isolamento de consultas e a autorização organizacional centralizada pertencem
à Fase 2. A infraestrutura de e-mail e a migration deferred de limpeza de tokens
não fazem parte desta fundação e não devem ser alteradas.
