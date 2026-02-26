// db.js
const mysql = require("mysql2");
const dotenv = require("dotenv");
dotenv.config({ path: './.env' });

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE,
  port: 3306
});

db.connect((err) => {
  if (err) {
    console.log("DB connection error:", err);
  } else {
    console.log("MYSQL Connected....");
  }
});

module.exports = db;
