import { Pool } from "pg";

// Database connection pool
// Set DATABASE_URL in your .env.local
// Example: postgresql://user:password@host:port/database

let pool: Pool | null = null;

export function getDbPool(): Pool {
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
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    pool.on("error", (err) => {
      console.error("Unexpected error on idle client", err);
    });
  }

  return pool;
}

// Helper function to execute queries
export async function query<T = unknown>(text: string, params?: unknown[]): Promise<T[]> {
  const pool = getDbPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

// Helper function to execute a single row query
export async function queryOne<T = unknown>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] || null;
}

// Test database connection
export async function testConnection(): Promise<boolean> {
  try {
    await query("SELECT 1");
    return true;
  } catch (error) {
    console.error("Database connection test failed:", error);
    return false;
  }
}

