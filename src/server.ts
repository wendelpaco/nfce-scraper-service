/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */
// src/server.ts
import app from "./app";
import * as dotenv from "dotenv";
import https from "https";
import http from "http";
import fs from "fs";
import path from "path";

dotenv.config();

const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;

// Função para criar servidor HTTP
function createHttpServer() {
  return http.createServer(app);
}

// Função para criar servidor HTTPS
function createHttpsServer() {
  try {
    const certPath =
      process.env.SSL_CERT_PATH || path.join(__dirname, "../ssl/cert.pem");
    const keyPath =
      process.env.SSL_KEY_PATH || path.join(__dirname, "../ssl/key.pem");

    const options = {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };

    return https.createServer(options, app);
  } catch (error) {
    console.warn(
      "⚠️ Certificados SSL não encontrados. Servidor HTTPS não será iniciado.",
    );
    console.warn(
      "📝 Para habilitar HTTPS, configure as variáveis SSL_CERT_PATH e SSL_KEY_PATH",
    );
    return null;
  }
}

// Inicia servidor HTTP
const httpServer = createHttpServer();
httpServer.listen(PORT, () => {
  console.log(`🌐 Servidor HTTP rodando na porta ${PORT}`);
  console.log(`📡 API disponível em: http://localhost:${PORT}`);
});

// Tenta iniciar servidor HTTPS se certificados estiverem disponíveis
const httpsServer = createHttpsServer();
if (httpsServer) {
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 Servidor HTTPS rodando na porta ${HTTPS_PORT}`);
    console.log(`📡 API segura disponível em: https://localhost:${HTTPS_PORT}`);
  });
} else {
  console.log("ℹ️ Para habilitar HTTPS, execute: npm run generate-ssl");
}
