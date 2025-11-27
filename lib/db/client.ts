import { Pool, PoolClient } from "pg";
import { DB_POOL_CONFIG } from "@/lib/constants";

/**
 * Database Connection Pool Manager
 * 
 * Provides a singleton connection pool with:
 * - Automatic SSL detection for cloud providers
 * - Graceful shutdown handling
 * - Connection health monitoring
 * 
 * @module lib/db/client
 */

let pool: Pool | null = null;
let isShuttingDown = false;

/**
 * Get or create the database connection pool
 * 
 * @returns Database pool instance
 * @throws Error if DATABASE_URL is not set
 */
export function getDbPool(): Pool {
  if (isShuttingDown) {
    throw new Error("Database pool is shutting down");
  }
  
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }

    // Supabase and most cloud providers require SSL
    const requiresSSL = connectionString.includes("supabase") || 
                        connectionString.includes("neon") || 
                        connectionString.includes("railway") ||
                        process.env.NODE_ENV === "production";
    
    pool = new Pool({
      connectionString,
      ssl: requiresSSL ? { rejectUnauthorized: false } : false,
      max: DB_POOL_CONFIG.MAX_CONNECTIONS,
      idleTimeoutMillis: DB_POOL_CONFIG.IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: DB_POOL_CONFIG.CONNECTION_TIMEOUT_MS,
    });

    // Handle pool errors gracefully
    pool.on("error", (err, client) => {
      console.error("[DB] Unexpected error on idle client:", err.message);
    });

    // Log pool creation
    console.log("[DB] Connection pool created", {
      maxConnections: DB_POOL_CONFIG.MAX_CONNECTIONS,
      ssl: requiresSSL,
    });
    
    // Register graceful shutdown handlers
    registerShutdownHandlers();
  }

  return pool;
}

/**
 * Register handlers for graceful shutdown
 */
function registerShutdownHandlers(): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    
    console.log(`[DB] Received ${signal}, closing pool...`);
    
    if (pool) {
      try {
        await pool.end();
        console.log("[DB] Pool closed successfully");
      } catch (err) {
        console.error("[DB] Error closing pool:", err);
      }
      pool = null;
    }
  };
  
  // Only register in Node.js environment (not in browser/edge)
  if (typeof process !== "undefined" && process.on) {
    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));
  }
}

/**
 * Execute a SQL query and return all rows
 * 
 * @typeParam T - Expected row type
 * @param text - SQL query string with $1, $2 placeholders
 * @param params - Query parameters (prevents SQL injection)
 * @returns Array of typed rows
 * 
 * @example
 * const users = await query<User>("SELECT * FROM users WHERE active = $1", [true]);
 */
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getDbPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

/**
 * Execute a SQL query and return first row only
 * 
 * @typeParam T - Expected row type
 * @param text - SQL query string
 * @param params - Query parameters
 * @returns First row or null if no results
 * 
 * @example
 * const user = await queryOne<User>("SELECT * FROM users WHERE id = $1", [userId]);
 */
export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Execute a query within a transaction
 * 
 * @param callback - Function receiving a client to execute queries
 * @returns Result of callback
 * 
 * @example
 * await withTransaction(async (client) => {
 *   await client.query("INSERT INTO users...", [...]);
 *   await client.query("INSERT INTO profiles...", [...]);
 * });
 */
export async function withTransaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const pool = getDbPool();
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Test database connection health
 * 
 * @returns true if connection is healthy
 */
export async function testConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch (error) {
    console.error("[DB] Connection test failed:", error);
    return false;
  }
}

/**
 * Get current pool statistics (for monitoring)
 */
export function getPoolStats(): {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
} | null {
  if (!pool) return null;
  
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

