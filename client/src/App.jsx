import React, { useEffect, useMemo, useState } from "react";
import "./styles.css";

const API = "https://pizia-api.onrender.com/api";
const money = (v) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(v) || 0);

const pizzaImages = {
  "Pizza Margarita":
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1000&q=88",
  "Pizza Vegetariana":
    "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=88",
  "Pizza Chicken BBQ":
    "https://images.unsplash.com/photo-1555072956-7758afb20e8f?auto=format&fit=crop&w=1000&q=88",
  "Pizza Hawaiana":
    "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?auto=format&fit=crop&w=1000&q=88",
  "Pizza Pepperoni":
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1000&q=88",
  "Pizza Mexicana":
    "https://images.unsplash.com/photo-1604068549290-dea0e4a305ca?auto=format&fit=crop&w=1000&q=88",
  "Pizza Cuatro Quesos":
    "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=88",
  "Pizza Napolitana":
    "https://images.unsplash.com/photo-1579751626657-72bc17010498?auto=format&fit=crop&w=1000&q=88",
};

const imageFor = (pizza) =>
  pizzaImages[pizza.nombre] ||
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1000&q=88";

async function api(path, opts = {}) {
  const session = JSON.parse(localStorage.getItem("pizia-session") || "null");
  const headers = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const response = await fetch(`${API}${path}`, { ...opts, headers });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || "No fue posible completar la solicitud.");
  return data;
}

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onMouseDown={onClose}>
      <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>
          ×
        </button>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

function PizzaCard({ pizza, onAdd }) {
  return (
    <article className="pizza-card">
      <div className="pizza-photo">
        <img src={imageFor(pizza)} alt={pizza.nombre} />
        <span className="photo-badge">
          {pizza.popular ? "Más pedida" : pizza.categoria}
        </span>
      </div>
      <div className="pizza-info">
        <div className="pizza-meta">
          <span>{pizza.categoria}</span>
          <span>Desde</span>
        </div>
        <h3>{pizza.nombre}</h3>
        <p>{pizza.descripcion}</p>
        <div className="pizza-bottom">
          <strong>{money(pizza.precio)}</strong>
          <button className="add-btn" onClick={() => onAdd(pizza)}>
            Agregar al carrito <b>+</b>
          </button>
        </div>
      </div>
    </article>
  );
}

