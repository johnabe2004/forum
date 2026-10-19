import mysql from "mysql2/promise";
import env from "./env.js";

// Create a MySQL connection pool so the application can
// efficiently reuse database connections across requests.
const pool = mysql.createPool({
  host: env.database.host,
  port: env.database.port,
  user: env.database.user,
  password: env.database.password,
  database: env.database.name,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool;
