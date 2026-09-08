# pizIA — Sistema funcional de pedidos de pizza

Proyecto académico construido con React + Vite, Node.js + Express y SQLite.

## Funcionalidades

### Parte pública
- Inicio y catálogo de pizzas.
- Filtros por categoría.
- Carrito con cantidades y total.
- Registro e inicio de sesión.
- Recomendador pizIA conectado al catálogo.
- Checkout con Tarjeta, Nequi y Efectivo (demostración).
- Creación real de pedidos en SQLite.
- Historial de pedidos.
- Tracking por estados.

### Panel administrativo
Disponible para el usuario `admin@pizia.local`.

- Dashboard con indicadores.
- CRUD de clientes.
- CRUD de pizzas.
- CRUD de ingredientes.
- Consulta y actualización del estado de pedidos.
- Consulta de pagos.

## Arquitectura

```text
React + Vite
    │
    │ HTTP / JSON
    ▼
Express REST API
    │
    ▼
SQLite
```

## Requisitos

Node.js 22+ (la versión usada en desarrollo puede ser superior).

## Ejecución

Desde `pizia-project`:

```bash
npm install
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001
Health: http://localhost:3001/api/health

Si quieres ejecutarlos por separado:

```bash
npm run dev --workspace client
npm run dev --workspace server
```

## Usuario administrador de demostración

Correo: `admin@pizia.local`

Contraseña: `Admin12345`

Cámbialos antes de cualquier uso fuera del entorno académico.

## Base de datos

La base se crea automáticamente en `server/pizia.db` e incluye:

- clientes
- pizzas
- ingredientes
- pizza_ingredientes
- pedidos
- detalle_pedido
- pagos

## Nota sobre pagos

El módulo de pagos es académico/de demostración. No procesa dinero real ni almacena datos reales de tarjetas.
