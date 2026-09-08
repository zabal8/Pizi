import express from "express";
import cors from "cors";
import crypto from "node:crypto";
import db from "./db.js";

const app = express();
app.use(cors());
app.use(express.json());
const API = "/api";
const SECRET = process.env.TOKEN_SECRET || "pizia-local-secret-change-me";
const hashPassword = (
  password,
  salt = crypto.randomBytes(16).toString("hex"),
) => ({ salt, hash: crypto.scryptSync(password, salt, 64).toString("hex") });
const tokenFor = (u) => {
  const data = Buffer.from(
    JSON.stringify({
      id: u.id,
      name: u.nombre,
      rol: u.rol,
      exp: Date.now() + 7 * 86400000,
    }),
  ).toString("base64url");
  return `${data}.${crypto.createHmac("sha256", SECRET).update(data).digest("base64url")}`;
};
const session = (req) => {
  const raw = (req.headers.authorization || "").replace("Bearer ", "");
  const [data, sig] = raw.split(".");
  if (!data || !sig) return null;
  const exp = crypto
    .createHmac("sha256", SECRET)
    .update(data)
    .digest("base64url");
  if (sig !== exp) return null;
  try {
    const s = JSON.parse(Buffer.from(data, "base64url").toString());
    return s.exp > Date.now() ? s : null;
  } catch {
    return null;
  }
};
const requireAuth = (req, res, next) => {
  const s = session(req);
  if (!s)
    return res.status(401).json({ error: "Inicia sesión para continuar." });
  req.user = s;
  next();
};
const requireAdmin = (req, res, next) => {
  if (req.user?.rol !== "ADMIN")
    return res.status(403).json({ error: "Se requiere rol administrador." });
  next();
};
const safeClient = (r) =>
  r && {
    id: r.id,
    nombre: r.nombre,
    email: r.email,
    telefono: r.telefono,
    direccion: r.direccion,
    documento: r.documento,
    rol: r.rol,
    created_at: r.created_at,
  };

// Health
app.get(`${API}/health`, (_, res) =>
  res.json({ ok: true, service: "pizIA API", version: "2.0" }),
);

// Auth / clientes
app.post(`${API}/auth/register`, (req, res) => {
  const {
    nombre,
    email,
    password,
    telefono = "",
    direccion = "",
    documento = "",
  } = req.body;
  if (
    !nombre?.trim() ||
    !email?.includes("@") ||
    !password ||
    password.length < 6
  )
    return res.status(400).json({
      error:
        "Completa nombre, correo válido y contraseña de mínimo 6 caracteres.",
    });
  const e = email.trim().toLowerCase();
  if (db.prepare("SELECT id FROM clientes WHERE email=?").get(e))
    return res
      .status(409)
      .json({ error: "Ya existe una cuenta con este correo." });
  const h = hashPassword(password);
  const r = db
    .prepare(
      "INSERT INTO clientes(nombre,email,telefono,direccion,documento,password_hash,password_salt) VALUES(?,?,?,?,?,?,?)",
    )
    .run(nombre.trim(), e, telefono, direccion, documento, h.hash, h.salt);
  const u = db
    .prepare("SELECT * FROM clientes WHERE id=?")
    .get(Number(r.lastInsertRowid));
  res.status(201).json({ user: safeClient(u), token: tokenFor(u) });
});
app.post(`${API}/auth/login`, (req, res) => {
  const u = db
    .prepare("SELECT * FROM clientes WHERE email=?")
    .get(req.body.email?.trim().toLowerCase());
  if (
    !u ||
    !req.body.password ||
    hashPassword(req.body.password, u.password_salt).hash !== u.password_hash
  )
    return res.status(401).json({ error: "Correo o contraseña incorrectos." });
  res.json({ user: safeClient(u), token: tokenFor(u) });
});
app.get(`${API}/auth/me`, requireAuth, (req, res) =>
  res.json(
    safeClient(
      db.prepare("SELECT * FROM clientes WHERE id=?").get(req.user.id),
    ),
  ),
);

