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

4. Iniciar a API:

```bash
yarn dev
```

5. Rodar o worker:

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

## ✅ Roadmap futuro (ideias)

- ✅ Fila de processamento com Redis e BullMQ
- Suporte a mais estados (SP, MG, etc)
- Melhorias no controle de proxies
- Dashboard de status de scraping
- Retry automático com backoff

---

## ✅ Scripts úteis

```bash
# Rodar o ESLint
yarn lint

# Rodar o Prettier
yarn format

# Build
yarn build

# Iniciar worker
yarn worker
```

---

## ✨ Contribuições

Pull Requests são bem-vindos! 🚀

---

## 🛡️ Licença

MIT
