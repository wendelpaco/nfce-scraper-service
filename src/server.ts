/* eslint-disable no-console */
// src/server.ts
import app from "./app";

const PORT = 3000;

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
