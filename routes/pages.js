const express = require('express');
const authController = require('../controllers/auth');
const router = express.Router();
const db = require('../db.js');
const path = require('path'); // needed for image paths

// ===== Helper to fetch products with variants =====
function getProductsWithVariants(callback) {
    const sql = `
        SELECT 
            p.id AS productId,
            p.name,
            p.description,
            p.image,

            -- ⭐ RATINGS
            ROUND(AVG(pr.rating), 1) AS avg_rating,
            COUNT(pr.id) AS rating_count,

            -- VARIANTS
            v.id AS variantId,
            v.price,
            v.stock,
            v.kilograms
        FROM products p
        LEFT JOIN product_variants v 
            ON p.id = v.product_id
        LEFT JOIN product_ratings pr 
            ON p.id = pr.product_id
        WHERE p.is_active = 1
        GROUP BY 
            p.id, v.id
    `;

    db.query(sql, (err, rows) => {
        if (err) return callback(err);

        const productsMap = {};

        rows.forEach(row => {
            if (!productsMap[row.productId]) {
                productsMap[row.productId] = {
                    id: row.productId,
                    name: row.name,
                    description: row.description,
                    image: row.image,

                    // ⭐ ATTACH RATINGS
                    avg_rating: row.avg_rating || 0,
                    rating_count: row.rating_count || 0,

                    variants: []
                };
            }

            if (row.variantId) {
                productsMap[row.productId].variants.push({
                    id: row.variantId,
                    price: row.price,
                    stock: row.stock,
                    kilograms: row.kilograms
                });
            }
        });

        callback(null, Object.values(productsMap));
    });
}

// ===== Home page =====
// ===== Home page with correct order totals =====
router.get('/', authController.isLoggedIn, (req, res) => {
    const userId = req.user ? req.user.id : null;

    getProductsWithVariants((err, products) => {
        if (err) return res.status(500).send("Database error");

        if (!userId) {
            return res.render('index', {
                user: null,
                products,
                currentOrder: null,
                addresses: [],
                orders: []
            });
        }

        // Fetch orders
        const ordersSql = `
            SELECT 
                o.id,
                o.status,
                o.estimated_delivery
            FROM orders o
            WHERE o.user_id = ?
            ORDER BY o.id DESC
        `;

        const addressesSql = `SELECT * FROM shipping_details WHERE user_id = ?`;

        db.query(ordersSql, [userId], (err, ordersResult) => {
            if (err) {
                console.error('Orders fetch error:', err);
                return res.status(500).send("Orders fetch error");
            }

            // Calculate totals for each order
            const orderIds = ordersResult.map(o => o.id);
            if (orderIds.length === 0) {
                // No orders
                db.query(addressesSql, [userId], (err, addressesResult) => {
                    if (err) return res.status(500).send("Address error");
                    res.render('index', {
                        user: req.user,
                        products,
                        currentOrder: null,
                        addresses: addressesResult || [],
                        orders: []
                    });
                });
                return;
            }

            db.query(
                `SELECT order_id, SUM(quantity * price) AS total_amount FROM order_items WHERE order_id IN (?) GROUP BY order_id`,
                [orderIds],
                (err, totalsResult) => {
                    if (err) {
                        console.error('Totals fetch error:', err);
                        return res.status(500).send("Totals fetch error");
                    }

                    // Map totals to orders
                    const totalsMap = {};
                    totalsResult.forEach(t => {
                        totalsMap[t.order_id] = t.total_amount;
                    });

                    ordersResult.forEach(order => {
                        order.total_amount = totalsMap[order.id] || 0;
                    });

                    db.query(addressesSql, [userId], (err, addressesResult) => {
                        if (err) return res.status(500).send("Address error");

                        const currentOrder = ordersResult.length ? ordersResult[0] : null;

                        res.render('index', {
                            user: req.user,
                            products,
                            currentOrder,
                            addresses: addressesResult || [],
                            orders: ordersResult || []
                        });
                    });
                }
            );
        });
    });
});


// ===== Alternative /index route =====
router.get('/index', authController.isLoggedIn, (req, res) => {
    getProductsWithVariants((err, products) => {
        if (err) { 
          console.log(err); 
          return res.status(500).send("Database error"); 
        }

        res.render('index', { 
          user: req.user || null,
          products,
          currentOrder: null,
          addresses: [],
          orders: []
        });
    });
});


// ===== Login page =====
router.get('/login', (req, res) => {
    res.render('login', { message: null });
});

