#!/bin/bash

echo "🚀 Iniciando processo de release..."

# 1. Checar se existe mudança pendente
if [[ -n $(git status --porcelain) ]]; then
  echo "❌ Existem alterações não commitadas. Por favor, faça commit ou stash antes de criar um release."
  exit 1
fi

# 2. Rodar build do TypeScript
echo "🏗️  Rodando build (tsc)..."
yarn build || { echo "❌ Build falhou. Corrija os erros antes de continuar."; exit 1; }

# 3. Rodar linter
echo "🧹 Rodando ESLint..."
yarn lint || { echo "❌ Linter falhou. Corrija os erros antes de continuar."; exit 1; }

# 4. Rodar Prettier (opcional)
echo "✨ Formatando com Prettier..."
yarn prettier || echo "⚠️ Prettier não encontrado no package.json scripts."

# 5. Criar uma nova tag de versão
read -p "✅ Build OK. Digite o número da nova versão (ex: v1.0.0): " VERSION

git tag -a "$VERSION" -m "Release $VERSION"
git push origin "$VERSION"

echo "✅ Release $VERSION criado e enviado para o repositório remoto!"