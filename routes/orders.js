const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth');
const db = require('../db');

router.post('/checkout', authController.isLoggedIn, (req, res) => {

    const userId = req.user.id;
    const { payment_method } = req.body;

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

        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Cart fetch error'
            });
        }

        if (!cartItems.length) {
            return res.status(400).json({
                success: false,
                message: 'Cart is empty'
            });
        }

        // 🔒 STOCK VALIDATION BEFORE ORDER
        let checked = 0;
        let hasError = false;

        cartItems.forEach((item) => {

            const stockSql = 'SELECT stock FROM product_variants WHERE id = ?';

            db.query(stockSql, [item.variant_id], (stockErr, stockResult) => {

                if (hasError) return;

                if (stockErr || stockResult.length === 0) {
                    hasError = true;
                    return res.status(400).json({
                        success: false,
                        message: 'Variant not found'
                    });
                }

                const availableStock = stockResult[0].stock;

                if (item.quantity > availableStock) {
                    hasError = true;
                    return res.status(400).json({
                        success: false,
                        message: `Only ${availableStock} sacks available`
                    });
                }

                checked++;

                if (checked === cartItems.length && !hasError) {

                    const totalAmount = cartItems.reduce(
                        (sum, item) => sum + item.price * item.quantity,
                        0
                    );

                    continueOrder(totalAmount);
                }

            });

        });

        function continueOrder(totalAmount) {

            // ===== SHIPPING =====
            const SHIPPING_FEE = 50;

            const subtotal = totalAmount;
            const finalTotal = subtotal + SHIPPING_FEE;

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
                (user_id, payment, total_amount, shipping_fee, status, estimated_delivery, created_at)
                VALUES (?, ?, ?, ?, 'pending', ?, NOW())
            `;

            db.query(orderSql, [
                userId,
                payment_method,
                finalTotal,
                SHIPPING_FEE,
                estimatedDelivery
            ], (orderErr, orderResult) => {

                if (orderErr) {
                    return res.status(500).json({
                        success: false,
                        message: 'Order insert failed'
                    });
                }

                const orderId = orderResult.insertId;

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

                db.query(itemsSql, [itemsValues], (itemsErr) => {

                    if (itemsErr) {
                        return res.status(500).json({
                            success: false,
                            message: itemsErr.sqlMessage
                        });
                    }

                    let updated = 0;

                    cartItems.forEach(item => {

                        const reduceSql = `
                            UPDATE product_variants
                            SET stock = stock - ?
                            WHERE id = ?
                        `;

                        db.query(reduceSql, [item.quantity, item.variant_id], () => {

                            updated++;

                            if (updated === cartItems.length) {

                                db.query(
                                    'DELETE FROM cart_items WHERE user_id = ?',
                                    [userId],
                                    () => {
                                        res.json({
                                            success: true,
                                            message: 'Order placed successfully',
                                            orderId
                                        });
                                    }
                                );

                            }

                        });

                    });

                });

            });

        }

    });

});

module.exports = router;