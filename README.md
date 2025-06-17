
# NFCe Scraper Service 🧾

Um serviço Node.js + TypeScript para leitura e extração de dados de Notas Fiscais de Consumidor Eletrônica (NFC-e) a partir de URLs dos QR Codes.

## 📌 Tecnologias usadas

- Node.js
- TypeScript
- Express
- Prisma + PostgreSQL
- Puppeteer
- node-cron (scheduler)
- Axios (para webhooks)
- Eslint + Prettier (padronização de código)

## 📂 Estrutura do Projeto

```
src/
├── controllers/        # Controllers da API
├── jobs/               # Scheduler com node-cron
├── scrapers/           # Scrapers separados por estado (ex: Bahia, Rio)
├── services/           # Lógica de negócio (processamento da nota)
├── utils/              # Helpers como puppeteerHelper, proxyConfig, prismaSingleton
├── app.ts              # Configuração do Express
├── server.ts           # Inicialização do servidor
```

## 📌 Como rodar o projeto

1. **Instalar as dependências**

```bash
yarn
```

2. **Configurar o banco de dados**

Crie um banco PostgreSQL e configure o `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

3. **Rodar as migrações**

```bash
npx prisma migrate dev
```

4. **Iniciar em modo desenvolvimento**

```bash
yarn dev
```

5. **Build para produção**

```bash
yarn build
yarn start
```

---

## 📡 Endpoints da API

### POST `/queue`

Agenda uma URL de NFC-e para processamento.

**Body:**

```json
{
  "url": "URL_DA_NFE",
  "replyTo": "https://seu-webhook.site/opcional"
}
```

---

### POST `/run`

Executa a leitura da NFC-e diretamente (modo manual).

**Body:**

```json
{
  "url": "URL_DA_NFE"
}
```

---

### GET `/result/:id`

Consulta o resultado de uma nota processada.

---

## ⚙️ Scheduler (node-cron)

O job é executado a cada 30 segundos. Ele busca URLs pendentes no banco (`status: PENDING`), processa e salva o resultado.

---

## ✅ Roadmap futuro (ideias)

- Suporte a mais estados (SP, MG, etc)
- Fila de processamento com Redis ou RabbitMQ
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
```

---

## ✨ Contribuições

Pull Requests são bem-vindos! 🚀

---

## 🛡️ Licença

MIT
