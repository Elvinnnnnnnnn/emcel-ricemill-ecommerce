const express = require('express');
const router = express.Router();
const db = require('../db.js');
const authController = require('../controllers/auth');

// Add to cart
router.post('/add', authController.isLoggedIn, (req, res) => {
  const userId = req.user.id;
  const { productId, quantity, price, variantId } = req.body;

  const checkSql = 'SELECT * FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id = ?';
  db.query(checkSql, [userId, productId, variantId], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err });

    if (result.length > 0) {
      const updateSql = 'UPDATE cart_items SET quantity = quantity + ? WHERE id = ?';
      db.query(updateSql, [quantity, result[0].id], (err2) => {
        if (err2) return res.status(500).json({ success: false, error: err2 });
        res.json({ success: true });
      });
    } else {
      const insertSql = 'INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)';
      db.query(insertSql, [userId, productId, variantId, quantity], (err3) => {
        if (err3) return res.status(500).json({ success: false, error: err3 });
        res.json({ success: true });
      });
    }
  });
});

// Get cart items
router.get('/', authController.isLoggedIn, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Not logged in' });
  }
  const userId = req.user.id;
  const sql = `
    SELECT 
      ci.id AS cartId, 
      ci.quantity, 
      p.id AS productId, 
      p.name, 
      p.image, 
      IFNULL(v.price, p.price) AS price,
      IFNULL(CONCAT(v.kilograms,'kg'), CONCAT(p.kilograms,'kg')) AS variant
    FROM cart_items ci
    JOIN products p ON ci.product_id = p.id
    LEFT JOIN product_variants v ON ci.variant_id = v.id
    WHERE ci.user_id = ?
  `;
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json(results);
  });
});

// Update quantity
router.patch('/:id', authController.isLoggedIn, (req, res) => {
  const { quantity } = req.body;
  const cartId = req.params.id;
  const sql = 'UPDATE cart_items SET quantity = ? WHERE id = ?';
  db.query(sql, [quantity, cartId], (err) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ success: true });
  });
});

// Remove item
router.delete('/:id', authController.isLoggedIn, (req, res) => {
  const cartId = req.params.id;
  const sql = 'DELETE FROM cart_items WHERE id = ?';
  db.query(sql, [cartId], (err) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ success: true });
  });
});

module.exports = router;
