const express = require('express');
const router = express.Router();
const db = require('../db.js');
const authController = require('../controllers/auth');

// ===== GET ALL ADDRESSES FOR A USER =====
router.get('/', authController.isLoggedIn, async (req, res) => {
    const userId = req.user.id;
    try {
        const [rows] = await db.query('SELECT * FROM delivery_addresses WHERE user_id = ?', [userId]);
        res.json(rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== ADD NEW ADDRESS =====
router.post('/', authController.isLoggedIn, async (req, res) => {
    const userId = req.user.id;
    const { first_name, last_name, company, address, apartment, postal, city, region, phone } = req.body;

    try {
        await db.query(
            `INSERT INTO delivery_addresses 
            (user_id, first_name, last_name, company, address, apartment, postal, city, region, phone)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [userId, first_name, last_name, company, address, apartment, postal, city, region, phone]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== EDIT / UPDATE ADDRESS =====
router.patch('/:id', authController.isLoggedIn, async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;
    const { first_name, last_name, company, address, apartment, postal, city, region, phone } = req.body;

    try {
        await db.query(
            `UPDATE delivery_addresses 
             SET first_name=?, last_name=?, company=?, address=?, apartment=?, postal=?, city=?, region=?, phone=?
             WHERE id=? AND user_id=?`,
            [first_name, last_name, company, address, apartment, postal, city, region, phone, addressId, userId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// ===== DELETE ADDRESS =====
router.delete('/:id', authController.isLoggedIn, async (req, res) => {
    const userId = req.user.id;
    const addressId = req.params.id;

    try {
        await db.query('DELETE FROM delivery_addresses WHERE id=? AND user_id=?', [addressId, userId]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
