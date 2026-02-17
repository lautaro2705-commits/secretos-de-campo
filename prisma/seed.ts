import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🥩 Seeding Secretos De Campo...");

  // --- Categorías de Animal ---
  const vaquillona = await prisma.animalCategory.upsert({
    where: { name: "Vaquillona" },
    update: {},
    create: { name: "Vaquillona", description: "Hembra joven, carne tierna y sabrosa." },
  });
  const novillo = await prisma.animalCategory.upsert({
    where: { name: "Novillo" },
    update: {},
    create: { name: "Novillo", description: "Macho castrado joven. Buen rendimiento." },
  });
  await prisma.animalCategory.upsert({
    where: { name: "Overo" },
    update: {},
    create: { name: "Overo", description: "Animal con manchas. Carne de menor categoría." },
  });
  console.log("  ✓ Categorías de animal");

  // --- Rangos de Peso ---
  const range80 = await prisma.weightRange.upsert({
    where: { label: "80-105 kg" },
    update: {},
    create: { minWeight: 80, maxWeight: 105, label: "80-105 kg" },
  });
  await prisma.weightRange.upsert({
    where: { label: "106-115 kg" },
    update: {},
    create: { minWeight: 106, maxWeight: 115, label: "106-115 kg" },
  });
  await prisma.weightRange.upsert({
    where: { label: "116-140 kg" },
    update: {},
    create: { minWeight: 116, maxWeight: 140, label: "116-140 kg" },
  });
  console.log("  ✓ Rangos de peso");

  // --- 25 Cortes reales (catálogo Secretos De Campo) ---
  // Todos bajo "Carne de Vaca"
  const cutsData = [
    // === PREMIUM ===
    { name: "Lomo", description: "Corte premium, muy tierno", cutCategory: "premium", isSellable: true, displayOrder: 1 },
    { name: "Ojo de Bife", description: "Bife ancho sin hueso, jugoso", cutCategory: "premium", isSellable: true, displayOrder: 2 },
    { name: "Bife de Chorizo", description: "Corte clásico premium para parrilla", cutCategory: "premium", isSellable: true, displayOrder: 3 },
    { name: "Cuadril", description: "Corte magro y versátil", cutCategory: "premium", isSellable: true, displayOrder: 4 },
    { name: "Colita de Cuadril", description: "Pieza chica, muy tierna", cutCategory: "premium", isSellable: true, displayOrder: 5 },
    { name: "Picaña", description: "Corte brasileño premium, con capa de grasa", cutCategory: "premium", isSellable: true, displayOrder: 6 },
    { name: "Peceto", description: "Ideal para horno, muy magro", cutCategory: "premium", isSellable: true, displayOrder: 7 },
    { name: "Entraña Fina", description: "Corte de entraña, sabor intenso", cutCategory: "premium", isSellable: true, displayOrder: 8 },
    { name: "Entrecot Especial", description: "Bife premium con veteado", cutCategory: "premium", isSellable: true, displayOrder: 9 },
    // === PARRILLA ===
    { name: "Costilla", description: "Costilla para parrilla/asado", cutCategory: "parrilla", isSellable: true, displayOrder: 10 },
    { name: "Costeleta", description: "Costilla con lomo, para parrilla", cutCategory: "parrilla", isSellable: true, displayOrder: 11 },
    { name: "Vacío", description: "Con grasa superficial, muy sabroso", cutCategory: "parrilla", isSellable: true, displayOrder: 12 },
    { name: "Matambre", description: "Lámina de carne sobre costillas", cutCategory: "parrilla", isSellable: true, displayOrder: 13 },
    { name: "Tapa de Asado", description: "Cubre las costillas, jugosa", cutCategory: "parrilla", isSellable: true, displayOrder: 14 },
    { name: "Falda", description: "Corte con grasa, ideal parrilla", cutCategory: "parrilla", isSellable: true, displayOrder: 15 },
    // === GUISO / MILANESAS / HORNO ===
    { name: "Nalga", description: "Para milanesas y bifes", cutCategory: "guiso", isSellable: true, displayOrder: 16 },
    { name: "Tapa de Nalga", description: "Corte magro, para milanesas", cutCategory: "guiso", isSellable: true, displayOrder: 17 },
    { name: "Bola de Lomo", description: "Para milanesas, tierna", cutCategory: "guiso", isSellable: true, displayOrder: 18 },
    { name: "Jamón Cuadrado", description: "Corte del cuarto trasero, para horno", cutCategory: "guiso", isSellable: true, displayOrder: 19 },
    { name: "Tortuguita", description: "Corte magro del cuarto trasero", cutCategory: "guiso", isSellable: true, displayOrder: 20 },
    { name: "Palomita", description: "Pieza chica, tierna, para milanesas", cutCategory: "guiso", isSellable: true, displayOrder: 21 },
    { name: "Bocado Fino", description: "Corte de la paleta, tierno", cutCategory: "guiso", isSellable: true, displayOrder: 22 },
    { name: "Bocado Ancho", description: "Corte de la paleta, para guiso/horno", cutCategory: "guiso", isSellable: true, displayOrder: 23 },
    { name: "Aguja Parrillera", description: "Corte de la paleta con hueso", cutCategory: "parrilla", isSellable: true, displayOrder: 24 },
    { name: "Osobuco", description: "Corte con hueso, ideal para guiso", cutCategory: "guiso", isSellable: true, displayOrder: 25 },
    // === SUBPRODUCTOS ===
    { name: "Hueso", description: "Huesos varios del desposte", cutCategory: "subproducto", isSellable: false, displayOrder: 26 },
    { name: "Grasa y Recortes", description: "Grasa, nervios y recortes", cutCategory: "subproducto", isSellable: false, displayOrder: 27 },
  ];

  const cuts: Record<string, string> = {};
  for (const c of cutsData) {
    const cut = await prisma.cut.upsert({
      where: { name: c.name },
      update: { description: c.description, cutCategory: c.cutCategory, displayOrder: c.displayOrder },
      create: c,
    });
    cuts[c.name] = cut.id;
  }
  console.log("  ✓ 25 cortes de carne de vaca + 2 subproductos");

  // --- Plantilla: Vaquillona 80-105kg ---
  // Porcentajes estimados para los 27 ítems (suman 100%)
  // Los porcentajes se redistribuyeron de los 15 originales a los 25+2 cortes
  const templateItems = [
    // PREMIUM (total ~22%)
    { name: "Lomo", pct: 2.80 },
    { name: "Ojo de Bife", pct: 3.20 },
    { name: "Bife de Chorizo", pct: 3.50 },
    { name: "Cuadril", pct: 3.50 },
    { name: "Colita de Cuadril", pct: 1.20 },
    { name: "Picaña", pct: 1.50 },
    { name: "Peceto", pct: 2.50 },
    { name: "Entraña Fina", pct: 1.80 },
    { name: "Entrecot Especial", pct: 2.00 },
    // PARRILLA (total ~30%)
    { name: "Costilla", pct: 8.00 },
    { name: "Costeleta", pct: 4.00 },
    { name: "Vacío", pct: 4.50 },
    { name: "Matambre", pct: 3.50 },
    { name: "Tapa de Asado", pct: 3.00 },
    { name: "Falda", pct: 3.50 },
    { name: "Aguja Parrillera", pct: 3.50 },
    // GUISO (total ~20%)
    { name: "Nalga", pct: 4.00 },
    { name: "Tapa de Nalga", pct: 2.00 },
    { name: "Bola de Lomo", pct: 3.00 },
    { name: "Jamón Cuadrado", pct: 2.50 },
    { name: "Tortuguita", pct: 2.00 },
    { name: "Palomita", pct: 1.50 },
    { name: "Bocado Fino", pct: 1.50 },
    { name: "Bocado Ancho", pct: 1.50 },
    { name: "Osobuco", pct: 2.00 },
    // SUBPRODUCTOS (total ~28%)
    { name: "Hueso", pct: 16.00 },
    { name: "Grasa y Recortes", pct: 12.00 },
  ];

  // Verificar que suman 100
  const totalPct = templateItems.reduce((s, i) => s + i.pct, 0);
  console.log(`  → Verificando porcentajes: ${totalPct.toFixed(2)}%`);

  // Limpiar plantillas viejas y crear nueva
  await prisma.yieldTemplateItem.deleteMany({});
  await prisma.yieldTemplate.deleteMany({});

  const template = await prisma.yieldTemplate.create({
    data: {
      categoryId: vaquillona.id,
      rangeId: range80.id,
      name: "Vaquillona Liviana - Desposte Estándar",
      referenceWeight: 100,
      notes: "Plantilla base con 25 cortes reales del catálogo.",
      status: "active",
      items: {
        create: templateItems.map((i) => ({
          cutId: cuts[i.name],
          percentageYield: i.pct,
        })),
      },
    },
  });
  console.log("  ✓ Plantilla Vaquillona 80-105kg (27 ítems)");

  // --- Proveedores ---
  await prisma.supplier.upsert({
    where: { cuit: "30-71234567-0" },
    update: {},
    create: {
      name: "Frigorífico Don Pedro",
      razonSocial: "Don Pedro S.A.",
      cuit: "30-71234567-0",
      phone: "011-4555-1234",
      email: "ventas@donpedro.com.ar",
      address: "Ruta 3 Km 45, Cañuelas, Buenos Aires",
    },
  });
  await prisma.supplier.upsert({
    where: { cuit: "30-71234568-0" },
    update: {},
    create: {
      name: "Frigorífico La Pampa",
      razonSocial: "La Pampa Carnes S.R.L.",
      cuit: "30-71234568-0",
      phone: "011-4555-5678",
      email: "pedidos@lapampacarnes.com.ar",
      address: "Parque Industrial, General Pico, La Pampa",
    },
  });
  console.log("  ✓ 2 proveedores");

  // --- Clientes ---
  const existingCustomers = await prisma.customer.count();
  if (existingCustomers === 0) {
    await prisma.customer.createMany({
      data: [
        { name: "Juan Pérez", phone: "11-2345-6789", dni: "28.456.789", creditLimit: 50000 },
        { name: "María García", phone: "11-3456-7890", dni: "32.567.890", creditLimit: 30000 },
        { name: "Carlos López", phone: "11-4567-8901", dni: "25.678.901", creditLimit: 75000 },
      ],
    });
  }
  console.log("  ✓ 3 clientes");

  // --- Métodos de Pago ---
  for (const pm of [
    { name: "Efectivo", surchargePercentage: 0 },
    { name: "Débito", surchargePercentage: 0 },
    { name: "MercadoPago", surchargePercentage: 3.5 },
    { name: "Crédito", surchargePercentage: 8 },
  ]) {
    await prisma.paymentMethod.upsert({
      where: { name: pm.name },
      update: {},
      create: pm,
    });
  }
  console.log("  ✓ 4 métodos de pago");

  // --- Lista de Precios ---
  let priceList = await prisma.priceList.findFirst({ where: { isActive: true } });
  if (!priceList) {
    priceList = await prisma.priceList.create({
      data: {
        name: "Lista General Febrero 2026",
        description: "Precios vigentes para mostrador",
        isActive: true,
        validFrom: new Date("2026-02-01"),
      },
    });
  }

  // Precios por corte [costo, venta] en ARS/kg
  const pricesData: Record<string, [number, number]> = {
    "Lomo":               [12500, 18500],
    "Ojo de Bife":        [9000, 13500],
    "Bife de Chorizo":    [9000, 13500],
    "Cuadril":            [7500, 11200],
    "Colita de Cuadril":  [8500, 12800],
    "Picaña":             [9500, 14200],
    "Peceto":             [8000, 12000],
    "Entraña Fina":       [8500, 12800],
    "Entrecot Especial":  [8000, 12000],
    "Costilla":           [4500, 6900],
    "Costeleta":          [5500, 8200],
    "Vacío":              [6500, 9800],
    "Matambre":           [5500, 8200],
    "Tapa de Asado":      [4000, 5900],
    "Falda":              [3000, 4500],
    "Aguja Parrillera":   [3500, 5200],
    "Nalga":              [5000, 7500],
    "Tapa de Nalga":      [5000, 7500],
    "Bola de Lomo":       [5500, 8000],
    "Jamón Cuadrado":     [5000, 7500],
    "Tortuguita":         [5000, 7500],
    "Palomita":           [5500, 8200],
    "Bocado Fino":        [5500, 8200],
    "Bocado Ancho":       [5000, 7500],
    "Osobuco":            [3000, 4500],
    "Hueso":              [500, 800],
    "Grasa y Recortes":   [300, 500],
  };

  for (const [cutName, [cost, sell]] of Object.entries(pricesData)) {
    if (!cuts[cutName]) continue;
    await prisma.price.upsert({
      where: {
        priceListId_cutId: { priceListId: priceList.id, cutId: cuts[cutName] },
      },
      update: { costPerKg: cost, sellPricePerKg: sell },
      create: {
        priceListId: priceList.id,
        cutId: cuts[cutName],
        costPerKg: cost,
        sellPricePerKg: sell,
      },
    });
  }
  console.log("  ✓ Lista de precios con 27 cortes");

  // --- Inventario inicial (0 kg, con alertas) ---
  for (const c of cutsData) {
    const minAlert = c.cutCategory === "premium" ? 3 : c.cutCategory === "subproducto" ? 0 : 5;
    await prisma.inventory.upsert({
      where: { cutId: cuts[c.name] },
      update: {},
      create: {
        cutId: cuts[c.name],
        currentQty: 0,
        minStockAlert: minAlert,
      },
    });
  }
  console.log("  ✓ Inventario inicial (todo en 0 kg)");

  console.log("\n✅ Seed completado exitosamente!");
}

main()
  .catch((e) => {
    console.error("❌ Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
