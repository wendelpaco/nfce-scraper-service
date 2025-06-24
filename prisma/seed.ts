/* eslint-disable no-console */
import { randomUUID } from "node:crypto";
import prisma from "../src/utils/prisma";

async function main() {
  console.log("🌱 Iniciando seed...");

  const users = [
    { name: "Cliente Alpha" },
    { name: "Cliente Beta" },
    { name: "Cliente Gamma" },
  ];

  for (const user of users) {
    const createdUser = await prisma.apiUser.create({
      data: {
        name: user.name,
        tokens: {
          create: {
            name: `${user.name} - Token Padrão`,
            token: randomUUID(),
            active: true,
          },
        },
      },
      include: {
        tokens: true,
      },
    });

    console.log(`✅ Usuário criado: ${createdUser.name}`);
    console.log(`🔑 Token: ${createdUser.tokens[0].token}`);
  }

  console.log("🌱 Seed finalizado.");
}

main()
  .catch((e) => {
    console.error("❌ Erro ao rodar o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
