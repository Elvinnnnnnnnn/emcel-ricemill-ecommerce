// controllers/adminAuth.js
const db = require('../db');
const bcrypt = require('bcryptjs');
const session = require('express-session');

// ADMIN LOGIN
exports.adminLogin = (req, res) => {
    const { username, password } = req.body;

    db.query('SELECT * FROM admins WHERE username = ?', [username], async (err, results) => {
        if (err) return res.render('admin-login', { message: 'Database error' });
        if (results.length === 0) return res.render('admin-login', { message: 'Admin not found' });

        const admin = results[0];
        const match = await bcrypt.compare(password, admin.password);
        if (!match) return res.render('admin-login', { message: 'Incorrect password' });

        // Store admin info in session
        req.session.admin = admin;
        res.redirect('/admin/dashboard'); // redirect to admin dashboard
    });
};

// PROTECT ADMIN ROUTES (page + API safe)
exports.isAdminLoggedIn = (req, res, next) => {
    if (req.session && req.session.admin) {
        return next();
    }

    // 🔥 If request expects JSON (fetch / AJAX)
    const acceptsJSON =
        req.headers.accept?.includes('application/json') ||
        req.headers['x-requested-with'] === 'XMLHttpRequest';

    if (acceptsJSON) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    // Normal browser navigation
    res.redirect('/admin/login');
};

// LOGOUT
exports.logoutAdmin = (req, res) => {
    req.session.destroy(err => {
        if (err) console.log(err);
        res.redirect('/admin/login');
    });
};