// CRUD clientes
app.get(`${API}/clientes`, requireAuth, requireAdmin, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT id,nombre,email,telefono,documento,direccion,rol,created_at FROM clientes ORDER BY id DESC",
      )
      .all(),
  ),
);
app.get(`${API}/clientes/:id`, requireAuth, requireAdmin, (req, res) => {
  const r = db
    .prepare(
      "SELECT id,nombre,email,telefono,documento,direccion,rol,created_at FROM clientes WHERE id=?",
    )
    .get(req.params.id);
  r ? res.json(r) : res.status(404).json({ error: "Cliente no encontrado." });
});
app.post(`${API}/clientes`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    email,
    telefono = "",
    documento = "",
    direccion = "",
    rol = "CLIENTE",
  } = req.body;
  if (!nombre || !email)
    return res.status(400).json({ error: "Nombre y correo son obligatorios." });
  try {
    const r = db
      .prepare(
        "INSERT INTO clientes(nombre,email,telefono,documento,direccion,rol) VALUES(?,?,?,?,?,?)",
      )
      .run(nombre, email.toLowerCase(), telefono, documento, direccion, rol);
    res
      .status(201)
      .json(
        db
          .prepare(
            "SELECT id,nombre,email,telefono,documento,direccion,rol,created_at FROM clientes WHERE id=?",
          )
          .get(r.lastInsertRowid),
      );
  } catch {
    res.status(409).json({ error: "El correo ya está registrado." });
  }
});
app.put(`${API}/clientes/:id`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    email,
    telefono = "",
    documento = "",
    direccion = "",
    rol = "CLIENTE",
  } = req.body;
  try {
    const r = db
      .prepare(
        "UPDATE clientes SET nombre=?,email=?,telefono=?,documento=?,direccion=?,rol=? WHERE id=?",
      )
      .run(
        nombre,
        email.toLowerCase(),
        telefono,
        documento,
        direccion,
        rol,
        req.params.id,
      );
    if (!r.changes)
      return res.status(404).json({ error: "Cliente no encontrado." });
    res.json(
      db
        .prepare(
          "SELECT id,nombre,email,telefono,documento,direccion,rol,created_at FROM clientes WHERE id=?",
        )
        .get(req.params.id),
    );
  } catch {
    res.status(409).json({ error: "El correo ya está registrado." });
  }
});
app.delete(`${API}/clientes/:id`, requireAuth, requireAdmin, (req, res) => {
  const r = db.prepare("DELETE FROM clientes WHERE id=?").run(req.params.id);
  r.changes
    ? res.json({ message: "Cliente eliminado." })
    : res.status(404).json({ error: "Cliente no encontrado." });
});

// Pizzas
app.get(`${API}/pizzas`, (_, res) =>
  res.json(
    db
      .prepare("SELECT * FROM pizzas WHERE activo=1 ORDER BY popular DESC,id")
      .all(),
  ),
);
app.get(`${API}/pizzas/admin`, requireAuth, requireAdmin, (_, res) =>
  res.json(db.prepare("SELECT * FROM pizzas ORDER BY id DESC").all()),
);
app.post(`${API}/pizzas`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    descripcion,
    precio,
    categoria,
    emoji = "🍕",
    color = "#91D7F4",
    popular = 0,
  } = req.body;
  if (!nombre || !descripcion || !precio || !categoria)
    return res
      .status(400)
      .json({ error: "Completa nombre, descripción, precio y categoría." });
  const r = db
    .prepare(
      "INSERT INTO pizzas(nombre,descripcion,precio,categoria,emoji,color,popular) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      nombre,
      descripcion,
      Number(precio),
      categoria,
      emoji,
      color,
      popular ? 1 : 0,
    );
  res
    .status(201)
    .json(db.prepare("SELECT * FROM pizzas WHERE id=?").get(r.lastInsertRowid));
});
app.put(`${API}/pizzas/:id`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    descripcion,
    precio,
    categoria,
    emoji = "🍕",
    color = "#91D7F4",
    popular = 0,
    activo = 1,
  } = req.body;
  const r = db
    .prepare(
      "UPDATE pizzas SET nombre=?,descripcion=?,precio=?,categoria=?,emoji=?,color=?,popular=?,activo=? WHERE id=?",
    )
    .run(
      nombre,
      descripcion,
      Number(precio),
      categoria,
      emoji,
      color,
      popular ? 1 : 0,
      activo ? 1 : 0,
      req.params.id,
    );
  r.changes
    ? res.json(db.prepare("SELECT * FROM pizzas WHERE id=?").get(req.params.id))
    : res.status(404).json({ error: "Pizza no encontrada." });
});
app.delete(`${API}/pizzas/:id`, requireAuth, requireAdmin, (req, res) => {
  const r = db.prepare("DELETE FROM pizzas WHERE id=?").run(req.params.id);
  r.changes
    ? res.json({ message: "Pizza eliminada." })
    : res.status(404).json({ error: "Pizza no encontrada." });
});

