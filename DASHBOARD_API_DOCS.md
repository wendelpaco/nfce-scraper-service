# 📊 Dashboard API - Shopping Centers

## Visão Geral

Este dashboard foi desenvolvido especificamente para **shopping centers** analisarem dados de vendas das lojas através das notas fiscais processadas. As APIs estão divididas em endpoints específicos para melhor performance.

## 🔗 Endpoints Disponíveis

### 1. **Visão Geral** - KPIs Principais

```
GET /api/dashboard/overview?from=2025-01-01&to=2025-12-31
```

**Resposta:**

```json
{
  "totalVendas": 1250000.5,
  "totalNotas": 15000,
  "totalItens": 45000,
  "ticketMedio": 83.33,
  "clientesUnicos": 8500,
  "lojasUnicas": 120,
  "crescimento": 15.5,
  "vendasMesAtual": 125000.0,
  "vendasMesAnterior": 108000.0
}
```

**Parâmetros:**

- `from` (opcional): Data inicial (YYYY-MM-DD)
- `to` (opcional): Data final (YYYY-MM-DD)

---

### 2. **Top Lojas** - Maiores Lojas por Faturamento

```
GET /api/dashboard/lojas?from=2025-01-01&to=2025-12-31&limit=10
```

**Resposta:**

```json
{
  "topLojas": [
    {
      "nome": "LOJA A LTDA",
      "cnpj": "12.345.678/0001-90",
      "faturamento": 250000.0,
      "totalNotas": 3000,
      "ticketMedio": 83.33,
      "totalItens": 9000
    }
  ],
  "totalLojas": 120
}
```

**Parâmetros:**

- `from` (opcional): Data inicial
- `to` (opcional): Data final
- `limit` (opcional): Número de lojas (padrão: 10)

---

### 3. **Análise de Pagamentos** - Formas de Pagamento

```
GET /api/dashboard/pagamentos?from=2025-01-01&to=2025-12-31
```

**Resposta:**

```json
{
  "formasPagamento": [
    {
      "forma": "Cartão de Crédito",
      "total": 750000.0,
      "quantidade": 9000,
      "percentual": 60.0
    },
    {
      "forma": "PIX",
      "total": 375000.0,
      "quantidade": 4500,
      "percentual": 30.0
    }
  ],
  "totalGeral": 1250000.0,
  "totalTransacoes": 15000
}
```

---

### 4. **Análise de Clientes** - Perfil do Público

```
GET /api/dashboard/clientes?from=2025-01-01&to=2025-12-31&limit=10
```

**Resposta:**

```json
{
  "topClientes": [
    {
      "id": "123.456.789-00",
      "nome": "João Silva",
      "tipo": "CPF",
      "total": 5000.0,
      "totalCompras": 15,
      "ticketMedio": 333.33,
      "ultimaCompra": "2025-07-10T22:34:42.551Z"
    }
  ],
  "totalClientes": 8500,
  "analisePorTipo": {
    "cpf": {
      "quantidade": 8000,
      "faturamento": 1000000.0,
      "percentual": 80.0
    },
    "cnpj": {
      "quantidade": 500,
      "faturamento": 250000.0,
      "percentual": 20.0
    }
  }
}
```

---

### 5. **Análise Temporal** - Vendas por Período

```
GET /api/dashboard/temporal?from=2025-01-01&to=2025-12-31&groupBy=month
```

**Resposta:**

```json
{
  "vendasPorPeriodo": [
    {
      "periodo": "2025-01",
      "total": 100000.0,
      "quantidade": 1200,
      "ticketMedio": 83.33
    },
    {
      "periodo": "2025-02",
      "total": 110000.0,
      "quantidade": 1300,
      "ticketMedio": 84.62
    }
  ],
  "totalPeriodos": 12,
  "groupBy": "month"
}
```

**Parâmetros:**

- `groupBy`: "day", "week", "month" (padrão: "month")

---

## 🎯 Casos de Uso para Shopping Centers

### **1. Visão Executiva**

- **KPI Principal**: Faturamento total, crescimento, ticket médio
- **Decisões**: Investimentos, expansão, marketing
- **Endpoint**: `/api/dashboard/overview`

### **2. Gestão de Lojas**

- **Análise**: Top lojas por faturamento
- **Decisões**: Renovação de contratos, posicionamento
- **Endpoint**: `/api/dashboard/lojas`

### **3. Estratégia de Pagamento**

- **Análise**: Formas de pagamento mais utilizadas
- **Decisões**: Parcerias com bancos, promoções
- **Endpoint**: `/api/dashboard/pagamentos`

### **4. Marketing e Cliente**

- **Análise**: Perfil do público consumidor
- **Decisões**: Campanhas direcionadas, segmentação
- **Endpoint**: `/api/dashboard/clientes`

### **5. Planejamento Temporal**

- **Análise**: Vendas por período (dia/semana/mês)
- **Decisões**: Promoções sazonais, estoque
- **Endpoint**: `/api/dashboard/temporal`

---

## 🚀 Implementação no Frontend

### **Exemplo de Conexão com API:**

```javascript
// Configuração base
const API_BASE = "https://179.197.196.213:3443/api/dashboard";

// Função para buscar dados
async function fetchDashboardData(endpoint, params = {}) {
  const queryString = new URLSearchParams(params).toString();
  const url = `${API_BASE}${endpoint}?${queryString}`;

  try {
    const response = await fetch(url);
    return await response.json();
  } catch (error) {
    console.error("Erro ao buscar dados:", error);
    throw error;
  }
}

// Exemplos de uso
const overview = await fetchDashboardData("/overview", {
  from: "2025-01-01",
  to: "2025-12-31",
});

const topLojas = await fetchDashboardData("/lojas", {
  from: "2025-01-01",
  limit: 10,
});

const pagamentos = await fetchDashboardData("/pagamentos", {
  from: "2025-01-01",
});
```

### **Estrutura de Dashboard Recomendada:**

```javascript
// Componentes do Dashboard
const DashboardComponents = {
  // 1. Cards de KPI
  KPICards: {
    totalVendas: overview.totalVendas,
    crescimento: overview.crescimento,
    ticketMedio: overview.ticketMedio,
    clientesUnicos: overview.clientesUnicos,
  },

  // 2. Gráfico de Top Lojas
  TopLojasChart: topLojas.topLojas,

  // 3. Gráfico de Pagamentos (Pizza)
  PagamentosChart: pagamentos.formasPagamento,

  // 4. Gráfico de Clientes por Tipo
  ClientesChart: clientes.analisePorTipo,

  // 5. Gráfico Temporal (Linha)
  TemporalChart: temporal.vendasPorPeriodo,
};
```

---

## 📈 Métricas de Performance

- **Tempo de resposta**: < 2 segundos
- **Cache recomendado**: 5 minutos para dados não críticos
- **Filtros**: Sempre usar `from` e `to` para grandes volumes
- **Limites**: Usar `limit` para evitar sobrecarga

---

## 🔧 Configuração de Produção

### **Variáveis de Ambiente:**

```bash
# CORS para frontend
CORS_ORIGIN="https://seu-dashboard.com"

# Cache (opcional)
REDIS_CACHE_TTL=300
```

### **Monitoramento:**

- Logs de performance
- Alertas de erro
- Métricas de uso por endpoint

---

## 💡 Próximos Passos

1. **Implementar cache** para melhorar performance
2. **Adicionar autenticação** por shopping center
3. **Criar relatórios em PDF** para exportação
4. **Implementar alertas** para anomalias
5. **Adicionar comparação** entre shopping centers
