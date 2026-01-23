const db = require('../db');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// REGISTER
exports.register = (req, res) => {
    const { firstname, lastname, email, password, confirmPassword } = req.body;

    db.query('SELECT email FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) return res.render('login', { message: 'Database error' });

        if (results.length > 0) return res.render('login', { message: 'Email already in use' });
        if (password !== confirmPassword) return res.render('login', { message: 'Passwords do not match' });

        const hashedPassword = await bcrypt.hash(password, 8);

        db.query(
            'INSERT INTO users SET ?',
            { firstname, lastname, email, password: hashedPassword },
            (error) => {
                if (error) return res.render('login', { message: 'Database error' });
                return res.render('login', { message: 'User registered successfully' });
            }
        );
    });
};

// LOGIN
exports.login = (req, res) => {
    const { email, password } = req.body;

    db.query('SELECT * FROM users WHERE email = ?', [email], async (error, results) => {
        if (error) return res.render('login', { message: 'Database error' });
        if (results.length === 0) return res.render('login', { message: 'Email not found' });

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.render('login', { message: 'Incorrect password' });

        const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN
        });

        const cookieOptions = {
            expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000),
            httpOnly: true
        };

        res.cookie('jwt', token, cookieOptions);
        res.redirect('/');
    });
};

// IS LOGGED IN MIDDLEWARE
exports.isLoggedIn = (req, res, next) => {
    const token = req.cookies.jwt;
    if (!token) {
        req.user = null; // no user
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        db.query('SELECT * FROM users WHERE id = ?', [decoded.id], (err, results) => {
            if (err || !results || results.length === 0) {
                req.user = null;
            } else {
                req.user = results[0];
            }
            next();
        });
    } catch {
        req.user = null;
        next();
    }
};

// PROTECT ROUTES (ensures user exists)
exports.protect = (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'User not logged in' });
    next();
};

// LOGOUT
exports.logout = (req, res) => {
    res.cookie('jwt', 'logout', {
        expires: new Date(Date.now() + 2 * 1000),
        httpOnly: true
    });
    res.redirect('/');
};