// Ingredientes
app.get(`${API}/ingredientes`, (_, res) =>
  res.json(
    db
      .prepare("SELECT * FROM ingredientes WHERE activo=1 ORDER BY nombre")
      .all(),
  ),
);
app.get(`${API}/ingredientes/admin`, requireAuth, requireAdmin, (_, res) =>
  res.json(db.prepare("SELECT * FROM ingredientes ORDER BY id DESC").all()),
);
app.post(`${API}/ingredientes`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    categoria = "General",
    precio_extra = 0,
    stock = 100,
  } = req.body;
  if (!nombre)
    return res.status(400).json({ error: "El nombre es obligatorio." });
  try {
    const r = db
      .prepare(
        "INSERT INTO ingredientes(nombre,categoria,precio_extra,stock) VALUES(?,?,?,?)",
      )
      .run(nombre, categoria, Number(precio_extra), Number(stock));
    res
      .status(201)
      .json(
        db
          .prepare("SELECT * FROM ingredientes WHERE id=?")
          .get(r.lastInsertRowid),
      );
  } catch {
    res.status(409).json({ error: "El ingrediente ya existe." });
  }
});
app.put(`${API}/ingredientes/:id`, requireAuth, requireAdmin, (req, res) => {
  const {
    nombre,
    categoria = "General",
    precio_extra = 0,
    stock = 100,
    activo = 1,
  } = req.body;
  const r = db
    .prepare(
      "UPDATE ingredientes SET nombre=?,categoria=?,precio_extra=?,stock=?,activo=? WHERE id=?",
    )
    .run(
      nombre,
      categoria,
      Number(precio_extra),
      Number(stock),
      activo ? 1 : 0,
      req.params.id,
    );
  r.changes
    ? res.json(
        db.prepare("SELECT * FROM ingredientes WHERE id=?").get(req.params.id),
      )
    : res.status(404).json({ error: "Ingrediente no encontrado." });
});
app.delete(`${API}/ingredientes/:id`, requireAuth, requireAdmin, (req, res) => {
  const r = db
    .prepare("DELETE FROM ingredientes WHERE id=?")
    .run(req.params.id);
  r.changes
    ? res.json({ message: "Ingrediente eliminado." })
    : res.status(404).json({ error: "Ingrediente no encontrado." });
});
app.get(`${API}/pizzas/:id/ingredientes`, (req, res) =>
  res.json(
    db
      .prepare(
        "SELECT i.* FROM ingredientes i JOIN pizza_ingredientes pi ON pi.ingrediente_id=i.id WHERE pi.pizza_id=?",
      )
      .all(req.params.id),
  ),
);
app.post(
  `${API}/pizzas/:id/ingredientes`,
  requireAuth,
  requireAdmin,
  (req, res) => {
    const ids = Array.isArray(req.body.ingredienteIds)
      ? req.body.ingredienteIds
      : [];
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM pizza_ingredientes WHERE pizza_id=?").run(
        req.params.id,
      );
      const add = db.prepare(
        "INSERT OR IGNORE INTO pizza_ingredientes(pizza_id,ingrediente_id) VALUES(?,?)",
      );
      ids.forEach((id) => add.run(req.params.id, id));
    });
    tx();
    res.json({ message: "Ingredientes asociados correctamente." });
  },
);

// IA recomendadora
app.post(`${API}/recommend`, (_, res) => {
  const craving = String(_.body.craving || "").toLowerCase();
  const pizzas = db.prepare("SELECT * FROM pizzas WHERE activo=1").all();
  const words = craving.split(/\s+/).filter((w) => w.length > 3);
  let best = null,
    score = -1;
  for (const p of pizzas) {
    const text = `${p.nombre} ${p.descripcion} ${p.categoria}`.toLowerCase();
    const s =
      words.reduce((n, w) => n + (text.includes(w) ? 2 : 0), 0) +
      (p.popular ? 0.5 : 0);
    if (s > score) {
      score = s;
      best = p;
    }
  }
  best = best || pizzas[0];
  res.json({
    pizza: best,
    score,
    message: `Para tu antojo, la ${best.nombre} es una gran elección.`,
  });
});

