# Paleta do tema light

Fonte dos valores: `src/app/globals.css`. Esta referência documenta os tokens ativos em `:root[data-theme='light']` e as derivações usadas pelas regras light.

## Fundo geral

- Variável: `--theme-background`
- Hexadecimal: `#f5f8fc`
- Uso: fundo global da aplicação.

## Superfície e cards

- Variável: `--theme-surface`
- Hexadecimal: `#ffffff`
- Uso: cards, menus, tabelas, inputs e demais superfícies claras.
- Variável elevada: `--theme-surface-raised`
- Hexadecimal: `#ffffff`
- Uso: superfícies que precisam de elevação sem alterar a cor base.

## Azul principal

- Variável: `--theme-primary`
- Hexadecimal: `#62b6e8`
- Uso: CTAs, links, ícones, estados ativos, badges e foco.

## Texto principal

- Variável: `--theme-text`
- Hexadecimal: `#161616`
- Uso: títulos e conteúdo principal sobre superfícies claras.

## Texto secundário

- Variável: `--theme-text-secondary`
- Hexadecimal: `#4f5d6b`
- Uso: descrições, metadados e textos auxiliares.

## Bordas

- Variável: `--theme-border`
- Hexadecimal: `#d8e3ee`
- Uso: contornos, divisórias, tabelas e inputs.

## Sombras

- Variável: `--theme-shadow`
- Valor: `0 8px 24px rgba(65, 91, 117, 0.08)`
- Uso: elevação suave de cards, menus e modais.

## Header

- Token-base: `--theme-header: #abc9e8`; serve como fallback do tema.
- Luz superior esquerda: `rgba(255, 255, 255, 0.24)` em 0%, `rgba(255, 255, 255, 0.07)` em 34% e transparente em 68%.
- Luz superior direita: `rgba(255, 255, 255, 0.20)` em 0%, `rgba(255, 255, 255, 0.05)` em 35% e transparente em 67%.
- Profundidade inferior central: `rgba(112, 166, 215, 0.31)` em 0%, `rgba(130, 171, 220, 0.09)` em 38% e transparente em 68%.
- Reflexo lilás inferior direito: `rgba(221, 218, 255, 0.13)` em 0% e transparente em 58%.
- Gradiente linear a 115 graus: `#8dbce3` em 0%, `#a8cbed` em 45%, `#a4c8ec` em 63% e `#82b5df` em 100%.
- Borda inferior: `rgba(79, 122, 166, 0.22)`.
- Sombra: `0 2px 14px rgba(66, 103, 143, 0.10)`.
- Conteúdo direto: `#ffffff` em logo, textos e ícones.
- Controles translúcidos: branco com opacidades `0.06`, `0.07`, `0.08`, `0.12`, `0.14` e `0.15` nos fundos; `0.28`, `0.42`, `0.45`, `0.68` e `0.70` em bordas/divisórias.
- CTA principal: `var(--theme-primary)` (`#62b6e8`) com sombra `0 4px 14px rgba(38, 105, 151, 0.20)`.

## Cores derivadas com `color-mix()`

Os valores abaixo são calculados pelo navegador em `srgb`; os percentuais indicam a participação do primeiro token.

- Primary + surface: `5%`, `7%`, `8%`, `9%`, `10%`, `11%`, `13%` e `14%` de `--theme-primary` sobre `--theme-surface`. Uso: fundos claros de hover, badges, cabeçalhos e estados secundários.
- Primary + border: `25%`, `34%`, `38%`, `42%`, `50%` e `52%` de `--theme-primary` sobre `--theme-border`. Uso: bordas azuis suaves, foco e contornos internos.
- Primary + surface para bordas: `45%` e `48%` de `--theme-primary` sobre `--theme-surface`. Uso: bordas claras sobre fundos azuis.
- Border + surface: `22%`, `24%` e `32%` de `--theme-border` sobre `--theme-surface`. Uso: estados desabilitados e superfícies neutras discretas.
- Text + transparente: `12%` de `--theme-text` sobre `transparent`. Uso: badge numérico translúcido em fundo primário.
- Surface + transparente: `78%` de `--theme-surface` sobre `transparent`. Uso: transição do overlay claro no detalhe do ingresso.
