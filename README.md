# Midnight Trouble — Event Financial Dashboard

Dashboard interactivo para proyectar costos, precios y P&L del evento. Montado en Next.js 14 + Vercel Postgres.

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Base de datos | Vercel Postgres (PostgreSQL) |
| Deploy | Vercel |
| Lenguaje | TypeScript |

---

## Estructura del proyecto

```
midnight-trouble/
├── app/
│   ├── api/
│   │   ├── config/route.ts      # GET/PATCH configuración de precios
│   │   └── events/route.ts      # GET/POST/DELETE escenarios guardados
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                 # Server component → carga config inicial
├── components/
│   └── Dashboard.tsx            # UI interactiva completa (client component)
├── lib/
│   ├── db.ts                    # Queries tipadas con @vercel/postgres
│   └── db-init.js               # Script de inicialización de tablas
├── .env.example
└── README.md
```

---

## Base de datos

### Tablas

#### `event_config`
Guarda los precios y parámetros del evento. Solo tiene **una fila** (se actualiza, no se inserta).

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL | Primary key |
| `event_name` | TEXT | Nombre del evento |
| `price_gen` | INTEGER | Precio entrada General (₡) |
| `price_vip` | INTEGER | Precio entrada VIP (₡) |
| `price_lounge_ind` | INTEGER | Precio Lounge individual (₡) |
| `price_lounge_mesa` | INTEGER | Precio mesa Lounge 3 personas (₡) |
| `costo_neto` | INTEGER | Costo neto del evento (₡) |
| `cap_gen` | INTEGER | Capacidad máxima General |
| `cap_vip` | INTEGER | Capacidad máxima VIP |
| `cap_lounge` | INTEGER | Capacidad máxima Lounge |
| `updated_at` | TIMESTAMP | Última actualización |

#### `sales_snapshot`
Guarda escenarios de prueba para comparar distintas combinaciones de ventas.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | SERIAL | Primary key |
| `label` | TEXT | Nombre del escenario |
| `qty_gen` | INTEGER | Cantidad General |
| `qty_vip` | INTEGER | Cantidad VIP |
| `qty_lounge_ind` | INTEGER | Cantidad Lounge individual |
| `qty_lounge_mesa` | INTEGER | Cantidad mesas Lounge |
| `ingreso` | INTEGER | Ingreso total calculado |
| `pl` | INTEGER | P&L calculado |
| `created_at` | TIMESTAMP | Fecha de creación |

### API Routes

| Método | Ruta | Acción |
|---|---|---|
| GET | `/api/config` | Obtener configuración actual |
| PATCH | `/api/config` | Actualizar precios/parámetros |
| GET | `/api/events` | Listar escenarios guardados |
| POST | `/api/events` | Guardar nuevo escenario |
| DELETE | `/api/events` | Eliminar escenario por ID |

---

## Setup local

### 1. Clonar e instalar

```bash
git clone <repo>
cd midnight-trouble
npm install
```

### 2. Crear la base de datos en Vercel

1. Ir a [vercel.com](https://vercel.com) → tu proyecto → pestaña **Storage**
2. Crear una **Postgres** database
3. En la pestaña **Quickstart**, copiar las variables de entorno

### 3. Configurar variables de entorno

```bash
cp .env.example .env.local
# Pegar las variables de Vercel en .env.local
```

### 4. Inicializar las tablas

```bash
node lib/db-init.js
```

Esto crea las dos tablas e inserta la configuración default.

### 5. Correr en desarrollo

```bash
npm run dev
# → http://localhost:3000
```

---

## Deploy en Vercel

### Primera vez

```bash
npm i -g vercel
vercel login
vercel
```

Vercel detecta Next.js automáticamente. En el proceso de setup:
- **Framework**: Next.js ✓ (auto-detectado)
- **Build command**: `next build` (default)
- **Output directory**: `.next` (default)

### Conectar la base de datos al proyecto en Vercel

1. Dashboard Vercel → tu proyecto → **Storage**
2. Seleccionar la Postgres DB que creaste
3. Click **Connect** — las variables de entorno se agregan solas al proyecto

### Deploy posterior

```bash
git push origin main
# Vercel hace deploy automático
```

---

## Funcionalidades del dashboard

- **Configuración de precios**: Editar todos los precios y el costo neto desde la UI — se persisten en DB
- **Simulador con sliders**: Ajustar cantidades de cada tipo de entrada y ver P&L en tiempo real
- **Escenarios guardados**: Guardar combinaciones para comparar — persisten en DB con fecha
- **Matriz P&L**: Vista de todas las combinaciones de General × Lounge con VIP fijo — colores por rentabilidad

---

## Agregar nuevos eventos

Para extender el sistema a múltiples eventos:

1. Agregar columna `event_id` a ambas tablas
2. Crear tabla `events (id, name, date)`
3. Actualizar las queries en `lib/db.ts` para filtrar por `event_id`
4. Agregar selector de evento en el header del Dashboard

---

## Valores por defecto (Midnight Trouble)

| Tipo | Precio | Capacidad |
|---|---|---|
| General | ₡9,000 | 100 |
| VIP | ₡12,000 | 40 |
| Lounge individual | ₡16,000 | 25 |
| Mesa Lounge (3p) | ₡44,000 | — |
| **Costo neto** | **₡1,219,676** | — |

Sold out completo: 165 personas · Ingreso máx: ₡1,625,000 · P&L máx: +₡405,324
