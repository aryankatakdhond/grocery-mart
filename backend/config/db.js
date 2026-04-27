// ============================================
// config/db.js — MySQL Database Connection
// ============================================

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const mysql = require('mysql2');

//console.log('DB_PASSWORD:', process.env.DB_PASSWORD); // debug line

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'grocerymart',
  charset:  'utf8mb4',
  waitForConnections: true,
  connectionLimit:    10,
  queueLimit:         0
});

const promisePool = pool.promise();

pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connected!');
    connection.release();
  }
});

module.exports = promisePool;