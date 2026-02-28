import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get("format") || "xlsx";
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (!from || !to) {
      return NextResponse.json(
        { error: "Parámetros 'from' y 'to' requeridos" },
        { status: 400 }
      );
    }

    const dateFrom = new Date(from);
    dateFrom.setHours(0, 0, 0, 0);
    const dateTo = new Date(to);
    dateTo.setHours(23, 59, 59, 999);

    // Query same data as /api/reports
    const [sales, expenses, advances] = await Promise.all([
      prisma.sale.findMany({
        where: {
          saleDate: { gte: dateFrom, lte: dateTo },
          status: { not: "cancelled" },
        },
        include: {
          items: { include: { cut: true } },
          itemProducts: { include: { product: true } },
          payments: { include: { paymentMethod: true } },
        },
        orderBy: { saleDate: "asc" },
      }),
      prisma.expense.aggregate({
        where: { date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      }),
      prisma.employeeAdvance.aggregate({
        where: { date: { gte: dateFrom, lte: dateTo } },
        _sum: { amount: true },
      }),
    ]);

    // Compute metrics
    const totalSales = sales.reduce((s, sale) => s + Number(sale.total), 0);
    const totalTransactions = sales.length;
    const avgTicket =
      totalTransactions > 0 ? totalSales / totalTransactions : 0;
    const totalExpenses = Number(expenses._sum.amount || 0);
    const totalAdvances = Number(advances._sum.amount || 0);
    const netIncome = totalSales - totalExpenses - totalAdvances;

    // Payment methods
    const byPaymentMethod: Record<string, number> = {};
    for (const sale of sales) {
      for (const p of sale.payments) {
        const name = p.paymentMethod.name;
        byPaymentMethod[name] = (byPaymentMethod[name] || 0) + Number(p.amount);
      }
    }

    // Daily sales
    const dailySales: Record<string, { date: string; total: number; count: number }> = {};
    for (const sale of sales) {
      const day = new Date(sale.saleDate).toISOString().slice(0, 10);
      if (!dailySales[day]) dailySales[day] = { date: day, total: 0, count: 0 };
      dailySales[day].total += Number(sale.total);
      dailySales[day].count += 1;
    }
    const dailyData = Object.values(dailySales).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Top cuts
    const cutSales: Record<string, { name: string; kg: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.items) {
        const key = item.cutId;
        if (!cutSales[key]) cutSales[key] = { name: item.cut.name, kg: 0, revenue: 0 };
        cutSales[key].kg += Number(item.quantityKg);
        cutSales[key].revenue += Number(item.quantityKg) * Number(item.pricePerKg);
      }
    }
    const topCuts = Object.values(cutSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 15);

    // Top products
    const productSales: Record<string, { name: string; qty: number; revenue: number }> = {};
    for (const sale of sales) {
      for (const item of sale.itemProducts) {
        const key = item.productId;
        if (!productSales[key])
          productSales[key] = { name: item.product.name, qty: 0, revenue: 0 };
        productSales[key].qty += Number(item.quantity);
        productSales[key].revenue +=
          Number(item.quantity) * Number(item.pricePerUnit);
      }
    }
    const topProducts = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    if (format === "xlsx") {
      return await generateExcel({
        from,
        to,
        totalSales,
        totalTransactions,
        avgTicket,
        totalExpenses,
        totalAdvances,
        netIncome,
        byPaymentMethod,
        dailyData,
        topCuts,
        topProducts,
      });
    } else {
      return generatePDF({
        from,
        to,
        totalSales,
        totalTransactions,
        avgTicket,
        totalExpenses,
        totalAdvances,
        netIncome,
        byPaymentMethod,
        dailyData,
        topCuts,
        topProducts,
      });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Error";
    console.error("Export error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function fmt(n: number): string {
  return `$${Math.round(n).toLocaleString("es-AR")}`;
}

interface ReportPayload {
  from: string;
  to: string;
  totalSales: number;
  totalTransactions: number;
  avgTicket: number;
  totalExpenses: number;
  totalAdvances: number;
  netIncome: number;
  byPaymentMethod: Record<string, number>;
  dailyData: { date: string; total: number; count: number }[];
  topCuts: { name: string; kg: number; revenue: number }[];
  topProducts: { name: string; qty: number; revenue: number }[];
}

async function generateExcel(data: ReportPayload) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Secretos De Campo";

  // Sheet 1: Resumen
  const ws1 = wb.addWorksheet("Resumen");
  ws1.columns = [
    { header: "Indicador", key: "label", width: 25 },
    { header: "Valor", key: "value", width: 20 },
  ];
  ws1.addRow({ label: "Período", value: `${data.from} a ${data.to}` });
  ws1.addRow({ label: "Ventas Totales", value: data.totalSales });
  ws1.addRow({ label: "Transacciones", value: data.totalTransactions });
  ws1.addRow({ label: "Ticket Promedio", value: data.avgTicket });
  ws1.addRow({ label: "Gastos", value: data.totalExpenses });
  ws1.addRow({ label: "Adelantos", value: data.totalAdvances });
  ws1.addRow({ label: "Ingreso Neto", value: data.netIncome });

  // Format currency cells
  for (let i = 3; i <= 8; i++) {
    const cell = ws1.getCell(`B${i}`);
    if (i !== 4) cell.numFmt = '"$"#,##0';
  }

  // Sheet 2: Ventas por Día
  const ws2 = wb.addWorksheet("Ventas por Día");
  ws2.columns = [
    { header: "Fecha", key: "date", width: 15 },
    { header: "Total", key: "total", width: 18 },
    { header: "Transacciones", key: "count", width: 15 },
  ];
  for (const d of data.dailyData) {
    const row = ws2.addRow(d);
    row.getCell("total").numFmt = '"$"#,##0';
  }

  // Sheet 3: Métodos de Pago
  const ws3 = wb.addWorksheet("Métodos de Pago");
  ws3.columns = [
    { header: "Método", key: "method", width: 20 },
    { header: "Monto", key: "amount", width: 18 },
    { header: "%", key: "pct", width: 10 },
  ];
  for (const [method, amount] of Object.entries(data.byPaymentMethod)) {
    const pct = data.totalSales > 0 ? (amount / data.totalSales) * 100 : 0;
    const row = ws3.addRow({ method, amount, pct: Math.round(pct * 10) / 10 });
    row.getCell("amount").numFmt = '"$"#,##0';
  }

  // Sheet 4: Top Cortes
  const ws4 = wb.addWorksheet("Top Cortes");
  ws4.columns = [
    { header: "Corte", key: "name", width: 25 },
    { header: "Kg", key: "kg", width: 12 },
    { header: "Ingresos", key: "revenue", width: 18 },
  ];
  for (const c of data.topCuts) {
    const row = ws4.addRow({ name: c.name, kg: Math.round(c.kg * 10) / 10, revenue: Math.round(c.revenue) });
    row.getCell("revenue").numFmt = '"$"#,##0';
  }

  // Sheet 5: Top Productos
  const ws5 = wb.addWorksheet("Top Productos");
  ws5.columns = [
    { header: "Producto", key: "name", width: 25 },
    { header: "Cantidad", key: "qty", width: 12 },
    { header: "Ingresos", key: "revenue", width: 18 },
  ];
  for (const p of data.topProducts) {
    const row = ws5.addRow({ name: p.name, qty: Math.round(p.qty * 10) / 10, revenue: Math.round(p.revenue) });
    row.getCell("revenue").numFmt = '"$"#,##0';
  }

  // Style headers on all sheets
  for (const ws of [ws1, ws2, ws3, ws4, ws5]) {
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF92400E" } };
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  }

  const buffer = await wb.xlsx.writeBuffer();
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="reporte-${data.from}-a-${data.to}.xlsx"`,
    },
  });
}

function generatePDF(data: ReportPayload) {
  const doc = new jsPDF();

  // Header
  doc.setFontSize(18);
  doc.text("Secretos De Campo", 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Reporte de ventas: ${data.from} a ${data.to}`, 14, 28);

  // KPIs
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Resumen", 14, 40);

  autoTable(doc, {
    startY: 45,
    head: [["Indicador", "Valor"]],
    body: [
      ["Ventas Totales", fmt(data.totalSales)],
      ["Transacciones", data.totalTransactions.toString()],
      ["Ticket Promedio", fmt(data.avgTicket)],
      ["Gastos", fmt(data.totalExpenses)],
      ["Adelantos", fmt(data.totalAdvances)],
      ["Ingreso Neto", fmt(data.netIncome)],
    ],
    theme: "striped",
    headStyles: { fillColor: [146, 64, 14] },
  });

  // Daily sales table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y1 = (doc as any).lastAutoTable?.finalY || 90;
  doc.text("Ventas por Día", 14, y1 + 10);

  autoTable(doc, {
    startY: y1 + 15,
    head: [["Fecha", "Total", "Transacciones"]],
    body: data.dailyData.map((d) => [d.date, fmt(d.total), d.count.toString()]),
    theme: "striped",
    headStyles: { fillColor: [146, 64, 14] },
  });

  // Top cuts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const y2 = (doc as any).lastAutoTable?.finalY || 150;
  if (y2 > 240) doc.addPage();
  const y3 = y2 > 240 ? 20 : y2 + 10;
  doc.text("Top Cortes", 14, y3);

  autoTable(doc, {
    startY: y3 + 5,
    head: [["Corte", "Kg", "Ingresos"]],
    body: data.topCuts.map((c) => [
      c.name,
      (Math.round(c.kg * 10) / 10).toString(),
      fmt(Math.round(c.revenue)),
    ]),
    theme: "striped",
    headStyles: { fillColor: [146, 64, 14] },
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `Secretos De Campo — Generado el ${new Date().toLocaleDateString("es-AR")}`,
      14,
      doc.internal.pageSize.height - 10
    );
  }

  const pdfBuffer = doc.output("arraybuffer");
  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-${data.from}-a-${data.to}.pdf"`,
    },
  });
}
