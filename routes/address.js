const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const db = require('../db');

// ===== SAVE NEW ADDRESS =====
router.post('/', authController.isLoggedIn, (req, res) => {
  const userId = req.user.id;

  const {
    firstname,
    lastname,
    address,
    city,
    region,
    postal,
    phone
  } = req.body;

  // Insert into shipping_details, without order_id (we'll set that later if needed)
  const sql = `
    INSERT INTO shipping_details
    (user_id, firstname, lastname, address, city, region, postal, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [userId, firstname, lastname, address, city, region, postal, phone], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({
        success: false,
        message: 'Failed to save address'
      });
    }

    res.json({
      success: true,
      message: 'Address saved successfully'
    });
  });
});

// ===== GET ALL ADDRESSES FOR LOGGED-IN USER =====
router.get('/', authController.isLoggedIn, (req, res) => {
  const userId = req.user.id;

  const sql = 'SELECT * FROM shipping_details WHERE user_id = ?';
  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }
    res.json(results);
  });
});

// ===== GET SINGLE ADDRESS BY ID =====
router.get('/:id', authController.isLoggedIn, (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  const sql = 'SELECT * FROM shipping_details WHERE id = ? AND user_id = ?';
  db.query(sql, [addressId, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Address not found' });
    }

    res.json(results[0]);
  });
});

// ===== UPDATE AN ADDRESS =====
router.patch('/:id', authController.isLoggedIn, (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  const { firstname, lastname, address, city, region, postal, phone } = req.body;

  const sql = `
    UPDATE shipping_details
    SET firstname=?, lastname=?, address=?, city=?, region=?, postal=?, phone=?
    WHERE id=? AND user_id=?
  `;

  db.query(sql, [firstname, lastname, address, city, region, postal, phone, addressId, userId], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Failed to update address' });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Address not found or not yours' });
    }

    res.json({ success: true, message: 'Address updated successfully' });
  });
});

// ===== DELETE AN ADDRESS =====
router.delete('/:id', authController.isLoggedIn, (req, res) => {
  const addressId = req.params.id;
  const userId = req.user.id;

  const sql = 'DELETE FROM shipping_details WHERE id=? AND user_id=?';
  db.query(sql, [addressId, userId], (err, result) => {
    if (err) {
      console.error('MySQL Error:', err); // <-- Now you’ll see the full error
      return res.status(500).json({
        success: false,
        message: 'Failed to delete address',
        error: err.message
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Address not found or not yours' });
    }

    console.log('Address deleted successfully, affectedRows:', result.affectedRows);
    res.json({ success: true, message: 'Address deleted successfully' });
  });
});

module.exports = router;
