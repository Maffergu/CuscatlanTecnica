
# API de Gestión de Cobros Automáticos

## Descripción

Servicio API REST desarrollado para gestionar cobros automáticos simulados. Permite el registro de clientes, la gestión de cobros individuales y el procesamiento masivo por lotes, garantizando trazabilidad mediante auditoría e idempotencia en los procesos.

## Stack Tecnológico

*  **Lenguaje:** Node.js (Express) 


*  **ORM:** Prisma 


*  **Base de Datos:** MySQL (Relacional) 


*  **Pruebas:** Jest + Supertest 



## Requisitos Previos

* Node.js (v18 o superior).
* Servidor MySQL activo.
* Base de datos relacional creada (ej. `mydb`).

## Variables de entorno

Crear archivo .env con:

DATABASE_URL="file:./dev.db"
API_KEY="supersecreta"


## Configuración e Instalación

1. **Instalar dependencias:**
```bash
npm install

```


2. **Configurar variables de entorno:**
Crea un archivo `.env` en la raíz del proyecto y configura tu cadena de conexión:
```env
DATABASE_URL="mysql://USUARIO:PASSWORD@localhost:3306/mydb"

```


3. **Sincronizar base de datos y generar cliente Prisma:**
```bash
npx prisma migrate dev --name init

```


4. **Ejecutar el servidor en modo desarrollo:**
```bash
npm run dev

```



## Seguridad

Todos los endpoints requieren la siguiente cabecera para validación básica de seguridad mediante un token:

* **Header:** `x-api-key` 


* **Valor:** `supersecreta` 



## Endpoints Principales

### 1. Clientes (`POST /clientes`)

* Crea un nuevo cliente validando que el **DPI sea único**.



### 2. Registrar Cobro (`POST /cobros`)

* Registra un cobro inicial en estado **PENDIENTE**.


* Valida que el **monto sea mayor a 0** y la existencia del cliente.



### 3. Procesar Cobro Individual (`POST /cobros/{id}/procesar`)

* Aplica reglas de simulación:


* **Monto ≤ 1000:** Estado cambia a `PROCESADO`.


* **Monto > 1000:** Estado cambia a `FALLIDO`.




* Registra automáticamente el evento en la tabla de **Auditoría**.



### 4. Procesar Lote de Cobros (`POST /cobros/lotes/procesar`)

* Recibe una lista de IDs de cobro.


* Devuelve un resumen con totales, procesados y fallidos.


* **Idempotencia:** El proceso garantiza que no se dupliquen acciones sobre registros ya procesados.



### 5. Consulta de Cobros (`GET /clientes/{id}/cobros`)

* Permite filtrar cobros por `estado` y rango de fechas (`desde` y `hasta`).



## Pruebas Unitarias

Para ejecutar las pruebas automatizadas que validan la lógica de negocio y la creación de entidades:

```bash
npm test

```

## Decisiones Técnicas

* **Persistencia:** Se utilizó MySQL para asegurar una estructura de datos relacional robusta según lo solicitado.


* **Idempotencia:** Se implementó lógica de control basada en el estado `PENDIENTE` para asegurar que peticiones repetidas no generen duplicidad.


* **Trazabilidad:** Se diseñó una entidad de `Auditoría` que registra cada cambio crítico de estado para cumplir con el seguimiento de eventos.



---

**Autor:** María Fernanda Argueta
