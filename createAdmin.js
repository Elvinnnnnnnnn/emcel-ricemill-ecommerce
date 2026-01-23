const bcrypt = require('bcryptjs');
const db = require('./db'); // make sure this is your existing DB connection

async function createAdmin() {
    const username = 'Admin Bernabe';       // choose your admin username
    const displayName = 'Elvin Bernabe';  // optional display name
    const password = 'admin123';       // password you want
    const hashedPassword = await bcrypt.hash(password, 10); // hash password

    const sql = 'INSERT INTO admins (username, display_name, password) VALUES (?, ?, ?)';

    db.query(sql, [username, displayName, hashedPassword], (err, result) => {
        if (err) {
            console.error("Error creating admin:", err);
        } else {
            console.log(`✅ Admin created successfully! Username: ${username} Password: ${password}`);
        }
        process.exit();
    });
}

createAdmin();