// Pedidos y pagos
app.post(`${API}/pedidos`, requireAuth, (req, res) => {
  const { phone, address, items, paymentMethod = "Efectivo" } = req.body;
  if (!phone || !address || !Array.isArray(items) || !items.length)
    return res
      .status(400)
      .json({ error: "Completa teléfono, dirección y agrega productos." });
  let total = 0;
  const clean = [];
  for (const i of items) {
    const p = db
      .prepare("SELECT * FROM pizzas WHERE id=? AND activo=1")
      .get(i.id);
    const qty = Math.max(1, Number(i.quantity) || 1);
    if (!p)
      return res
        .status(400)
        .json({ error: "Una pizza del carrito ya no está disponible." });
    total += p.precio * qty;
    clean.push({ pizzaId: p.id, quantity: qty, price: p.precio });
  }
  const tx = db.transaction(() => {
    const cliente = db
      .prepare("SELECT * FROM clientes WHERE id=?")
      .get(req.user.id);
    const order = db
      .prepare(
        "INSERT INTO pedidos(cliente_id,customer_name,phone,address,total,metodo_pago) VALUES(?,?,?,?,?,?)",
      )
      .run(req.user.id, cliente.nombre, phone, address, total, paymentMethod);
    const id = Number(order.lastInsertRowid);
    const add = db.prepare(
      "INSERT INTO detalle_pedido(pedido_id,pizza_id,cantidad,precio_unitario) VALUES(?,?,?,?)",
    );
    clean.forEach((i) => add.run(id, i.pizzaId, i.quantity, i.price));
    const ref = `PIZIA-${Date.now()}-${id}`;
    db.prepare(
      "INSERT INTO pagos(pedido_id,metodo,estado,referencia) VALUES(?,?,?,?)",
    ).run(id, paymentMethod, "Aprobado", ref);
    return { id, total, ref };
  });
  const result = tx();
  res.status(201).json({
    id: result.id,
    total: result.total,
    status: "Confirmado",
    eta: "30–40 minutos",
    paymentStatus: "Aprobado",
    reference: result.ref,
  });
});
app.get(`${API}/pedidos/mios`, requireAuth, (req, res) => {
  const rows = db
    .prepare("SELECT * FROM pedidos WHERE cliente_id=? ORDER BY id DESC")
    .all(req.user.id);
  res.json(
    rows.map((o) => ({
      ...o,
      items: db
        .prepare(
          "SELECT d.*,p.nombre,p.emoji FROM detalle_pedido d JOIN pizzas p ON p.id=d.pizza_id WHERE d.pedido_id=?",
        )
        .all(o.id),
    })),
  );
});
app.get(`${API}/pedidos/:id/tracking`, requireAuth, (req, res) => {
  const o = db
    .prepare("SELECT * FROM pedidos WHERE id=? AND cliente_id=?")
    .get(req.params.id, req.user.id);
  if (!o) return res.status(404).json({ error: "No encontramos ese pedido." });
  const steps = ["Confirmado", "En preparación", "En camino", "Entregado"];
  res.json({
    ...o,
    steps,
    currentStep: Math.max(0, steps.indexOf(o.estado)),
    eta: o.estado === "Entregado" ? "Entregado" : "30–40 minutos",
    payment: db.prepare("SELECT * FROM pagos WHERE pedido_id=?").get(o.id),
  });
});
// Admin pedidos
app.get(`${API}/pedidos`, requireAuth, requireAdmin, (_, res) =>
  res.json(db.prepare("SELECT * FROM pedidos ORDER BY id DESC").all()),
);
app.put(`${API}/pedidos/:id/estado`, requireAuth, requireAdmin, (req, res) => {
  const allowed = ["Confirmado", "En preparación", "En camino", "Entregado"];
  if (!allowed.includes(req.body.estado))
    return res.status(400).json({ error: "Estado inválido." });
  const r = db
    .prepare("UPDATE pedidos SET estado=? WHERE id=?")
    .run(req.body.estado, req.params.id);
  r.changes
    ? res.json(
        db.prepare("SELECT * FROM pedidos WHERE id=?").get(req.params.id),
      )
    : res.status(404).json({ error: "Pedido no encontrado." });
});
app.get(`${API}/pagos`, requireAuth, requireAdmin, (_, res) =>
  res.json(
    db
      .prepare(
        "SELECT p.*,o.total,o.estado pedido_estado FROM pagos p JOIN pedidos o ON o.id=p.pedido_id ORDER BY p.id DESC",
      )
      .all(),
  ),
);

// Dashboard
app.get(`${API}/dashboard`, requireAuth, requireAdmin, (_, res) =>
  res.json({
    clientes: db
      .prepare("SELECT COUNT(*) c FROM clientes WHERE rol='CLIENTE'")
      .get().c,
    pizzas: db.prepare("SELECT COUNT(*) c FROM pizzas WHERE activo=1").get().c,
    ingredientes: db
      .prepare("SELECT COUNT(*) c FROM ingredientes WHERE activo=1")
      .get().c,
    pedidos: db.prepare("SELECT COUNT(*) c FROM pedidos").get().c,
    ventas: db.prepare("SELECT COALESCE(SUM(total),0) s FROM pedidos").get().s,
  }),
);

// Create a local admin only on first startup, with safe demo credentials.
if (
  !db.prepare("SELECT id FROM clientes WHERE email='admin@pizia.local'").get()
) {
  const h = hashPassword("Admin12345");
  db.prepare(
    "INSERT INTO clientes(nombre,email,password_hash,password_salt,rol) VALUES(?,?,?,?, 'ADMIN')",
  ).run("Administrador PIZIA", "admin@pizia.local", h.hash, h.salt);
}

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada." }));
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`pizIA API lista en el puerto ${PORT}`);
});