// ===== Products page =====
router.get('/products', authController.isLoggedIn, (req, res) => {
    getProductsWithVariants((err, products) => {
        if (err) { console.log(err); return res.status(500).send("Database error"); }
        res.render('products', { user: req.user || null, products });
    });
});

// ===== Checkout page (GET) =====
router.get('/checkout', authController.isLoggedIn, (req, res) => {
    if (!req.user) return res.redirect('/login');

    const userId = req.user.id;

    const cartSql = `
        SELECT 
            ci.quantity, ci.product_id, ci.variant_id,
            IFNULL(v.price, p.price) AS price,
            p.name, p.image AS image,
            v.kilograms
        FROM cart_items ci
        JOIN products p ON ci.product_id = p.id
        LEFT JOIN product_variants v ON ci.variant_id = v.id
        WHERE ci.user_id = ?
    `;
    const addressSql = `SELECT * FROM shipping_details WHERE user_id = ? LIMIT 1`;

    db.query(addressSql, [userId], (err, addressResult) => {
        if (err) return res.status(500).send('Error loading address');
        const address = addressResult[0] || {};

        db.query(cartSql, [userId], (err, cartItems) => {
            if (err) return res.status(500).send('Error loading cart items');

            cartItems = cartItems.map(item => ({
                ...item,
                image: item.image ? `/product_photos/${path.basename(item.image)}` : '/Photos/default.png'
            }));

            if (cartItems.length === 0) {
                return res.status(400).send("Cannot place an order with empty cart");
            }

            const totalAmount = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
            if (totalAmount === 0) {
                return res.status(400).send("Cart items have invalid prices");
}


            const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

            res.render('checkout', {
                user: req.user,
                cartItems,
                total,
                address
            });
        });
    });
});

// ===== Delivery addresses API =====
router.get('/delivery', authController.isLoggedIn, (req, res) => {
    const userId = req.user.id;
    db.query('SELECT * FROM shipping_details WHERE user_id = ?', [userId], (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(results);
    });
});

router.post('/delivery', authController.isLoggedIn, (req, res) => {
    const userId = req.user.id;
    const { firstname, lastname, address, city, region, postal, phone } = req.body;

    const sql = `INSERT INTO shipping_details (order_id, firstname, lastname, address, city, region, postal, phone, user_id)
                 VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?)`;

    db.query(sql, [firstname, lastname, address, city, region, postal, phone, userId], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json({ success: true });
    });
});

router.delete('/delivery/:id', authController.isLoggedIn, (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.id;

    const sql = 'DELETE FROM shipping_details WHERE id = ? AND user_id = ?';
    db.query(sql, [addressId, userId], (err, result) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, error: 'Address not found or not yours' });
        }

        res.json({ success: true });
    });
});

router.get('/delivery/:id', authController.isLoggedIn, (req, res) => {
    const addressId = req.params.id;
    const userId = req.user.id;

    const sql = 'SELECT * FROM shipping_details WHERE id = ? AND user_id = ?';
    db.query(sql, [addressId, userId], (err, results) => {
        if (err) return res.status(500).json({ success: false, error: 'Database error' });

        if (results.length === 0) {
            return res.status(404).json({ success: false, error: 'Address not found' });
        }

        res.json(results[0]);
    });
});

router.get('/my-orders', authController.isLoggedIn, (req, res) => {
    res.redirect("/");
});

// ===== Order Details (for Order History expand) =====
router.get('/orders/:id/details', authController.isLoggedIn, (req, res) => {
    const orderId = req.params.id;
    const userId = req.user.id;

    const sql = `
        SELECT 
            oi.product_id,
            p.name,
            oi.quantity,
            oi.price,
            v.kilograms
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        LEFT JOIN product_variants v ON oi.variant_id = v.id
        JOIN orders o ON oi.order_id = o.id
        WHERE oi.order_id = ?
          AND o.user_id = ?
    `;

    db.query(sql, [orderId, userId], (err, results) => {
        if (err) {
            console.error('Order details error:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            items: results
        });
    });
});

router.get('/payment/:orderId', authController.isLoggedIn, (req, res) => {
  const orderId = req.params.orderId;
  const userId = req.user.id;

  const sql = `
    SELECT id, payment, total_amount
    FROM orders
    WHERE id = ? AND user_id = ?
  `;

  db.query(sql, [orderId, userId], (err, results) => {
    if (err || !results.length) {
      return res.status(404).send('Order not found');
    }

    res.render('payment-instructions', {
      order: results[0]
    });
  });
});


module.exports = router;