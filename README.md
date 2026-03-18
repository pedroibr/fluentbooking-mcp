# FluentBooking MCP Worker

MCP server em Cloudflare Workers para integrar com a REST API do FluentBooking em um WordPress.

## Objetivo

Expor tools MCP abertas para uso em clientes compatíveis, mantendo o deploy simples no Cloudflare e a autenticação feita com WordPress Application Passwords.

## Estrategia Recomendada

Para varios sites, use um unico repositorio e publique varios Workers diferentes no Cloudflare:

- Um Worker por site
- O mesmo codigo para todos
- Variaveis e secrets configurados separadamente em cada Worker
- Deploy centralizado via GitHub Actions usando `wrangler deploy --name ... --keep-vars`

## Variaveis

Obrigatorias:

- `WORDPRESS_BASE_URL`: URL base do WordPress, por exemplo `https://example.com`
- `WP_USERNAME`: usuario do WordPress com permissao no FluentBooking
- `WP_APPLICATION_PASSWORD`: Application Password do WordPress

Configuraveis:

- `FLUENTBOOKING_API_PATH`: padrao `/wp-json/fluent-booking/v2`
- `ALLOW_WRITES`: habilita operacoes de escrita
- `ALLOW_DELETES`: habilita operacoes destrutivas
- `DEFAULT_PER_PAGE`: pagina padrao para listagens
- `REQUEST_TIMEOUT_MS`: timeout das chamadas HTTP ao WordPress

## Estrutura

- `src/index.ts`: rotas HTTP do Worker
- `src/mcp.ts`: JSON-RPC e fluxo MCP
- `src/env.ts`: leitura e validacao das variaveis
- `src/fluentbooking-client.ts`: cliente HTTP do FluentBooking
- `src/tools/*`: registry das tools por dominio

## Tools Iniciais

Ready:

- `list_calendars`
- `get_calendar`
- `list_events`
- `get_event`
- `create_event`
- `get_calendar_event`
- `delete_event`
- `get_event_availability`
- `list_bookings`
- `get_event_for_booking`
- `get_event_time_slots`
- `create_booking`
- `get_event_payment_settings`

Planejadas para a proxima fase:

- Bookings management
- Schedules
- Transactions
- Reports
- Hosts e admins

## Uso Local

1. Instale dependencias com `npm install`
2. Copie `.dev.vars.example` para `.dev.vars`
3. Preencha as credenciais do WordPress
4. Rode `npm run dev`

Para deploy local, use sempre:

- `npm run deploy`

Esse script usa `--keep-vars` para preservar as variaveis configuradas no dashboard do Cloudflare Worker.

Health endpoint:

- `GET /`

MCP endpoint:

- `POST /mcp`

## Deploy Multi-Site Pelo GitHub

O repositorio inclui workflow para deploy manual de qualquer Worker existente no Cloudflare. O workflow usa `--keep-vars`, entao nao sobrescreve as variaveis configuradas no dashboard.

### Setup

1. Criar no GitHub os secrets do repositorio:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
2. Criar ou manter no Cloudflare um Worker por site
3. Configurar em cada Worker:
   - `WORDPRESS_BASE_URL`
   - `WP_USERNAME`
   - `WP_APPLICATION_PASSWORD`
   - `FLUENTBOOKING_API_PATH`
   - `ALLOW_WRITES`
   - `ALLOW_DELETES`
   - `DEFAULT_PER_PAGE`
   - `REQUEST_TIMEOUT_MS`
4. Rodar o workflow `Deploy Worker` informando o nome do Worker desejado
