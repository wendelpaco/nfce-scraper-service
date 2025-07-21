// src/controllers/dashboardController.ts
import { Request, Response } from "express";
import prisma from "../utils/prisma";
import { logger } from "../utils/logger";

interface NotaJsonData {
  metadata: {
    numero?: unknown;
    serie?: unknown;
    dataEmissao?: unknown;
    protocoloAutorizacao?: unknown;
    nomeEmpresa?: unknown;
    cnpj?: unknown;
    items: any[];
    totals: any;
    cliente?: { cpf?: string; cnpj?: string; nome?: string };
    paymentMethod?: string;
  };
}

// 1. VISÃO GERAL - KPIs principais
export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const notas = await prisma.notaResult.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        jsonData: true,
      },
    });

    let totalVendas = 0;
    let totalNotas = 0;
    let totalItens = 0;
    const clientesSet = new Set<string>();
    const lojasSet = new Set<string>();
    let ticketMedio = 0;

    notas.forEach((nota) => {
      const jsonData = nota.jsonData as unknown as NotaJsonData;
      const meta = jsonData?.metadata;
      if (!meta) return;

      totalNotas++;
      const valor = parseFloat(
        meta.totals?.totalValue?.replace(",", ".") || "0",
      );
      totalVendas += valor;
      totalItens += parseInt(meta.totals?.totalItems || "0");

      // Clientes únicos
      if (meta.cliente?.cpf || meta.cliente?.cnpj) {
        const id = meta.cliente.cpf || meta.cliente.cnpj;
        if (id) clientesSet.add(id);
      }

      // Lojas únicas
      if (meta.nomeEmpresa) {
        lojasSet.add(meta.nomeEmpresa as string);
      }
    });

    ticketMedio = totalNotas > 0 ? totalVendas / totalNotas : 0;

    // Crescimento vs mês anterior
    const mesAtual = new Date().toISOString().slice(0, 7);
    const mesAnterior = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 7);

    const vendasMesAtual = notas
      .filter((n) => n.createdAt.toISOString().slice(0, 7) === mesAtual)
      .reduce((acc, nota) => {
        const jsonData = nota.jsonData as unknown as NotaJsonData;
        const meta = jsonData?.metadata;
        if (!meta) return acc;
        return (
          acc + parseFloat(meta.totals?.totalValue?.replace(",", ".") || "0")
        );
      }, 0);

    const vendasMesAnterior = notas
      .filter((n) => n.createdAt.toISOString().slice(0, 7) === mesAnterior)
      .reduce((acc, nota) => {
        const jsonData = nota.jsonData as unknown as NotaJsonData;
        const meta = jsonData?.metadata;
        if (!meta) return acc;
        return (
          acc + parseFloat(meta.totals?.totalValue?.replace(",", ".") || "0")
        );
      }, 0);

    const crescimento =
      vendasMesAnterior > 0
        ? ((vendasMesAtual - vendasMesAnterior) / vendasMesAnterior) * 100
        : 0;

    res.json({
      totalVendas,
      totalNotas,
      totalItens,
      ticketMedio,
      clientesUnicos: clientesSet.size,
      lojasUnicas: lojasSet.size,
      crescimento,
      vendasMesAtual,
      vendasMesAnterior,
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar visão geral" });
  }
}

