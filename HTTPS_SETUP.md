# 🔒 Configuração HTTPS - Resolver Mixed Content

## Problema

```
Mixed Content: The page at 'https://splendorous-kitten-413fe0.netlify.app/' was loaded over HTTPS,
but requested an insecure XMLHttpRequest endpoint 'http://179.197.196.213:3000/status/...'.
This request has been blocked; the content must be served over HTTPS.
```

## Soluções

### 1. 🚀 Solução Rápida - HTTPS Local (Desenvolvimento)

```bash
# Gerar certificados SSL auto-assinados
npm run generate-ssl

# Iniciar servidor com HTTPS
npm run dev-https
```

O servidor estará disponível em:

- HTTP: `http://localhost:3000`
- HTTPS: `https://localhost:3443`

### 2. 🌐 Solução Produção - Proxy Reverso

Configure um proxy reverso (Nginx/Apache) para servir HTTPS:

```nginx
# Nginx config
server {
    listen 443 ssl;
    server_name seu-dominio.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 3. 🔧 Configuração Manual

#### Gerar certificados SSL:

```bash
# Criar diretório SSL
mkdir -p ssl

# Gerar certificado auto-assinado
openssl req -x509 -newkey rsa:4096 -keyout ssl/key.pem -out ssl/cert.pem -days 365 -nodes -subj '/CN=localhost'
```

#### Configurar variáveis de ambiente:

```bash
# .env
SSL_CERT_PATH="./ssl/cert.pem"
SSL_KEY_PATH="./ssl/key.pem"
HTTPS_PORT=3443
```

### 4. 📱 Atualizar Frontend

No seu frontend, mude a URL da API de:

```javascript
// ❌ HTTP (causa Mixed Content)
const API_URL = "http://179.197.196.213:3000";

// ✅ HTTPS (resolve o problema)
const API_URL = "https://179.197.196.213:3443";
```

### 5. 🛡️ Certificados Válidos (Produção)

Para produção, use certificados válidos:

#### Let's Encrypt (Gratuito):

```bash
# Instalar certbot
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar no .env
SSL_CERT_PATH="/etc/letsencrypt/live/seu-dominio.com/fullchain.pem"
SSL_KEY_PATH="/etc/letsencrypt/live/seu-dominio.com/privkey.pem"
```

#### Certificado Comercial:

Configure os caminhos para seu certificado comercial no `.env`.

## Teste

1. **Gerar certificados:**

   ```bash
   npm run generate-ssl
   ```

2. **Iniciar servidor:**

   ```bash
   npm run dev-https
   ```

3. **Testar endpoints:**

   ```bash
   # HTTP
   curl http://localhost:3000/status/test-id

   # HTTPS
   curl -k https://localhost:3443/status/test-id
   ```

4. **Atualizar frontend:**
   ```javascript
   // Usar HTTPS no frontend
   fetch("https://179.197.196.213:3443/status/job-id");
   ```

## ⚠️ Notas Importantes

- **Certificados auto-assinados**: Funcionam apenas para desenvolvimento
- **Produção**: Use certificados válidos (Let's Encrypt ou comercial)
- **Firewall**: Abra a porta 3443 se necessário
- **DNS**: Configure A record para seu IP se usar domínio

## 🎯 Resultado

Após a configuração, seu frontend HTTPS poderá fazer requisições para a API HTTPS sem erros de Mixed Content.
