# Dockerfile

FROM node:20-slim

# Instalar dependências para o Puppeteer rodar no Docker
RUN apt-get update && apt-get install -y \
  wget \
  ca-certificates \
  fonts-liberation \
  libappindicator3-1 \
  libasound2 \
  libatk-bridge2.0-0 \
  libatk1.0-0 \
  libcups2 \
  libdbus-1-3 \
  libgdk-pixbuf2.0-0 \
  libnspr4 \
  libnss3 \
  libx11-xcb1 \
  libxcomposite1 \
  libxdamage1 \
  libxrandr2 \
  xdg-utils \
  libgbm-dev \
  libxshmfence-dev \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Criar diretório de trabalho
WORKDIR /app

# Copiar arquivos da aplicação
COPY . .

# Instalar dependências
RUN yarn install

# Expõe a porta da API
EXPOSE 3000

# Comando padrão: inicia o servidor Express
# (Pode ser sobrescrito no docker-compose para rodar o worker)
CMD ["yarn", "dev"]