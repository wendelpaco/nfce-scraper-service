// src/controllers/statsController.ts
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

export async function getStats(req: Request, res: Response) {
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
    const produtosMap: Record<string, any> = {};
    const vendasPorMes: Record<string, number> = {};
    const categoriasMap: Record<
      string,
      { faturamento: number; quantidade: number }
    > = {};
    const clientesSet = new Set<string>();
    const clientesMap: Record<string, { nome: string; total: number }> = {};
    const pagamentosMap: Record<string, number> = {};
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

      // Produtos
      (meta.items || []).forEach((item: any) => {
        const code = item.code;
        if (!produtosMap[code]) {
          produtosMap[code] = {
            code,
            title: item.title,
            totalVendido: 0,
            faturamento: 0,
            unit: item.unit,
            categoria: item.category || "Outros",
            preco: parseFloat(item.unitPrice?.replace(",", ".") || "0"),
          };
        }
        produtosMap[code].totalVendido += parseFloat(
          item.quantity.replace(",", ".") || 0,
        );
        produtosMap[code].faturamento += parseFloat(
          item.totalPrice.replace(",", ".") || 0,
        );

        // Categoria
        const categoria = item.category || "Outros";
        if (!categoriasMap[categoria]) {
          categoriasMap[categoria] = { faturamento: 0, quantidade: 0 };
        }
        categoriasMap[categoria].faturamento += parseFloat(
          item.totalPrice.replace(",", ".") || 0,
        );
        categoriasMap[categoria].quantidade += parseFloat(
          item.quantity.replace(",", ".") || 0,
        );
      });

      // Vendas por mês
      if (nota.createdAt) {
        const mes = nota.createdAt.toISOString().slice(0, 7); // yyyy-mm
        vendasPorMes[mes] = (vendasPorMes[mes] || 0) + valor;
      }

      // Clientes únicos (por CNPJ/CPF)
      if (meta.cliente?.cpf || meta.cliente?.cnpj) {
        const id = meta.cliente.cpf || meta.cliente.cnpj;
        if (id) {
          clientesSet.add(id);
          if (!clientesMap[id]) {
            clientesMap[id] = { nome: meta.cliente.nome || id, total: 0 };
          }
          clientesMap[id].total += valor;
        }
      }

      // Formas de pagamento
      const payment =
        meta.totals?.paymentMethod || meta.paymentMethod || "Desconhecido";
      pagamentosMap[payment] = (pagamentosMap[payment] || 0) + valor;
    });

    ticketMedio = totalNotas > 0 ? totalVendas / totalNotas : 0;

    // Top produtos
    const produtosTop = Object.values(produtosMap)
      .sort((a: any, b: any) => b.faturamento - a.faturamento)
      .slice(0, 10);

    // Vendas por mês (array)
    const vendasPorMesArr = Object.entries(vendasPorMes).map(
      ([mes, total]) => ({ mes, total }),
    );

    // Projeção mensal (simples: média dos últimos 3 meses)
    const ultimosMeses = vendasPorMesArr.slice(-3).map((v) => v.total);
    const projecaoMensal =
      ultimosMeses.length > 0
        ? ultimosMeses.reduce((a, b) => a + b, 0) / ultimosMeses.length
        : 0;

    // Análise por categoria
    const totalFaturamentoCategorias = Object.values(categoriasMap).reduce(
      (a, b) => a + b.faturamento,
      0,
    );
    const categorias = Object.entries(categoriasMap)
      .map(([categoria, dados]) => ({
        categoria,
        faturamento: dados.faturamento,
        quantidade: dados.quantidade,
        percentual:
          totalFaturamentoCategorias > 0
            ? (dados.faturamento / totalFaturamentoCategorias) * 100
            : 0,
      }))
      .sort((a, b) => b.faturamento - a.faturamento);

    // Top clientes
    const topClientes = Object.entries(clientesMap)
      .map(([id, c]) => ({ id, nome: c.nome, total: c.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // Top formas de pagamento
    const formasPagamento = Object.entries(pagamentosMap)
      .map(([forma, total]) => ({ forma, total }))
      .sort((a, b) => b.total - a.total);

    // Taxa de crescimento mês a mês
    let crescimento = 0;
    if (vendasPorMesArr.length > 1) {
      const penultimo = vendasPorMesArr[vendasPorMesArr.length - 2].total;
      const ultimo = vendasPorMesArr[vendasPorMesArr.length - 1].total;
      crescimento =
        penultimo > 0 ? ((ultimo - penultimo) / penultimo) * 100 : 0;
    }

    // Taxa de conversão e retenção: depende do seu modelo de negócio!
    // Exemplo fictício:
    const taxaConversao = 0.685; // 68.5%
    const retencao = 0.852; // 85.2%

    res.json({
      totalVendas,
      totalNotas,
      totalItens,
      ticketMedio,
      produtosTop,
      vendasPorMes: vendasPorMesArr,
      projecaoMensal,
      categorias,
      taxaConversao,
      retencao,
      clientesUnicos: clientesSet.size,
      topClientes,
      formasPagamento,
      crescimento,
    });
  } catch (err) {
    logger.error(String(err));
    res.status(500).json({ error: "Erro ao gerar estatísticas" });
  }
}
