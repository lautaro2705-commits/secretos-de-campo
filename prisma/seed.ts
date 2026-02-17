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
  const range80 = await prisma.weightRange.create({
    data: { minWeight: 80, maxWeight: 105, label: "80-105 kg" },
  });
  const range106 = await prisma.weightRange.create({
    data: { minWeight: 106, maxWeight: 115, label: "106-115 kg" },
  });
  await prisma.weightRange.create({
    data: { minWeight: 116, maxWeight: 140, label: "116-140 kg" },
  });
  console.log("  ✓ Rangos de peso");

  // --- Cortes ---
  const cutsData = [
    { name: "Lomo", description: "Corte premium, muy tierno", cutCategory: "premium", isSellable: true, displayOrder: 1 },
    { name: "Bife Ancho", description: "Ojo de bife con hueso", cutCategory: "premium", isSellable: true, displayOrder: 2 },
    { name: "Bife Angosto", description: "Corte fino para parrilla", cutCategory: "premium", isSellable: true, displayOrder: 3 },
    { name: "Cuadril", description: "Corte magro y versátil", cutCategory: "premium", isSellable: true, displayOrder: 4 },
    { name: "Peceto", description: "Ideal para horno, muy magro", cutCategory: "premium", isSellable: true, displayOrder: 5 },
    { name: "Asado", description: "Tira de asado, el clásico argentino", cutCategory: "parrilla", isSellable: true, displayOrder: 6 },
    { name: "Vacío", description: "Con grasa superficial, muy sabroso", cutCategory: "parrilla", isSellable: true, displayOrder: 7 },
    { name: "Matambre", description: "Lámina de carne sobre costillas", cutCategory: "parrilla", isSellable: true, displayOrder: 8 },
    { name: "Tapa de Asado", description: "Cubre las costillas, jugosa", cutCategory: "parrilla", isSellable: true, displayOrder: 9 },
    { name: "Falda", description: "Corte con grasa, ideal parrilla", cutCategory: "parrilla", isSellable: true, displayOrder: 10 },
    { name: "Nalga", description: "Para milanesas y bifes", cutCategory: "guiso", isSellable: true, displayOrder: 11 },
    { name: "Bola de Lomo", description: "Para milanesas, tierna", cutCategory: "guiso", isSellable: true, displayOrder: 12 },
    { name: "Paleta", description: "Corte económico, para guiso/horno", cutCategory: "guiso", isSellable: true, displayOrder: 13 },
    { name: "Hueso", description: "Huesos varios del desposte", cutCategory: "subproducto", isSellable: false, displayOrder: 14 },
    { name: "Grasa y Recortes", description: "Grasa, nervios y recortes", cutCategory: "subproducto", isSellable: false, displayOrder: 15 },
  ];

  const cuts: Record<string, string> = {};
  for (const c of cutsData) {
    const cut = await prisma.cut.upsert({
      where: { name: c.name },
      update: {},
      create: c,
    });
    cuts[c.name] = cut.id;
  }
  console.log("  ✓ 15 cortes argentinos");

  // --- Plantilla: Vaquillona 80-105kg ---
  const template = await prisma.yieldTemplate.create({
    data: {
      categoryId: vaquillona.id,
      rangeId: range80.id,
      name: "Vaquillona Liviana - Desposte Estándar",
      referenceWeight: 100,
      notes: "Plantilla base con desposte real de referencia.",
      status: "active",
      items: {
        create: [
          { cutId: cuts["Lomo"], percentageYield: 2.80 },
          { cutId: cuts["Bife Ancho"], percentageYield: 5.00 },
          { cutId: cuts["Bife Angosto"], percentageYield: 4.20 },
          { cutId: cuts["Cuadril"], percentageYield: 5.50 },
          { cutId: cuts["Peceto"], percentageYield: 2.50 },
          { cutId: cuts["Asado"], percentageYield: 14.50 },
          { cutId: cuts["Vacío"], percentageYield: 4.50 },
          { cutId: cuts["Matambre"], percentageYield: 3.50 },
          { cutId: cuts["Tapa de Asado"], percentageYield: 3.00 },
          { cutId: cuts["Falda"], percentageYield: 4.50 },
          { cutId: cuts["Nalga"], percentageYield: 7.00 },
          { cutId: cuts["Bola de Lomo"], percentageYield: 5.00 },
          { cutId: cuts["Paleta"], percentageYield: 8.00 },
          { cutId: cuts["Hueso"], percentageYield: 18.00 },
          { cutId: cuts["Grasa y Recortes"], percentageYield: 12.00 },
        ],
      },
    },
  });
  console.log("  ✓ Plantilla Vaquillona 80-105kg (100% = OK)");

  // --- Proveedores ---
  const donPedro = await prisma.supplier.create({
    data: {
      name: "Frigorífico Don Pedro",
      razonSocial: "Don Pedro S.A.",
      cuit: "30-71234567-0",
      phone: "011-4555-1234",
      email: "ventas@donpedro.com.ar",
      address: "Ruta 3 Km 45, Cañuelas, Buenos Aires",
    },
  });
  await prisma.supplier.create({
    data: {
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
  await prisma.customer.createMany({
    data: [
      { name: "Juan Pérez", phone: "11-2345-6789", dni: "28.456.789", creditLimit: 50000 },
      { name: "María García", phone: "11-3456-7890", dni: "32.567.890", creditLimit: 30000 },
      { name: "Carlos López", phone: "11-4567-8901", dni: "25.678.901", creditLimit: 75000 },
    ],
  });
  console.log("  ✓ 3 clientes");

  // --- Métodos de Pago ---
  await prisma.paymentMethod.createMany({
    data: [
      { name: "Efectivo", surchargePercentage: 0 },
      { name: "Débito", surchargePercentage: 0 },
      { name: "MercadoPago", surchargePercentage: 3.5 },
      { name: "Crédito", surchargePercentage: 8 },
    ],
  });
  console.log("  ✓ 4 métodos de pago");

  // --- Lista de Precios ---
  const priceList = await prisma.priceList.create({
    data: {
      name: "Lista General Febrero 2026",
      description: "Precios vigentes para mostrador",
      isActive: true,
      validFrom: new Date("2026-02-01"),
    },
  });

  const pricesData: Record<string, [number, number]> = {
    "Lomo": [12500, 18500],
    "Bife Ancho": [8500, 12900],
    "Bife Angosto": [9000, 13500],
    "Cuadril": [7500, 11200],
    "Peceto": [8000, 12000],
    "Asado": [4500, 6900],
    "Vacío": [6500, 9800],
    "Matambre": [5500, 8200],
    "Tapa de Asado": [4000, 5900],
    "Falda": [3000, 4500],
    "Nalga": [5000, 7500],
    "Bola de Lomo": [5500, 8000],
    "Paleta": [3500, 5200],
    "Hueso": [500, 800],
    "Grasa y Recortes": [300, 500],
  };

  for (const [cutName, [cost, sell]] of Object.entries(pricesData)) {
    await prisma.price.create({
      data: {
        priceListId: priceList.id,
        cutId: cuts[cutName],
        costPerKg: cost,
        sellPricePerKg: sell,
      },
    });
  }
  console.log("  ✓ Lista de precios con 15 cortes");

  // --- Inventario inicial (0 kg, con alertas) ---
  for (const c of cutsData) {
    const minAlert = c.cutCategory === "premium" ? 3 : c.cutCategory === "subproducto" ? 0 : 5;
    await prisma.inventory.create({
      data: {
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
