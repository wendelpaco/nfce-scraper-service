# 🧾 Prompt para Frontend - Visualizador de NFC-e

## Contexto

Crie um frontend moderno e responsivo para visualizar dados de Notas Fiscais de Consumidor Eletrônica (NFC-e). O sistema consome uma API REST que retorna dados estruturados de notas fiscais processadas.

## API Endpoint

```
GET /queue/{jobId}
```

## Estrutura de Dados Retornada

```json
{
  "status": "DONE",
  "id": "354e6257-45db-491b-a6a5-9f6384aa174e",
  "url": "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode?p=...",
  "webhookUrl": null,
  "createdAt": "2025-07-10T22:34:42.551Z",
  "urlQueueId": "bd608a1b-3f2b-4bf4-a94e-f49ecd30f82a",
  "processingStartedAt": "2025-07-10T22:34:34.175Z",
  "processingEndedAt": "2025-07-10T22:34:42.569Z",
  "processingDurationMs": 8394,
  "metadata": {
    "numero": "20439",
    "serie": "3",
    "dataEmissao": "13/06/2025 09:28:06-03:00",
    "protocoloAutorizacao": "233251387722233",
    "nomeEmpresa": "SUPERMERCADO ZONASUL SA F1020",
    "cnpj": "33.381.286/0056-25",
    "items": [
      {
        "code": "4171",
        "unit": "KG",
        "title": "CAFE MANHA ZS KG",
        "quantity": "0.435",
        "unitPrice": "73,9",
        "totalPrice": "32,15"
      }
    ],
    "totals": {
      "discount": "1,67",
      "totalItems": "4",
      "totalValue": "73,71",
      "amountToPay": "72,04",
      "paymentAmount": "72,04",
      "paymentMethod": "Cartão de Crédito"
    }
  }
}
```

## Requisitos do Frontend

### 1. Interface Principal

- **Campo de busca**: Input para inserir o ID do job
- **Botão de consulta**: Para buscar os dados da nota
- **Indicador de loading**: Durante a requisição
- **Tratamento de erros**: Para jobs não encontrados ou em processamento

### 2. Layout da Nota Fiscal

- **Cabeçalho**: Estilo de nota fiscal oficial
- **Informações da empresa**: Nome, CNPJ, número da nota, série
- **Dados da transação**: Data/hora, protocolo de autorização
- **Tabela de itens**: Lista organizada dos produtos/serviços
- **Resumo financeiro**: Totais, descontos, forma de pagamento
- **Métricas de processamento**: Tempo de processamento

### 3. Componentes Específicos

#### Cabeçalho da Nota

```
┌─────────────────────────────────────────────────────────┐
│                    NFC-e                               │
│  Número: 20439 | Série: 3 | Data: 13/06/2025 09:28   │
│  Protocolo: 233251387722233                           │
│  SUPERMERCADO ZONASUL SA F1020                        │
│  CNPJ: 33.381.286/0056-25                             │
└─────────────────────────────────────────────────────────┘
```

#### Tabela de Itens

```
┌─────┬──────────────┬─────────┬──────────┬──────────┬──────────┐
│ Cód │ Produto      │ Qtd     │ Un       │ V. Unit  │ Total    │
├─────┼──────────────┼─────────┼──────────┼──────────┼──────────┤
│4171 │ CAFE MANHA   │ 0.435   │ KG       │ R$ 73,90 │ R$ 32,15│
│     │ ZS KG        │         │          │          │          │
└─────┴──────────────┴─────────┴──────────┴──────────┴──────────┘
```

#### Resumo Financeiro

```
┌─────────────────────────────────────────────────────────┐
│                    RESUMO                              │
│  Total de Itens: 4                                    │
│  Subtotal: R$ 73,71                                  │
│  Desconto: R$ 1,67                                   │
│  Total a Pagar: R$ 72,04                             │
│  Forma de Pagamento: Cartão de Crédito               │
└─────────────────────────────────────────────────────────┘
```

### 4. Estados da Interface

- **Estado inicial**: Campo de busca vazio
- **Loading**: Spinner durante requisição
- **Sucesso**: Exibição completa da nota
- **Erro**: Mensagem de erro amigável
- **Job em processamento**: Indicador de status

### 5. Funcionalidades Adicionais

- **Responsividade**: Funcionar em mobile/tablet
- **Impressão**: Botão para imprimir a nota
- **Exportação**: Download em PDF
- **Histórico**: Lista de consultas recentes
- **Compartilhamento**: Link direto para a nota

### 6. Tecnologias Sugeridas

- **Framework**: React, Vue.js ou Angular
- **Styling**: Tailwind CSS, Material-UI ou Bootstrap
- **Estado**: Redux, Zustand ou Context API
- **HTTP**: Axios ou Fetch API
- **Formatação**: date-fns, numeral.js

### 7. Design System

- **Cores**: Verde fiscal (#006400), cinza (#666), branco
- **Tipografia**: Fonte monospace para dados numéricos
- **Layout**: Grid system responsivo
- **Ícones**: Ícones de impressora, download, compartilhar

### 8. Tratamento de Erros

```javascript
// Estados de erro
-"Job não encontrado" -
  "Job ainda em processamento" -
  "Erro na requisição" -
  "Job falhou no processamento";
```

### 9. Validações

- **ID do job**: Formato UUID válido
- **Campos obrigatórios**: Verificar se metadata existe
- **Dados numéricos**: Formatação de moeda brasileira

### 10. Performance

- **Lazy loading**: Carregar dados sob demanda
- **Cache**: Armazenar consultas recentes
- **Debounce**: Evitar múltiplas requisições

## Exemplo de Uso

1. Usuário insere ID do job: `bd608a1b-3f2b-4bf4-a94e-f49ecd30f82a`
2. Sistema faz requisição para `/queue/bd608a1b-3f2b-4bf4-a94e-f49ecd30f82a`
3. Exibe nota fiscal formatada com todos os dados
4. Permite impressão/exportação dos dados

## Resultado Esperado

Uma interface web moderna, responsiva e intuitiva que transforma dados JSON brutos em uma visualização profissional de nota fiscal, similar aos sistemas oficiais dos governos estaduais.

---

**Este prompt fornece todas as especificações necessárias para criar um frontend completo e profissional para visualização de notas fiscais.**
