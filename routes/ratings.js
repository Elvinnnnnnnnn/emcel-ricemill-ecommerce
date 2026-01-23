const express = require('express');
const router = express.Router();
const db = require('../db.js');
const authController = require('../controllers/auth');

router.post('/ratings', authController.isLoggedIn, (req, res) => {
  const { productId, orderId, rating } = req.body;

  // ✅ FIX: use req.user (not session)
  const userId = req.user.id;

  if (!productId || !orderId || !rating) {
    return res.status(400).json({
      success: false,
      message: 'Missing data'
    });
  }

  // Make sure order belongs to user & is delivered
  const checkOrderSql = `
    SELECT id FROM orders
    WHERE id = ? AND user_id = ? AND status = 'delivered'
  `;

  db.query(checkOrderSql, [orderId, userId], (err, orders) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false });
    }

    if (orders.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Order not eligible for rating'
      });
    }

    const insertSql = `
      INSERT INTO product_ratings (user_id, product_id, order_id, rating)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE rating = VALUES(rating)
    `;

    db.query(
      insertSql,
      [userId, productId, orderId, rating],
      err => {
        if (err) {
          console.error(err);
          return res.status(500).json({ success: false });
        }

        res.json({ success: true });
      }
    );
  });
});

module.exports = router;
