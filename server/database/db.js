const mysql = require('mysql2');
require('dotenv').config();

const pool = mysql.createPool({
  host:                  process.env.DB_HOST     || 'localhost',
  port:                  process.env.DB_PORT     || 3307,
  user:                  process.env.DB_USER     || 'root',
  password:              process.env.DB_PASSWORD || '',
  database:              process.env.DB_NAME     || 'stall_rental_db',
  waitForConnections:    true,
  connectionLimit:       Number(process.env.DB_POOL_LIMIT) || 20,
  queueLimit:            50,
  connectTimeout:        10000,
  idleTimeout:           60000,
  enableKeepAlive:       true,
  keepAliveInitialDelay: 0,
  dateStrings:           true,
  timezone:              '+00:00',
  charset:               'utf8mb4',
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('\n❌ DATABASE CONNECTION FAILED');
    console.error('   Code:', err.code, '|', err.message);
    if (err.code === 'ECONNREFUSED')           console.error('   FIX: Start MySQL/XAMPP');
    if (err.code === 'ER_ACCESS_DENIED_ERROR') console.error('   FIX: Wrong DB_USER/DB_PASSWORD in .env');
    if (err.code === 'ER_BAD_DB_ERROR')        console.error('   FIX: Run schema.sql in phpMyAdmin');
    return;
  }
  console.log(`✅ MySQL pool connected → ${process.env.DB_NAME} (limit: ${process.env.DB_POOL_LIMIT || 20})`);
  connection.release();
});

pool.on('enqueue', () => console.warn('⚠️  DB pool: all connections busy, request queued.'));

module.exports = promisePool;