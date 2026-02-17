-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nombre" TEXT NOT NULL,
    "dpi" TEXT NOT NULL,
    "email" TEXT,
    "telefono" TEXT
);

-- CreateTable
CREATE TABLE "Cobro" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "clienteId" INTEGER NOT NULL,
    "monto" REAL NOT NULL,
    "moneda" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaCreacion" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaProceso" DATETIME,
    "referenciaExterna" TEXT,
    CONSTRAINT "Cobro_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "evento" TEXT NOT NULL,
    "resumenPayload" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioSistema" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Cliente_dpi_key" ON "Cliente"("dpi");
