import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = process.env.VERCEL ? '/tmp' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'store.sqlite');

let dbInstance: Database | null = null;

function getWasmBinary(): Buffer | undefined {
  const possiblePaths = [
    path.resolve(process.cwd(), 'server/sql-wasm.wasm'),
    path.resolve(process.cwd(), 'api/sql-wasm.wasm'),
    path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm'),
    path.resolve(__dirname, 'sql-wasm.wasm'),
    path.resolve(__dirname, '../server/sql-wasm.wasm'),
    path.resolve(__dirname, '../api/sql-wasm.wasm'),
    path.resolve(__dirname, '../node_modules/sql.js/dist/sql-wasm.wasm'),
    '/var/task/server/sql-wasm.wasm',
    '/var/task/api/sql-wasm.wasm',
    '/var/task/node_modules/sql.js/dist/sql-wasm.wasm'
  ];

  for (const p of possiblePaths) {
    try {
      if (fs.existsSync(p)) {
        return fs.readFileSync(p);
      }
    } catch {
      // Continue to next path
    }
  }
  return undefined;
}

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  try {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn('DB_DIR mkdir warning:', err);
  }

  const wasmBinary = getWasmBinary();
  const SQL = await initSqlJs(wasmBinary ? ({ wasmBinary: wasmBinary.buffer as any }) : {});

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn('Lỗi đọc DB_FILE, khởi tạo DB mới:', e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initSchema(dbInstance);
  saveDb();
  return dbInstance;
}

export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.warn('Cảnh báo không thể ghi DB vào ổ đĩa:', err);
  }
}

function initSchema(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK(role IN ('buyer', 'seller')),
      username TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS addresses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address_line TEXT NOT NULL,
      is_default INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price INTEGER NOT NULL,
      original_price INTEGER NOT NULL,
      condition_pct INTEGER NOT NULL,
      condition_detail TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 1,
      image_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cart_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      buyer_id INTEGER NOT NULL,
      subtotal INTEGER NOT NULL,
      shipping_fee INTEGER NOT NULL,
      total INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('pending', 'confirmed', 'shipping', 'delivered', 'completed', 'cancelled')),
      payment_method TEXT NOT NULL CHECK(payment_method IN ('card', 'napas', 'cod')),
      payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid', 'paid', 'refunded')),
      card_last4 TEXT,
      card_type TEXT,
      recipient_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      address TEXT NOT NULL,
      note TEXT,
      carrier TEXT,
      tracking_code TEXT,
      cancel_reason TEXT,
      coupon_code TEXT,
      discount_amount INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (buyer_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percent', 'fixed', 'shipping')),
      value INTEGER NOT NULL,
      max_discount INTEGER,
      min_order_amount INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      usage_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
      comment TEXT NOT NULL,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(order_id, product_id),
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS wishlists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(user_id, product_id),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      price INTEGER NOT NULL,
      quantity INTEGER NOT NULL,
      condition_pct INTEGER NOT NULL,
      image_url TEXT NOT NULL,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_status_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      from_status TEXT,
      to_status TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      actor_name TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS shipment_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      location TEXT NOT NULL,
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      order_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migrate columns for existing orders table if needed
  try {
    const columns = db.exec("PRAGMA table_info(orders)");
    if (columns.length > 0) {
      const colNames = columns[0].values.map((v: any) => v[1]);
      if (!colNames.includes('coupon_code')) {
        db.run('ALTER TABLE orders ADD COLUMN coupon_code TEXT');
      }
      if (!colNames.includes('discount_amount')) {
        db.run('ALTER TABLE orders ADD COLUMN discount_amount INTEGER DEFAULT 0');
      }
    }
  } catch (e) {
    console.warn('Migration warning:', e);
  }
}

export function createNotification(userId: number, orderId: number | null, type: string, title: string, message: string): void {
  run(`
    INSERT INTO notifications (user_id, order_id, type, title, message, is_read)
    VALUES (?, ?, ?, ?, ?, 0)
  `, [userId, orderId, type, title, message]);
}

export function queryAll<T = any>(sql: string, params: any[] = []): T[] {
  if (!dbInstance) throw new Error('Database not initialized');
  const stmt = dbInstance.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(sql: string, params: any[] = []): T | null {
  const rows = queryAll<T>(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

export function run(sql: string, params: any[] = []): { changes: number; lastInsertRowid: number } {
  if (!dbInstance) throw new Error('Database not initialized');
  dbInstance.run(sql, params);
  
  // Get last insert rowid & changes
  const rowidRes = dbInstance.exec('SELECT last_insert_rowid() AS id, changes() AS changes');
  let lastInsertRowid = 0;
  let changes = 0;
  if (rowidRes.length > 0 && rowidRes[0].values.length > 0) {
    lastInsertRowid = Number(rowidRes[0].values[0][0]);
    changes = Number(rowidRes[0].values[0][1]);
  }
  saveDb();
  return { changes, lastInsertRowid };
}
