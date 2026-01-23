const bcrypt = require('bcrypt');
const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',          // <-- your DB password
  database: 'your_db'    // <-- your DB name
});

async function reset() {
  const hash = await bcrypt.hash('admin123', 10);

  db.query(
    "UPDATE admins SET password = ? WHERE admin_id = 1",
    [hash],
    (err) => {
      if (err) throw err;
      console.log("✅ Admin password reset to: admin123");
      process.exit();
    }
  );
}

reset();