// 2. ANÁLISE DE LOJAS - Top lojas por faturamento
export async function getTopLojas(req: Request, res: Response) {
  try {
    const { from, to, limit = 10 } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const notas = await prisma.notaResult.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        jsonData: true,
      },
    });

    const lojasMap: Record<
      string,
      {
        nome: string;
        cnpj: string;
        faturamento: number;
        totalNotas: number;
        ticketMedio: number;
        totalItens: number;
      }
    > = {};

    notas.forEach((nota) => {
      const jsonData = nota.jsonData as unknown as NotaJsonData;
      const meta = jsonData?.metadata;
      if (!meta || !meta.nomeEmpresa) return;

      const nomeLoja = meta.nomeEmpresa as string;
      const cnpj = (meta.cnpj as string) || "N/A";
      const valor = parseFloat(
        meta.totals?.totalValue?.replace(",", ".") || "0",
      );
      const itens = parseInt(meta.totals?.totalItems || "0");

      if (!lojasMap[nomeLoja]) {
        lojasMap[nomeLoja] = {
          nome: nomeLoja,
          cnpj,
          faturamento: 0,
          totalNotas: 0,
          ticketMedio: 0,
          totalItens: 0,
        };
      }

      lojasMap[nomeLoja].faturamento += valor;
      lojasMap[nomeLoja].totalNotas += 1;
      lojasMap[nomeLoja].totalItens += itens;
    });

    // Calcular ticket médio por loja
    Object.values(lojasMap).forEach((loja) => {
      loja.ticketMedio =
        loja.totalNotas > 0 ? loja.faturamento / loja.totalNotas : 0;
    });

    const topLojas = Object.values(lojasMap)
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, parseInt(limit as string));

    res.json({
      topLojas,
      totalLojas: Object.keys(lojasMap).length,
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar análise de lojas" });
  }
}

// 3. ANÁLISE DE PAGAMENTOS - Formas de pagamento mais utilizadas
export async function getAnalisePagamentos(req: Request, res: Response) {
  try {
    const { from, to } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const notas = await prisma.notaResult.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        jsonData: true,
      },
    });

    const pagamentosMap: Record<
      string,
      {
        forma: string;
        total: number;
        quantidade: number;
        percentual: number;
      }
    > = {};

    let totalGeral = 0;

    notas.forEach((nota) => {
      const jsonData = nota.jsonData as unknown as NotaJsonData;
      const meta = jsonData?.metadata;
      if (!meta) return;

      const valor = parseFloat(
        meta.totals?.totalValue?.replace(",", ".") || "0",
      );
      const payment =
        meta.totals?.paymentMethod || meta.paymentMethod || "Desconhecido";

      totalGeral += valor;

      if (!pagamentosMap[payment]) {
        pagamentosMap[payment] = {
          forma: payment,
          total: 0,
          quantidade: 0,
          percentual: 0,
        };
      }

      pagamentosMap[payment].total += valor;
      pagamentosMap[payment].quantidade += 1;
    });

    // Calcular percentuais
    Object.values(pagamentosMap).forEach((pag) => {
      pag.percentual = totalGeral > 0 ? (pag.total / totalGeral) * 100 : 0;
    });

    const formasPagamento = Object.values(pagamentosMap).sort(
      (a, b) => b.total - a.total,
    );

    res.json({
      formasPagamento,
      totalGeral,
      totalTransacoes: notas.length,
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar análise de pagamentos" });
  }
}

