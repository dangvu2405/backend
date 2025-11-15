const sql = require('mssql');
require('dotenv').config(); // load biến môi trường từ .env

const sqlConfig = {
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  server: process.env.SQL_SERVER,
  database: process.env.SQL_DATABASE,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    port: parseInt(process.env.SQL_PORT) || 1433
  }
};


async function connectSQL() {
  try {
    const pool = await sql.connect(sqlConfig);
    console.log('✅ Connected to SQL Server');
    return pool;
  } catch (err) {
    console.error('❌ SQL Server connection error:', err);
  }
}

module.exports = { connectSQL };
