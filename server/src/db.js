import { DatabaseSync } from 'node:sqlite';

const db = new DatabaseSync('pizia.db');
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS clientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT DEFAULT '',
  documento TEXT DEFAULT '',
  direccion TEXT DEFAULT '',
  password_hash TEXT,
  password_salt TEXT,
  rol TEXT NOT NULL DEFAULT 'CLIENTE',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS ingredientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL DEFAULT 'General',
  precio_extra INTEGER NOT NULL DEFAULT 0,
  stock INTEGER NOT NULL DEFAULT 100,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pizzas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  precio INTEGER NOT NULL,
  categoria TEXT NOT NULL,
  emoji TEXT NOT NULL DEFAULT '🍕',
  color TEXT NOT NULL DEFAULT '#91D7F4',
  popular INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS pizza_ingredientes (
  pizza_id INTEGER NOT NULL,
  ingrediente_id INTEGER NOT NULL,
  PRIMARY KEY (pizza_id, ingrediente_id),
  FOREIGN KEY (pizza_id) REFERENCES pizzas(id) ON DELETE CASCADE,
  FOREIGN KEY (ingrediente_id) REFERENCES ingredientes(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS pedidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cliente_id INTEGER NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  total INTEGER NOT NULL,
  metodo_pago TEXT NOT NULL DEFAULT 'Efectivo',
  estado TEXT NOT NULL DEFAULT 'Confirmado',
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cliente_id) REFERENCES clientes(id)
);
CREATE TABLE IF NOT EXISTS detalle_pedido (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL,
  pizza_id INTEGER NOT NULL,
  cantidad INTEGER NOT NULL,
  precio_unitario INTEGER NOT NULL,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE,
  FOREIGN KEY (pizza_id) REFERENCES pizzas(id)
);
CREATE TABLE IF NOT EXISTS pagos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pedido_id INTEGER NOT NULL UNIQUE,
  metodo TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'Pendiente',
  referencia TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pedido_id) REFERENCES pedidos(id) ON DELETE CASCADE
);
`);

const seed = db.prepare('SELECT COUNT(*) count FROM pizzas').get().count;
if (!seed) {
  const addPizza = db.prepare('INSERT INTO pizzas (nombre, descripcion, precio, categoria, emoji, color, popular) VALUES (?, ?, ?, ?, ?, ?, ?)');
  [
    ['Pizza Margarita','Tomate San Marzano, mozzarella fresca, albahaca y aceite de oliva.',25000,'Clásicas','🍕','#EFE4D5',1],
    ['Pizza Vegetariana','Champiñones, pimentón, cebolla morada, aceitunas y mozzarella.',27000,'Veggie','🌿','#DCE8D7',0],
    ['Pizza Chicken BBQ','Pollo horneado, mozzarella, cebolla caramelizada y salsa BBQ.',30000,'Favoritas','🍗','#E8D5C2',1],
    ['Pizza Hawaiana','Jamón, piña dorada, mozzarella y salsa de tomate de la casa.',28000,'Favoritas','🍍','#F0DFAF',1],
    ['Pizza Pepperoni','Pepperoni, mozzarella, salsa de tomate y orégano fresco.',29000,'Favoritas','🌶️','#E8C8C2',1],
    ['Pizza Mexicana','Carne sazonada, jalapeño, pimentón, cebolla y mozzarella.',32000,'Especiales','🌶️','#E1C7BA',0],
    ['Pizza Cuatro Quesos','Mozzarella, parmesano, provolone y un toque de queso azul.',31000,'Clásicas','🧀','#E7DED3',1],
    ['Pizza Napolitana','Tomate, mozzarella, albahaca, ajo y aceite de oliva extra virgen.',26000,'Clásicas','🍅','#E9D9CE',0]
  ].forEach(p => addPizza.run(...p));
}
if (db.prepare('SELECT COUNT(*) count FROM ingredientes').get().count === 0) {
  const add = db.prepare('INSERT INTO ingredientes (nombre,categoria,precio_extra,stock) VALUES (?,?,?,?)');
  [['Mozzarella','Quesos',3000,100],['Pepperoni','Carnes',4500,80],['Jamón','Carnes',3500,80],['Piña','Frutas',2500,60],['Champiñones','Vegetales',2500,70],['Pimentón','Vegetales',1800,90],['Aceitunas','Vegetales',1800,70],['Albahaca','Vegetales',1200,100],['Parmesano','Quesos',3000,60],['Pollo','Carnes',4500,70]].forEach(x=>add.run(...x));
}

export default db;