// 4. ANÁLISE DE CLIENTES - Perfil do público consumidor
export async function getAnaliseClientes(req: Request, res: Response) {
  try {
    const { from, to, limit = 10 } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const notas = await prisma.notaResult.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        jsonData: true,
      },
    });

    const clientesMap: Record<
      string,
      {
        id: string;
        nome: string;
        tipo: "CPF" | "CNPJ";
        total: number;
        totalCompras: number;
        ticketMedio: number;
        ultimaCompra: Date;
      }
    > = {};

    notas.forEach((nota) => {
      const jsonData = nota.jsonData as unknown as NotaJsonData;
      const meta = jsonData?.metadata;
      if (!meta) return;

      const valor = parseFloat(
        meta.totals?.totalValue?.replace(",", ".") || "0",
      );

      if (meta.cliente?.cpf || meta.cliente?.cnpj) {
        const id = meta.cliente.cpf || meta.cliente.cnpj;
        const tipo = meta.cliente.cpf ? "CPF" : "CNPJ";

        if (id) {
          if (!clientesMap[id]) {
            clientesMap[id] = {
              id,
              nome: meta.cliente.nome || id,
              tipo,
              total: 0,
              totalCompras: 0,
              ticketMedio: 0,
              ultimaCompra: nota.createdAt,
            };
          }

          clientesMap[id].total += valor;
          clientesMap[id].totalCompras += 1;
          clientesMap[id].ultimaCompra =
            nota.createdAt > clientesMap[id].ultimaCompra
              ? nota.createdAt
              : clientesMap[id].ultimaCompra;
        }
      }
    });

    // Calcular ticket médio por cliente
    Object.values(clientesMap).forEach((cliente) => {
      cliente.ticketMedio =
        cliente.totalCompras > 0 ? cliente.total / cliente.totalCompras : 0;
    });

    const topClientes = Object.values(clientesMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, parseInt(limit as string));

    // Análise por tipo de cliente
    const clientesCPF = Object.values(clientesMap).filter(
      (c) => c.tipo === "CPF",
    );
    const clientesCNPJ = Object.values(clientesMap).filter(
      (c) => c.tipo === "CNPJ",
    );

    const totalCPF = clientesCPF.reduce((acc, c) => acc + c.total, 0);
    const totalCNPJ = clientesCNPJ.reduce((acc, c) => acc + c.total, 0);

    res.json({
      topClientes,
      totalClientes: Object.keys(clientesMap).length,
      analisePorTipo: {
        cpf: {
          quantidade: clientesCPF.length,
          faturamento: totalCPF,
          percentual:
            totalCPF + totalCNPJ > 0
              ? (totalCPF / (totalCPF + totalCNPJ)) * 100
              : 0,
        },
        cnpj: {
          quantidade: clientesCNPJ.length,
          faturamento: totalCNPJ,
          percentual:
            totalCPF + totalCNPJ > 0
              ? (totalCNPJ / (totalCPF + totalCNPJ)) * 100
              : 0,
        },
      },
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar análise de clientes" });
  }
}

// 5. ANÁLISE TEMPORAL - Vendas por período
export async function getAnaliseTemporal(req: Request, res: Response) {
  try {
    const { from, to, groupBy = "month" } = req.query;
    const where: any = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from as string);
      if (to) where.createdAt.lte = new Date(to as string);
    }

    const notas = await prisma.notaResult.findMany({
      where,
      select: {
        id: true,
        createdAt: true,
        jsonData: true,
      },
    });

    const vendasPorPeriodo: Record<
      string,
      {
        periodo: string;
        total: number;
        quantidade: number;
        ticketMedio: number;
      }
    > = {};

    notas.forEach((nota) => {
      const jsonData = nota.jsonData as unknown as NotaJsonData;
      const meta = jsonData?.metadata;
      if (!meta) return;

      const valor = parseFloat(
        meta.totals?.totalValue?.replace(",", ".") || "0",
      );

      let periodo: string;
      if (groupBy === "day") {
        periodo = nota.createdAt.toISOString().slice(0, 10); // yyyy-mm-dd
      } else if (groupBy === "week") {
        const weekStart = new Date(nota.createdAt);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        periodo = weekStart.toISOString().slice(0, 10);
      } else {
        periodo = nota.createdAt.toISOString().slice(0, 7); // yyyy-mm
      }

      if (!vendasPorPeriodo[periodo]) {
        vendasPorPeriodo[periodo] = {
          periodo,
          total: 0,
          quantidade: 0,
          ticketMedio: 0,
        };
      }

      vendasPorPeriodo[periodo].total += valor;
      vendasPorPeriodo[periodo].quantidade += 1;
    });

    // Calcular ticket médio por período
    Object.values(vendasPorPeriodo).forEach((periodo) => {
      periodo.ticketMedio =
        periodo.quantidade > 0 ? periodo.total / periodo.quantidade : 0;
    });

    const vendasOrdenadas = Object.values(vendasPorPeriodo).sort((a, b) =>
      a.periodo.localeCompare(b.periodo),
    );

    res.json({
      vendasPorPeriodo: vendasOrdenadas,
      totalPeriodos: vendasOrdenadas.length,
      groupBy,
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar análise temporal" });
  }
}
