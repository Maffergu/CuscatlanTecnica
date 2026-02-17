require("dotenv").config()
const express = require("express")
const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()
const app = express()

app.use(express.json())

app.use((req, res, next) => {
  const now = new Date().toISOString()
  console.log(`[${now}] ${req.method} ${req.originalUrl}`)
  next()
})


// Middleware API Key
const apiKeyMiddleware = (req, res, next) => {
  const apiKey = req.headers["x-api-key"]

  if (!apiKey || apiKey !== process.env.API_KEY) {
    return res.status(401).json({ error: "Unauthorized" })
  }

  next()
}

app.use(apiKeyMiddleware)

// Ruta test
app.get("/health", (req, res) => {
  res.json({ status: "API running" })
})

//---------------------- 1. Crear cliente -------------------------
app.post("/clientes", async (req, res) => {
  try {
    const { nombre, dpi, email, telefono } = req.body

    if (!nombre || !dpi) {
      return res.status(400).json({ error: "Nombre y DPI son obligatorios" })
    }

    const cliente = await prisma.cliente.create({
      data: {
        nombre,
        dpi,
        email,
        telefono
      }
    })

    res.status(201).json(cliente)

  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({ error: "DPI ya existe" })
    }

    console.error(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

//------------------------ 2. Registrar cobro -------------------------
app.post("/cobros", async (req, res) => {
  try {
    const { clienteId, monto, moneda, referenciaExterna } = req.body

    if (!clienteId || !monto || !moneda) {
      return res.status(400).json({ error: "clienteId, monto y moneda son obligatorios" })
    }

    if (monto <= 0) {
      return res.status(400).json({ error: "El monto debe ser mayor a 0" })
    }

    // Verificar que el cliente exista
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no existe" })
    }

    const cobro = await prisma.cobro.create({
      data: {
        clienteId,
        monto,
        moneda,
        referenciaExterna
      }
    })

    res.status(201).json(cobro)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

// ------------------ 4. Procesar lote de cobros ------------------
app.post("/cobros/lotes/procesar", async (req, res) => {
  try {
    const { cobrosIds } = req.body

    if (!Array.isArray(cobrosIds) || cobrosIds.length === 0) {
      return res.status(400).json({ error: "Debe enviar una lista válida de cobrosIds" })
    }

    let total = 0
    let procesados = 0
    let fallidos = 0
    //console.log("Body recibido:", req.body)


    for (const rawId of cobrosIds) {
      //console.log("ID crudo:", rawId)

      const id = Number(rawId)

      if (!id || isNaN(id)) {
        continue
      }

      const cobro = await prisma.cobro.findUnique({
        where: { id: id }
      })

      if (!cobro) continue

      total++

      if (cobro.estado !== "PENDIENTE") {
        if (cobro.estado === "PROCESADO") procesados++
        if (cobro.estado === "FALLIDO") fallidos++
        continue
      }

      const nuevoEstado = cobro.monto <= 1000 ? "PROCESADO" : "FALLIDO"

      await prisma.cobro.update({
        where: { id: id },
        data: {
          estado: nuevoEstado,
          fechaProceso: new Date()
        }
      })

      await prisma.auditoria.create({
        data: {
          evento: "PROCESAMIENTO_COBRO_LOTE",
          resumenPayload: JSON.stringify({ cobroId: id, estado: nuevoEstado }),
          usuarioSistema: "system"
        }
      })

      if (nuevoEstado === "PROCESADO") procesados++
      if (nuevoEstado === "FALLIDO") fallidos++
    }

    return res.json({
      total,
      procesados,
      fallidos
    })

  } catch (error) {
    console.error("Error lote:", error)
    return res.status(500).json({ error: "Error interno del servidor" })
  }
})


// ------------------- 3. Procesar cobro -------------------------
app.post("/cobros/:id/procesar", async (req, res) => {
  try {
    const cobroId = parseInt(req.params.id)

    const cobro = await prisma.cobro.findUnique({
      where: { id: cobroId }
    })

    if (!cobro) {
      return res.status(404).json({ error: "Cobro no existe" })
    }

    // Idempotencia básica: si ya fue procesado, no volver a procesar
    if (cobro.estado !== "PENDIENTE") {
      return res.status(200).json({
        message: "Cobro ya procesado",
        cobro
      })
    }

    let nuevoEstado = ""

    if (cobro.monto <= 1000) {
      nuevoEstado = "PROCESADO"
    } else {
      nuevoEstado = "FALLIDO"
    }

    const cobroActualizado = await prisma.cobro.update({
      where: { id: cobroId },
      data: {
        estado: nuevoEstado,
        fechaProceso: new Date()
      }
    })

    // Registrar en auditoría
    await prisma.auditoria.create({
      data: {
        evento: "PROCESAMIENTO_COBRO",
        resumenPayload: JSON.stringify({
          cobroId,
          estado: nuevoEstado
        }),
        usuarioSistema: "system"
      }
    })

    res.json(cobroActualizado)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})

//-------------- 5. Consulta de cobros por cliente ----------------
app.get("/clientes/:id/cobros", async (req, res) => {
  try {
    const clienteId = Number(req.params.id)
    const { estado, desde, hasta } = req.query

    if (!clienteId || isNaN(clienteId)) {
      return res.status(400).json({ error: "ID de cliente inválido" })
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId }
    })

    if (!cliente) {
      return res.status(404).json({ error: "Cliente no existe" })
    }

    const filtros = {
      clienteId: clienteId
    }

    if (estado) {
      filtros.estado = estado
    }

    if (desde || hasta) {
      filtros.fechaCreacion = {}
      if (desde) filtros.fechaCreacion.gte = new Date(desde)
      if (hasta) filtros.fechaCreacion.lte = new Date(hasta)
    }

    const cobros = await prisma.cobro.findMany({
      where: filtros,
      orderBy: { fechaCreacion: "desc" }
    })

    res.json(cobros)

  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error interno del servidor" })
  }
})


const PORT = 3000
app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({
    error: "Error interno del servidor"
  })
})

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
  })
}

module.exports = app