function Menu({ pizzas, category, setCategory, onAdd }) {
  const categories = ["Todas", ...new Set(pizzas.map((p) => p.categoria))];
  const visible = pizzas.filter(
    (p) => category === "Todas" || p.categoria === category,
  );
  return (
    <section className="menu-section" id="menu">
      <div className="section-head">
        <div>
          <span className="eyebrow">NUESTRO MENÚ</span>
          <h2>Favoritas de la casa</h2>
          <p>
            Recetas artesanales preparadas al momento con ingredientes
            seleccionados.
          </p>
        </div>
        <div className="category-pills">
          {categories.map((c) => (
            <button
              key={c}
              className={category === c ? "selected" : ""}
              onClick={() => setCategory(c)}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="pizza-grid">
        {visible.map((pizza) => (
          <PizzaCard key={pizza.id} pizza={pizza} onAdd={onAdd} />
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(() =>
    JSON.parse(localStorage.getItem("pizia-session") || "null"),
  );
  const [view, setView] = useState("home");
  const [pizzas, setPizzas] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [clients, setClients] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [cart, setCart] = useState([]);
  const [category, setCategory] = useState("Todas");
  const [craving, setCraving] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [notice, setNotice] = useState("");
  const [authMode, setAuthMode] = useState(null);
  const [checkout, setCheckout] = useState(false);
  const [trackId, setTrackId] = useState("");
  const [track, setTrack] = useState(null);
  const [payment, setPayment] = useState("Efectivo");
  const [adminTab, setAdminTab] = useState("dashboard");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const admin = session?.user?.rol === "ADMIN";
  const total = cart.reduce(
    (sum, item) => sum + Number(item.precio) * item.quantity,
    0,
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const reloadPublic = () =>
    api("/pizzas")
      .then(setPizzas)
      .catch(() => setNotice("No se pudo conectar con el servidor."));
  const reloadAdmin = async () => {
    if (!admin) return;
    try {
      const [d, c, i, p, o, pa] = await Promise.all([
        api("/dashboard"),
        api("/clientes"),
        api("/ingredientes/admin"),
        api("/pizzas/admin"),
        api("/pedidos"),
        api("/pagos"),
      ]);
      setDashboard(d);
      setClients(c);
      setIngredients(i);
      setPizzas(p);
      setOrders(o);
      setPayments(pa);
    } catch (err) {
      setNotice(err.message);
    }
  };

  useEffect(() => {
    reloadPublic();
  }, []);
  useEffect(() => {
    if (admin) reloadAdmin();
  }, [admin]);
  useEffect(() => {
    if (session && !admin)
      api("/pedidos/mios")
        .then(setOrders)
        .catch(() => {});
  }, [session, admin]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3500);
    return () => clearTimeout(timer);
  }, [notice]);

  const nav = (next) => {
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const add = (pizza) => {
    setCart((current) =>
      current.some((item) => item.id === pizza.id)
        ? current.map((item) =>
            item.id === pizza.id
              ? { ...item, quantity: item.quantity + 1 }
              : item,
          )
        : [...current, { ...pizza, quantity: 1 }],
    );
    setNotice(`${pizza.nombre} fue agregado al carrito.`);
  };
  const changeQty = (id, delta) =>
    setCart((current) =>
      current
        .map((item) =>
          item.id === id ? { ...item, quantity: item.quantity + delta } : item,
        )
        .filter((item) => item.quantity > 0),
    );
  const logout = () => {
    localStorage.removeItem("pizia-session");
    setSession(null);
    nav("home");
    setNotice("Sesión cerrada.");
  };

  const authSubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const register = authMode === "register";
      const data = await api(`/auth/${register ? "register" : "login"}`, {
        method: "POST",
        body: JSON.stringify({
          nombre: f.get("nombre"),
          email: f.get("email"),
          password: f.get("password"),
          telefono: f.get("telefono") || "",
          direccion: f.get("direccion") || "",
        }),
      });
      localStorage.setItem("pizia-session", JSON.stringify(data));
      setSession(data);
      setAuthMode(null);
      setNotice(`Bienvenida/o a PIZIA, ${data.user.nombre}.`);
    } catch (err) {
      setNotice(err.message);
    }
  };

  const recommend = async (e) => {
    e.preventDefault();
    if (!craving.trim()) return;
    try {
      setRecommendation(
        await api("/recommend", {
          method: "POST",
          body: JSON.stringify({ craving }),
        }),
      );
    } catch (err) {
      setNotice(err.message);
    }
  };

  const checkoutSubmit = async (e) => {
    e.preventDefault();
    if (!session) {
      setCheckout(false);
      setAuthMode("login");
      setNotice("Inicia sesión para confirmar tu pedido.");
      return;
    }
    try {
      const f = new FormData(e.currentTarget);
      const data = await api("/pedidos", {
        method: "POST",
        body: JSON.stringify({
          phone: f.get("phone"),
          address: f.get("address"),
          items: cart,
          paymentMethod: payment,
        }),
      });
      setCart([]);
      setCheckout(false);
      setTrackId(data.id);
      setTrack(null);
      setNotice(`Pedido #${data.id} confirmado.`);
      nav("tracking");
    } catch (err) {
      setNotice(err.message);
    }
  };

  const doTrack = async (e) => {
    e.preventDefault();
    try {
      setTrack(await api(`/pedidos/${trackId}/tracking`));
    } catch (err) {
      setNotice(err.message);
    }
  };
  const save = async (type, e) => {
    e.preventDefault();
    try {
      const endpoint =
        type === "cliente"
          ? "/clientes"
          : type === "pizza"
            ? "/pizzas"
            : "/ingredientes";
      const path = editing ? `${endpoint}/${editing.id}` : endpoint;
      await api(path, {
        method: editing ? "PUT" : "POST",
        body: JSON.stringify(form),
      });
      setEditing(null);
      setForm({});
      await reloadAdmin();
      setNotice("Cambios guardados correctamente.");
    } catch (err) {
      setNotice(err.message);
    }
  };
  const remove = async (type, id) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    try {
      await api(`/${type}/${id}`, { method: "DELETE" });
      await reloadAdmin();
      setNotice("Registro eliminado.");
    } catch (err) {
      setNotice(err.message);
    }
  };
  const updateOrder = async (id, estado) => {
    try {
      await api(`/pedidos/${id}/estado`, {
        method: "PUT",
        body: JSON.stringify({ estado }),
      });
      await reloadAdmin();
      setNotice("Estado del pedido actualizado.");
    } catch (err) {
      setNotice(err.message);
    }
  };

  return (
    <div className="app">
      <header className="header">
        <button
          className="brand"
          onClick={() => nav("home")}
          aria-label="PIZIA inicio"
        >
          <img src="/assets/pizia-logo.png" alt="pizIA" />
        </button>
        <nav className="nav">
          <button
            className={view === "home" ? "nav-link active" : "nav-link"}
            onClick={() => nav("home")}
          >
            Inicio
          </button>
          <button
            className={view === "menu" ? "nav-link active" : "nav-link"}
            onClick={() => nav("menu")}
          >
            Menú
          </button>
          <button
            className={view === "ai" ? "nav-link ai-link" : "nav-link ai-link"}
            onClick={() => nav("ai")}
          >
            pizIA <span>✦</span>
          </button>
          {session && (
            <button
              className={view === "orders" ? "nav-link active" : "nav-link"}
              onClick={() => nav("orders")}
            >
              Mis pedidos
            </button>
          )}
          {session && (
            <button
              className={view === "tracking" ? "nav-link active" : "nav-link"}
              onClick={() => nav("tracking")}
            >
              Seguimiento
            </button>
          )}
          {admin && (
            <button
              className={
                view === "admin"
                  ? "nav-link admin-link active"
                  : "nav-link admin-link"
              }
              onClick={() => nav("admin")}
            >
              Administración
            </button>
          )}
        </nav>
        <div className="header-right">
          <button
            className="account-btn"
            onClick={() => (session ? logout() : setAuthMode("login"))}
          >
            {session ? `Hola, ${session.user.nombre}` : "Ingresar"}
          </button>
          <button className="cart-btn" onClick={() => setCheckout(true)}>
            <span>Carrito</span>
            <b>{cartCount}</b>
          </button>
        </div>
      </header>

      {view === "home" && (
        <>
          <main className="hero">
            <div className="hero-copy">
              <span className="eyebrow">PIZZA ARTESANAL · BOGOTÁ</span>
              <h1>
                Tu próxima pizza
                <br />
                <em>empieza aquí.</em>
              </h1>
              <p>
                Una experiencia de pizza artesanal pensada para disfrutar. Elige
                entre nuestras recetas favoritas o deja que{" "}
                <strong>pizIA</strong> encuentre la combinación que mejor se
                adapta a tu antojo.
              </p>
              <div className="hero-buttons">
                <button className="btn-primary" onClick={() => nav("menu")}>
                  Ver menú <span>→</span>
                </button>
                <button className="btn-outline" onClick={() => nav("ai")}>
                  Descubrir con pizIA <span>✦</span>
                </button>
              </div>
              <div className="trust-row">
                <span>
                  <b>4.9</b> valoración
                </span>
                <i></i>
                <span>Ingredientes frescos</span>
                <i></i>
                <span>Pedido en línea</span>
              </div>
            </div>
            <div className="hero-media">
              <img
                src="https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=1400&q=90"
                alt="Pizza margarita artesanal"
              />
              <div className="hero-card">
                <small>RECOMENDACIÓN DE HOY</small>
                <strong>Pizza Margarita</strong>
                <span>Tomate, mozzarella y albahaca</span>
                <b>{money(25000)}</b>
              </div>
            </div>
          </main>
          <section className="service-row">
            <div>
              <span>01</span>
              <div>
                <b>Masa artesanal</b>
                <small>Preparada y horneada al momento.</small>
              </div>
            </div>
            <div>
              <span>02</span>
              <div>
                <b>pizIA recomienda</b>
                <small>Encuentra tu pizza según tu antojo.</small>
              </div>
            </div>
            <div>
              <span>03</span>
              <div>
                <b>Seguimiento</b>
                <small>Consulta el estado de tu pedido.</small>
              </div>
            </div>
          </section>
          <Menu
            pizzas={pizzas}
            category={category}
            setCategory={setCategory}
            onAdd={add}
          />
        </>
      )}

      {view === "menu" && (
        <main className="page">
          <div className="page-title">
            <span className="eyebrow">PIZIA · MENÚ</span>
            <h1>Elige tu favorita.</h1>
            <p>Recetas entre $25.000 y $32.000 COP, preparadas al momento.</p>
          </div>
          <Menu
            pizzas={pizzas}
            category={category}
            setCategory={setCategory}
            onAdd={add}
          />
        </main>
      )}

      {view === "ai" && (
        <main className="ai-page">
          <div className="ai-panel">
            <div className="ai-copy">
              <span className="eyebrow light">RECOMENDACIÓN INTELIGENTE</span>
              <h1>
                Cuéntale tu antojo a <em>pizIA.</em>
              </h1>
              <p>
                Describe sabores, ingredientes o el tipo de pizza que buscas.
                PIZIA analizará el catálogo y te recomendará una opción.
              </p>
              <form onSubmit={recommend}>
                <input
                  value={craving}
                  onChange={(e) => setCraving(e.target.value)}
                  placeholder="Ej. quiero algo con pollo y un toque dulce"
                />
                <button className="btn-light">
                  Recomendar <span>✦</span>
                </button>
              </form>
            </div>
            <div className="ai-mark">
              piz<span>IA</span>
              <small>smart pizza</small>
            </div>
          </div>
          {recommendation && (
            <div className="recommend-card">
              <img
                src={imageFor(recommendation.pizza)}
                alt={recommendation.pizza.nombre}
              />
              <div>
                <span>RECOMENDACIÓN</span>
                <h2>{recommendation.pizza.nombre}</h2>
                <p>{recommendation.message}</p>
                <strong>{money(recommendation.pizza.precio)}</strong>
              </div>
              <button
                className="btn-primary"
                onClick={() => add(recommendation.pizza)}
              >
                Agregar al carrito
              </button>
            </div>
          )}
        </main>
      )}

      {view === "tracking" && (
        <main className="page narrow">
          <span className="eyebrow">SEGUIMIENTO</span>
          <h1>Rastrea tu pedido.</h1>
          <p>Consulta el estado de una orden con su número.</p>
          <form className="track-box" onSubmit={doTrack}>
            <input
              value={trackId}
              onChange={(e) => setTrackId(e.target.value)}
              placeholder="Número de pedido"
            />
            <button className="btn-primary">Consultar</button>
          </form>
          {track && (
            <div className="tracking-card">
              <div className="track-top">
                <div>
                  <small>PEDIDO #{track.id}</small>
                  <h2>{track.estado}</h2>
                </div>
                <span>{track.created_at}</span>
              </div>
              <div className="progress">
                <span className="done">Confirmado</span>
                <span
                  className={
                    ["En preparación", "En camino", "Entregado"].includes(
                      track.estado,
                    )
                      ? "done"
                      : ""
                  }
                >
                  Preparando
                </span>
                <span
                  className={
                    ["En camino", "Entregado"].includes(track.estado)
                      ? "done"
                      : ""
                  }
                >
                  En camino
                </span>
                <span className={track.estado === "Entregado" ? "done" : ""}>
                  Entregado
                </span>
              </div>
            </div>
          )}
        </main>
      )}

      {view === "orders" && (
        <main className="page">
          <span className="eyebrow">MI CUENTA</span>
          <h1>Mis pedidos.</h1>
          <div className="orders-grid">
            {orders.length ? (
              orders.map((o) => (
                <article className="order-card" key={o.id}>
                  <span>Pedido #{o.id}</span>
                  <strong>{money(o.total)}</strong>
                  <small>
                    {o.estado} · {o.metodo_pago}
                  </small>
                  <button
                    onClick={() => {
                      setTrackId(o.id);
                      nav("tracking");
                    }}
                  >
                    Ver seguimiento
                  </button>
                </article>
              ))
            ) : (
              <p>Aún no tienes pedidos registrados.</p>
            )}
          </div>
        </main>
      )}

      {view === "admin" && admin && (
        <main className="admin-page">
          <div className="admin-head">
            <div>
              <span className="eyebrow">PANEL DE CONTROL</span>
              <h1>Administración PIZIA</h1>
              <p>Gestiona clientes, catálogo, ingredientes, pedidos y pagos.</p>
            </div>
          </div>
          <div className="admin-tabs">
            {[
              "dashboard",
              "clientes",
              "pizzas",
              "ingredientes",
              "pedidos",
              "pagos",
            ].map((tab) => (
              <button
                className={adminTab === tab ? "selected" : ""}
                key={tab}
                onClick={() => setAdminTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
          {adminTab === "dashboard" && (
            <div className="stats">
              {[
                ["Ventas", dashboard?.ventas || 0],
                ["Pedidos", dashboard?.pedidos || 0],
                ["Clientes", dashboard?.clientes || 0],
                ["Pizzas", dashboard?.pizzas || 0],
                ["Ingredientes", dashboard?.ingredientes || 0],
              ].map(([label, value]) => (
                <div className="stat" key={label}>
                  <small>{label}</small>
                  <strong>{label === "Ventas" ? money(value) : value}</strong>
                </div>
              ))}
            </div>
          )}
          {adminTab === "clientes" && (
            <AdminTable
              title="Clientes"
              onNew={() => {
                setEditing({ type: "cliente" });
                setForm({
                  nombre: "",
                  email: "",
                  telefono: "",
                  documento: "",
                  direccion: "",
                  rol: "CLIENTE",
                });
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Email</th>
                    <th>Teléfono</th>
                    <th>Rol</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.map((c) => (
                    <tr key={c.id}>
                      <td>{c.nombre}</td>
                      <td>{c.email}</td>
                      <td>{c.telefono}</td>
                      <td>{c.rol}</td>
                      <td>
                        <button
                          onClick={() => {
                            setEditing(c);
                            setForm(c);
                          }}
                        >
                          Editar
                        </button>
                        <button onClick={() => remove("clientes", c.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          )}
          {adminTab === "pizzas" && (
            <AdminTable
              title="Catálogo de pizzas"
              onNew={() => {
                setEditing({ type: "pizza" });
                setForm({
                  nombre: "",
                  descripcion: "",
                  precio: 25000,
                  categoria: "Clásicas",
                  popular: 0,
                });
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Pizza</th>
                    <th>Categoría</th>
                    <th>Precio</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pizzas.map((p) => (
                    <tr key={p.id}>
                      <td>{p.nombre}</td>
                      <td>{p.categoria}</td>
                      <td>{money(p.precio)}</td>
                      <td>
                        <button
                          onClick={() => {
                            setEditing(p);
                            setForm(p);
                          }}
                        >
                          Editar
                        </button>
                        <button onClick={() => remove("pizzas", p.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          )}
          {adminTab === "ingredientes" && (
            <AdminTable
              title="Ingredientes"
              onNew={() => {
                setEditing({ type: "ingrediente" });
                setForm({
                  nombre: "",
                  categoria: "General",
                  precio_extra: 0,
                  stock: 100,
                });
              }}
            >
              <table>
                <thead>
                  <tr>
                    <th>Ingrediente</th>
                    <th>Categoría</th>
                    <th>Stock</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((i) => (
                    <tr key={i.id}>
                      <td>{i.nombre}</td>
                      <td>{i.categoria}</td>
                      <td>{i.stock}</td>
                      <td>
                        <button
                          onClick={() => {
                            setEditing(i);
                            setForm(i);
                          }}
                        >
                          Editar
                        </button>
                        <button onClick={() => remove("ingredientes", i.id)}>
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          )}
          {adminTab === "pedidos" && (
            <AdminTable title="Pedidos">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Cliente</th>
                    <th>Total</th>
                    <th>Estado</th>
                    <th>Actualizar</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <td>#{o.id}</td>
                      <td>{o.customer_name}</td>
                      <td>{money(o.total)}</td>
                      <td>{o.estado}</td>
                      <td>
                        <select
                          value={o.estado}
                          onChange={(e) => updateOrder(o.id, e.target.value)}
                        >
                          <option>Confirmado</option>
                          <option>En preparación</option>
                          <option>En camino</option>
                          <option>Entregado</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          )}
          {adminTab === "pagos" && (
            <AdminTable title="Pagos">
              <table>
                <thead>
                  <tr>
                    <th>Referencia</th>
                    <th>Pedido</th>
                    <th>Método</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.referencia}</td>
                      <td>#{p.pedido_id}</td>
                      <td>{p.metodo}</td>
                      <td>{p.estado}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </AdminTable>
          )}
        </main>
      )}

      <footer>
        <div>
          <img src="/assets/pizia-logo.png" alt="pizIA" />
        </div>
        <div>
          <b>PIZIA</b>
          <span>Pizza artesanal + recomendación inteligente</span>
        </div>
        <small>Proyecto académico · SENA · Desarrollo de Software</small>
      </footer>

      {authMode && (
        <Modal
          title={authMode === "login" ? "Ingresar a PIZIA" : "Crear cuenta"}
          onClose={() => setAuthMode(null)}
        >
          <form className="modal-form" onSubmit={authSubmit}>
            {authMode === "register" && (
              <input name="nombre" placeholder="Nombre completo" required />
            )}
            {authMode === "register" && (
              <input name="telefono" placeholder="Teléfono" />
            )}
            {authMode === "register" && (
              <input name="direccion" placeholder="Dirección de entrega" />
            )}
            <input
              name="email"
              type="email"
              placeholder="Correo electrónico"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Contraseña"
              required
            />
            <button className="btn-primary">
              {authMode === "login" ? "Ingresar" : "Crear cuenta"}
            </button>
            {authMode === "login" && (
              <div className="demo-login">
                <b>Acceso administrativo académico</b>
                <span>admin@pizia.local</span>
                <span>Admin12345</span>
              </div>
            )}
            <p>
              ¿No tienes cuenta?{" "}
              <button
                type="button"
                onClick={() =>
                  setAuthMode(authMode === "login" ? "register" : "login")
                }
              >
                {authMode === "login" ? "Crear una" : "Ingresar"}
              </button>
            </p>
          </form>
        </Modal>
      )}

      {checkout && (
        <Modal title="Tu carrito" onClose={() => setCheckout(false)}>
          {cart.length ? (
            <>
              <div className="cart-list">
                {cart.map((item) => (
                  <div className="cart-line" key={item.id}>
                    <img src={imageFor(item)} alt="" />
                    <div>
                      <b>{item.nombre}</b>
                      <span>{money(item.precio)}</span>
                    </div>
                    <div className="qty">
                      <button onClick={() => changeQty(item.id, -1)}>−</button>
                      <b>{item.quantity}</b>
                      <button onClick={() => changeQty(item.id, 1)}>+</button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="cart-total">
                <span>Total</span>
                <b>{money(total)}</b>
              </div>
              {session ? (
                <form className="modal-form" onSubmit={checkoutSubmit}>
                  <input
                    name="phone"
                    defaultValue={session.user.telefono || ""}
                    placeholder="Teléfono"
                    required
                  />
                  <textarea
                    name="address"
                    defaultValue={session.user.direccion || ""}
                    placeholder="Dirección de entrega"
                    required
                  />
                  <div className="payment-grid">
                    {["Efectivo", "Nequi", "Transferencia"].map((method) => (
                      <button
                        type="button"
                        className={payment === method ? "selected" : ""}
                        key={method}
                        onClick={() => setPayment(method)}
                      >
                        {method}
                      </button>
                    ))}
                  </div>
                  <button className="btn-primary">
                    Confirmar pedido · {money(total)}
                  </button>
                </form>
              ) : (
                <button
                  className="btn-primary full"
                  onClick={() => {
                    setCheckout(false);
                    setAuthMode("login");
                  }}
                >
                  Ingresar para comprar
                </button>
              )}
            </>
          ) : (
            <div className="empty-cart">
              <b>Tu carrito está vacío</b>
              <span>Agrega una pizza del menú para comenzar.</span>
              <button
                className="btn-primary"
                onClick={() => {
                  setCheckout(false);
                  nav("menu");
                }}
              >
                Ver menú
              </button>
            </div>
          )}
        </Modal>
      )}

      {editing && editing.type && (
        <Modal
          title={`${editing.type === "pizza" ? "Pizza" : "Ingrediente"} · ${editing.id ? "Editar" : "Nuevo"}`}
          onClose={() => setEditing(null)}
        >
          <form className="modal-form" onSubmit={(e) => save(editing.type, e)}>
            {editing.type === "cliente" ? (
              <>
                <input
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
                <input
                  type="email"
                  value={form.email || ""}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="Correo"
                  required
                />
                <input
                  value={form.telefono || ""}
                  onChange={(e) =>
                    setForm({ ...form, telefono: e.target.value })
                  }
                  placeholder="Teléfono"
                />
                <input
                  value={form.documento || ""}
                  onChange={(e) =>
                    setForm({ ...form, documento: e.target.value })
                  }
                  placeholder="Documento"
                />
                <input
                  value={form.direccion || ""}
                  onChange={(e) =>
                    setForm({ ...form, direccion: e.target.value })
                  }
                  placeholder="Dirección"
                />
                <select
                  value={form.rol || "CLIENTE"}
                  onChange={(e) => setForm({ ...form, rol: e.target.value })}
                >
                  <option>CLIENTE</option>
                  <option>ADMIN</option>
                </select>
              </>
            ) : editing.type === "pizza" ? (
              <>
                <input
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Nombre"
                  required
                />
                <input
                  value={form.descripcion || ""}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Descripción"
                  required
                />
                <input
                  type="number"
                  value={form.precio || ""}
                  onChange={(e) =>
                    setForm({ ...form, precio: Number(e.target.value) })
                  }
                  placeholder="Precio"
                  required
                />
                <input
                  value={form.categoria || ""}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                  placeholder="Categoría"
                  required
                />
              </>
            ) : (
              <>
                <input
                  value={form.nombre || ""}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ingrediente"
                  required
                />
                <input
                  value={form.categoria || ""}
                  onChange={(e) =>
                    setForm({ ...form, categoria: e.target.value })
                  }
                  placeholder="Categoría"
                />
                <input
                  type="number"
                  value={form.precio_extra || 0}
                  onChange={(e) =>
                    setForm({ ...form, precio_extra: Number(e.target.value) })
                  }
                  placeholder="Precio extra"
                />
                <input
                  type="number"
                  value={form.stock || 0}
                  onChange={(e) =>
                    setForm({ ...form, stock: Number(e.target.value) })
                  }
                  placeholder="Stock"
                />
              </>
            )}
            <button className="btn-primary">Guardar cambios</button>
          </form>
        </Modal>
      )}

      {notice && <div className="toast">{notice}</div>}
    </div>
  );
}

function AdminTable({ title, onNew, children }) {
  return (
    <section className="admin-card">
      <div className="admin-card-head">
        <h2>{title}</h2>
        {onNew && (
          <button className="btn-primary small" onClick={onNew}>
            + Nuevo
          </button>
        )}
      </div>
      <div className="table-wrap">{children}</div>
    </section>
  );
}
