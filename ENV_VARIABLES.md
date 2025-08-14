# Variáveis de Ambiente - NFCe Scraper Service

## Configuração Obrigatória

### Database

```bash
DATABASE_URL="postgresql://user:password@localhost:5432/dbname"
```

### Redis

```bash
REDIS_HOST=localhost
REDIS_PORT=6379
```

## Configuração Opcional

### Server

```bash
PORT=3000
HTTPS_PORT=3443
```

### SSL/HTTPS Configuration

```bash
# Caminhos para certificados SSL (opcional)
SSL_CERT_PATH="/path/to/cert.pem"
SSL_KEY_PATH="/path/to/key.pem"
```

### CORS Configuration

```bash
# Permite todas as origens (padrão)
CORS_ORIGIN="*"

# Ou especifique origens específicas
CORS_ORIGIN="http://localhost:3000,https://seu-dominio.com"
```

### BullBoard (Dashboard)

```bash
BULLBOARD_PASSWORD=admin
```

### Worker Configuration

```bash
WORKER_CONCURRENCY=1
WORKER_LOCK_DURATION=600000
WORKER_STALLED_INTERVAL=120000
WORKER_MAX_STALLED=3
```

## Exemplo de arquivo .env

```bash
# Database
DATABASE_URL="postgresql://postgres:admin@localhost:5432/nfce_scraper"

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Server
PORT=3000
HTTPS_PORT=3443

# SSL Configuration (opcional)
# SSL_CERT_PATH="/path/to/cert.pem"
# SSL_KEY_PATH="/path/to/key.pem"

# CORS Configuration
CORS_ORIGIN="*"

# BullBoard
BULLBOARD_PASSWORD=admin

# Worker Configuration
WORKER_CONCURRENCY=1
WORKER_LOCK_DURATION=600000
WORKER_STALLED_INTERVAL=120000
WORKER_MAX_STALLED=3
```

## Configuração do CORS

O CORS está configurado com as seguintes opções padrão:

- **origin**: `"*"` (permite todas as origens)
- **methods**: `["GET", "POST", "PUT", "DELETE", "OPTIONS"]`
- **allowedHeaders**: `["Content-Type", "Authorization", "X-Requested-With"]`
- **credentials**: `true` (permite cookies e headers de autenticação)
- **optionsSuccessStatus**: `200`

Para restringir as origens, defina a variável `CORS_ORIGIN` com as URLs permitidas separadas por vírgula.
