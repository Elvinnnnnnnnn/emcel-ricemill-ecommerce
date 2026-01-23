const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const db = require('../db');

router.post('/checkout', authController.isLoggedIn, (req, res) => {
    const userId = req.user.id;
    const { payment_method, address_id } = req.body;

    if (!payment_method) {
        return res.status(400).json({
            success: false,
            message: 'Payment method is required'
        });
    }

    // 1️⃣ GET CART ITEMS
    const cartSql = `
        SELECT 
            ci.product_id,
            ci.variant_id,
            ci.quantity,
            IFNULL(v.price, p.price) AS price
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants v ON ci.variant_id = v.id
        WHERE ci.user_id = ?
    `;

    db.query(cartSql, [userId], (err, cartItems) => {
        if (err) return res.status(500).json({ success: false, message: 'Cart fetch error' });
        if (!cartItems.length) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        // 2️⃣ CALCULATE TOTAL
        const totalAmount = cartItems.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );

        // 3️⃣ ESTIMATED DELIVERY
        const now = new Date();
        const delivery = new Date(now);
        delivery.setHours(now.getHours() + 5);

        const estimatedDelivery = delivery.toLocaleString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 4️⃣ INSERT ORDER
        const orderSql = `
           INSERT INTO orders
            (user_id, payment, total_amount, status, estimated_delivery, created_at)
            VALUES (?, ?, ?, 'pending', ?, NOW())
          `;


        db.query(orderSql, [
            userId,
            payment_method,
            totalAmount,
            estimatedDelivery,
        ], (err, orderResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ success: false, message: 'Order insert failed' });
            }

            const orderId = orderResult.insertId;

            // 5️⃣ INSERT ORDER ITEMS
            const itemsValues = cartItems.map(item => [
                orderId,
                item.product_id,
                item.variant_id,
                item.quantity,
                item.price
            ]);

            const itemsSql = `
                INSERT INTO order_items
                (order_id, product_id, variant_id, quantity, price)
                VALUES ?
            `;

            db.query(itemsSql, [itemsValues], (err) => {
                if (err) {
                    console.error('ORDER INSERT ERROR:', err.sqlMessage);
                    return res.status(500).json({
                      success: false,
                      message: err.sqlMessage
                  });
                }

                // 6️⃣ CLEAR CART
                db.query('DELETE FROM cart_items WHERE user_id = ?', [userId], () => {
                    res.json({
                        success: true,
                        message: 'Order placed successfully',
                        orderId
                    });
                });
            });
        });
    });
});



module.exports = router;