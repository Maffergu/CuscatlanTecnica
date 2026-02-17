const request = require("supertest")
const app = require("../src/server")

const API_KEY = "supersecreta"

describe("Prueba técnica - Gestión de cobros", () => {

  let clienteId
  let cobroId1
  let cobroId2

  it("Debe crear un cliente", async () => {
    const res = await request(app)
      .post("/clientes")
      .set("x-api-key", API_KEY)
      .send({
        nombre: "Test User",
        dpi: "888888888"
      })

    expect(res.statusCode).toBe(201)
    clienteId = res.body.id
  })

  it("Debe crear dos cobros pendientes", async () => {
    const res1 = await request(app)
      .post("/cobros")
      .set("x-api-key", API_KEY)
      .send({
        clienteId,
        monto: 500,
        moneda: "GTQ"
      })

    const res2 = await request(app)
      .post("/cobros")
      .set("x-api-key", API_KEY)
      .send({
        clienteId,
        monto: 1500,
        moneda: "GTQ"
      })

    expect(res1.statusCode).toBe(201)
    expect(res2.statusCode).toBe(201)

    expect(res1.body.estado).toBe("PENDIENTE")
    expect(res2.body.estado).toBe("PENDIENTE")

    cobroId1 = res1.body.id
    cobroId2 = res2.body.id
  })

  it("Debe procesar un cobro individual correctamente", async () => {
    const res = await request(app)
      .post(`/cobros/${cobroId1}/procesar`)
      .set("x-api-key", API_KEY)

    expect(res.statusCode).toBe(200)
    expect(res.body.estado).toBe("PROCESADO")
  })

  it("Debe ser idempotente al procesar el mismo cobro", async () => {
    const res = await request(app)
      .post(`/cobros/${cobroId1}/procesar`)
      .set("x-api-key", API_KEY)

    expect(res.statusCode).toBe(200)
    expect(res.body.message).toBeDefined()
  })

  it("Debe procesar lote correctamente", async () => {
    const res = await request(app)
      .post("/cobros/lotes/procesar")
      .set("x-api-key", API_KEY)
      .send({
        cobrosIds: [cobroId1, cobroId2]
      })

    expect(res.statusCode).toBe(200)
    expect(res.body).toHaveProperty("total")
    expect(res.body).toHaveProperty("procesados")
    expect(res.body).toHaveProperty("fallidos")
  })

  it("Debe permitir consultar cobros por cliente", async () => {
    const res = await request(app)
      .get(`/clientes/${clienteId}/cobros`)
      .set("x-api-key", API_KEY)

    expect(res.statusCode).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

})
