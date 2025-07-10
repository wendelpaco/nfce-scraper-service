# NFCe Scraper Service 🧾

Um serviço Node.js + TypeScript para leitura e extração de dados de Notas Fiscais de Consumidor Eletrônica (NFC-e) a partir de URLs dos QR Codes.

## 📌 Tecnologias usadas

- Node.js
- TypeScript
- Express
- Prisma + PostgreSQL
- Puppeteer
- BullMQ + Redis (fila de jobs)
- Axios (para webhooks)
- BullBoard (Dashboard de jobs)
- Docker + Docker Compose
- Eslint + Prettier (padronização de código)

## 📂 Estrutura do Projeto

```
src/
├── controllers/        # Controllers da API
├── jobs/               # Configuração das filas BullMQ
├── scrapers/           # Scrapers separados por estado (ex: Bahia, Rio)
├── services/           # Lógica de negócio
├── utils/              # Helpers como puppeteerHelper, proxyConfig, prisma
├── workers/            # Workers BullMQ (ex: scraperWorker.ts)
├── app.ts              # Configuração do Express
├── server.ts           # Inicialização do servidor
```

## 📌 Como rodar o projeto

### Modo local (desenvolvimento rápido)

1. Instalar dependências:

```bash
yarn
```

2. Configurar o banco de dados no `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
REDIS_HOST=localhost
REDIS_PORT=6379
```

3. Rodar as migrações Prisma:

```bash
npx prisma migrate dev
```

4. Buildar o projeto:

```bash
yarn build
```

> **Nota:** Os arquivos compilados ficam em `dist/src/`. O comando de start já está ajustado para isso.

5. Iniciar a API (produção):

```bash
yarn start
```

6. Rodar o worker:

```bash
yarn worker
```

---

### Modo produção com Docker

```bash
docker-compose up --build
```

Após subir, rode a migration dentro do container:

```bash
docker-compose exec app yarn prisma migrate dev
```

A API ficará disponível em:  
http://localhost:3000

O BullBoard (dashboard da fila):  
http://localhost:3001

---

## 📡 Endpoints da API

### POST `/queue`

Enfileira uma URL para processamento assíncrono.

**Body:**

```json
{
  "url": "URL_DA_NFE",
  "webhookUrl": "https://seu-webhook.site/opcional"
}
```

### POST `/run`

Executa a leitura da NFC-e diretamente (modo imediato e sem passar pela fila).

**Body:**

```json
{
  "url": "URL_DA_NFE"
}
```

### GET `/result/:id`

Consulta o resultado de uma nota processada.

### GET `/status/:id`

Consulta o status de um job da fila (ex: PENDING, DONE, ERROR).

## 🛠️ Scripts úteis

```bash
# Rodar o ESLint
yarn lint

# Rodar o Prettier
yarn prettier

# Buildar o projeto
yarn build

# Iniciar a API (produção)
yarn start

# Iniciar worker BullMQ
yarn worker

# Teste de stress geral
yarn stress

# Teste de stress RJ
yarn stress-rj

# Testar proxies
yarn proxy:test

# Popular banco com dados de exemplo
yarn seed

# Gerar relatório de stats
yarn report

# Gerenciar jobs na fila
yarn manage-jobs

# Reprocessar jobs bloqueados
yarn reprocess-blocked

# Analisar e limpar inválidos
yarn analyze-invalid
```

---

## ℹ️ Observações importantes

- O BullMQ Dashboard (BullBoard) permite visualizar jobs com erro. Agora, quando um job falha, o resultado inclui um campo `errorMessage` detalhando o motivo do erro, facilitando o diagnóstico diretamente pelo dashboard.
- O comando de start foi ajustado para rodar `node dist/src/server.js` (atenção à estrutura de build do TypeScript).
- O projeto utiliza BullMQ para filas e workers, com integração ao BullBoard para monitoramento visual.

---

## ✅ Roadmap futuro (ideias)

- ✅ Fila de processamento com Redis e BullMQ
- Suporte a mais estados (SP, MG, etc)
- Melhorias no controle de proxies
- Dashboard de status de scraping
- Retry automático com backoff

---

## ✨ Contribuições

Pull Requests são bem-vindos! 🚀

---

## 🛡️ Licença

MIT
