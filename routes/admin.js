const express = require('express');
const router = express.Router();
const adminAuth = require('../controllers/adminAuth');
const db = require('../db.js');
const multer = require("multer");
const bcrypt = require('bcrypt');

// ===== Multer Setup for Product Images =====
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/product_photos'); // folder for images
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + "-" + file.originalname); // unique filename
    }
});
const upload = multer({ storage });

// ===== Admin Login / Logout =====
router.get('/login', (req, res) => {
    res.render('admin-login', { message: '' });
});

router.post('/login', adminAuth.adminLogin);

router.get('/logout', adminAuth.logoutAdmin);

// ===== Admin Dashboard + Inventory =====
router.get('/dashboard', adminAuth.isAdminLoggedIn, (req, res) => {

    const inventorySql = `
        SELECT 
            p.name AS productName,
            v.kilograms,
            v.stock,
            CASE
                WHEN v.stock = 0 THEN 'out-of-stock'
                WHEN v.stock <= 25 THEN 'low-stock'
                ELSE 'in-stock'
            END AS status
        FROM product_variants v
        JOIN products p ON v.product_id = p.id
        WHERE p.is_active = 1
        ORDER BY v.stock ASC
    `;

    const productsSql = `
        SELECT 
            p.id,
            p.name,
            p.image,
            GROUP_CONCAT(v.kilograms ORDER BY v.kilograms DESC SEPARATOR ', ') AS kilograms,
            GROUP_CONCAT(v.price ORDER BY v.kilograms DESC SEPARATOR ', ') AS prices
        FROM products p
        JOIN product_variants v ON p.id = v.product_id
        WHERE p.is_active = 1
        GROUP BY p.id
    `;

    const totalSalesSql = `
        SELECT IFNULL(SUM(total_amount), 0) AS totalSales
        FROM orders
        WHERE status = 'delivered'
    `;


    const revenueSql = `
        SELECT IFNULL(SUM(total_amount), 0) AS revenue
        FROM orders
        WHERE status = 'delivered'
    `;


    const monthlyRevenueSql = `
        SELECT 
            MONTH(created_at) AS month,
            SUM(total_amount) AS revenue
        FROM orders
        WHERE status = 'delivered'
        AND YEAR(created_at) = YEAR(CURRENT_DATE)
        GROUP BY MONTH(created_at)
        ORDER BY MONTH(created_at)
    `;


    const topProductSql = `
        SELECT 
            p.name,
            SUM(oi.quantity * oi.price) AS totalSales
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        JOIN orders o ON oi.order_id = o.id
        WHERE o.status = 'delivered'
        GROUP BY p.id
        ORDER BY totalSales DESC
        LIMIT 1
    `;



    const pendingOrdersSql = `
        SELECT 
            o.id AS orderId,
            o.total_amount,
            o.status,
            u.firstname,
            u.lastname
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status IN ('pending', 'processing', 'out_for_delivery')
        ORDER BY o.created_at DESC
    `;


    const allOrdersSql = `
        SELECT 
            o.id AS orderId,
            o.status,
            u.firstname,
            u.lastname,
            o.total_amount,
            o.created_at
        FROM orders o
        JOIN users u ON o.user_id = u.id
        WHERE o.status != 'cancelled'
        ORDER BY o.created_at DESC
    `;



    const activeUsersSql = `
        SELECT COUNT(*) AS activeUsers
        FROM users
    `;

   const usersSql = `
        SELECT id, firstname, lastname, email
        FROM users
        ORDER BY firstname ASC
    `;


    // Run queries in sequence
    db.query(inventorySql, (err, inventory) => {
        if (err) { console.error("Inventory error:", err); return res.status(500).send("Inventory error"); }

        db.query(productsSql, (err2, products) => {
            if (err2) { console.error("Products error:", err2); return res.status(500).send("Products error"); }

            db.query(totalSalesSql, (err3, salesResult) => {
                if (err3) { console.error("Sales error:", err3); return res.status(500).send("Sales error"); }

                db.query(revenueSql, (err4, revenueResult) => {
                    if (err4) { console.error("Revenue error:", err4); return res.status(500).send("Revenue error"); }

                    db.query(monthlyRevenueSql, (err5, monthlyRevenue) => {
                        if (err5) { console.error("Monthly revenue error:", err5); return res.status(500).send("Monthly revenue error"); }

                        db.query(pendingOrdersSql, (err6, pendingOrders) => {
                            if (err6) { console.error("Pending orders error:", err6); return res.status(500).send("Pending orders error"); }

                            const pendingOrdersCount = pendingOrders.length;

                            db.query(activeUsersSql, (err7, activeUsersResult) => {
                                if (err7) { console.error("Active users error:", err7); return res.status(500).send("Active users error"); }

                                const activeUsers = activeUsersResult[0].activeUsers;

                                db.query(usersSql, (err8, users) => {
                                    if (err8) { console.error("Users fetch error:", err8); return res.status(500).send("Users fetch error"); }

                                    // Render dashboard with all data
                                    db.query(allOrdersSql, (err, allOrders) => {
                                        if (err) return res.status(500).send("Orders fetch error");

                                        db.query(usersSql, (err8, users) => {
                                            if (err8) {
                                                console.error("Users fetch error:", err8);
                                                return res.status(500).send("Users fetch error");
                                            }

                                            db.query(topProductSql, (err9, topProduct) => {
                                                if (err9) {
                                                    console.error("Top product error:", err9);
                                                    return res.status(500).send("Top product error");
                                                }

                                                // ===== Monthly Growth Calculation =====
                                                let monthlyGrowth = 0;

                                                if (monthlyRevenue.length >= 2) {
                                                    const last = Number(monthlyRevenue[monthlyRevenue.length - 1].revenue);
                                                    const prev = Number(monthlyRevenue[monthlyRevenue.length - 2].revenue);

                                                    if (prev > 0) {
                                                        monthlyGrowth = ((last - prev) / prev) * 100;
                                                    }
                                                }

                                                // Render dashboard with all data
                                                db.query(allOrdersSql, (err, allOrders) => {
                                                    if (err) return res.status(500).send("Orders fetch error");

                                                    res.render('admin-dashboard', {
                                                        admin: req.session.admin,
                                                        inventory,
                                                        products,
                                                        totalSales: salesResult[0].totalSales,
                                                        revenue: revenueResult[0].revenue,
                                                        monthlyRevenue,
                                                        pendingOrders,
                                                        pendingOrdersCount,
                                                        activeUsers,
                                                        users,
                                                        allOrders,

                                                        // 🔥 SALES TRACKING DATA
                                                        topProduct: topProduct.length
                                                            ? topProduct[0]
                                                            : { name: 'N/A', totalSales: 0 },

                                                        monthlyGrowth: monthlyGrowth.toFixed(2)
                                                    });
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });

});


// ===== Add Product =====
router.post("/add-product", adminAuth.isAdminLoggedIn, upload.single("image"), (req, res) => {
    const { name, description } = req.body;

    const prices = Array.isArray(req.body.price) ? req.body.price : (req.body.price ? [req.body.price] : []);
    const stocks = Array.isArray(req.body.stock) ? req.body.stock : (req.body.stock ? [req.body.stock] : []);
    const kilograms = Array.isArray(req.body.kilograms) ? req.body.kilograms : (req.body.kilograms ? [req.body.kilograms] : []);
    const image = req.file ? req.file.filename : null;

    const parseKg = (kg) => kg ? Number(String(kg).toLowerCase().replace('kg', '').trim()) || 0 : 0;

    const variantCount = Math.max(prices.length, stocks.length, kilograms.length, 0);

    if (variantCount === 0) {
        prices.push(0); stocks.push(0); kilograms.push(0);
    }

    const variantRows = [];
    for (let i = 0; i < variantCount; i++) {
        variantRows.push({
            stock: parseInt(stocks[i] || 0, 10),
            price: parseFloat(prices[i] || 0),
            kilograms: parseKg(kilograms[i] || '0')
        });
    }

    const mainStock = variantRows[0].stock;
    const mainPrice = variantRows[0].price;
    const mainKg = variantRows[0].kilograms;

    db.beginTransaction(err => {
        if (err) return res.status(500).send("DB transaction error");

        const productSql = `INSERT INTO products (name, stock, price, kilograms, description, image) VALUES (?, ?, ?, ?, ?, ?)`;
        db.query(productSql, [name, mainStock, mainPrice, mainKg, description, image], (err, result) => {
            if (err) return db.rollback(() => res.status(500).send("Database error on product insert"));

            const productId = result.insertId;
            const variantValues = variantRows.map(v => [productId, v.stock, v.price, v.kilograms]);
            const variantSql = `INSERT INTO product_variants (product_id, stock, price, kilograms) VALUES ?`;

            db.query(variantSql, [variantValues], (err2) => {
                if (err2) return db.rollback(() => res.status(500).send("Database error on variants insert"));

                db.commit(commitErr => {
                    if (commitErr) return db.rollback(() => res.status(500).send("Database commit error"));
                    res.redirect("/admin/dashboard");
                });
            });
        });
    });
});

// ===== Edit Product =====
router.post('/product/edit/:id', adminAuth.isAdminLoggedIn, upload.single("image"), (req, res) => {
    const db = require('../db.js');
    const productId = req.params.id;
    const { name, description, price, stock, kilograms } = req.body;
    const image = req.file ? req.file.filename : null;

    let sql = 'UPDATE products SET name = ?, description = ?, stock = ?, price = ?, kilograms = ?';
    const params = [name, description, stock, price, kilograms];

    if (image) {
        sql += ', image = ?';
        params.push(image);
    }

    sql += ' WHERE id = ?';
    params.push(productId);

    db.query(sql, params, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).send("Database error");
        }
        res.json({ success: true });
    });
});

// Get variants of a product
router.get('/product/:id/variants', adminAuth.isAdminLoggedIn, (req, res) => {
    const sql = `
        SELECT id, price, stock, kilograms
        FROM product_variants
        WHERE product_id = ?
    `;
    db.query(sql, [req.params.id], (err, rows) => {
        if (err) return res.json({ success: false });
        res.json({ success: true, variants: rows });
    });
});

router.post('/product/edit-variants/:id', adminAuth.isAdminLoggedIn, (req, res) => {
  try {
    const { variant_id = [], price = [], stock = [], kilograms = [] } = req.body;

    if (!variant_id.length) {
        return res.json({ success: true }); // allow name-only update
    }


    const sql = `
      UPDATE product_variants
      SET price = ?, stock = ?, kilograms = ?
      WHERE id = ?
    `;

    Promise.all(
      variant_id.map((vid, i) => {
        return new Promise((resolve, reject) => {
          db.query(
            sql,
            [
              Number(price[i]),
              Number(stock[i]),
              Number(kilograms[i]),
              Number(vid)
            ],
            err => err ? reject(err) : resolve()
          );
        });
      })
    )
    .then(() => res.json({ success: true }))
    .catch(err => {
      console.error(err);
      res.status(500).json({ success: false });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});



// ===== Soft Delete Product =====
router.post('/product/delete/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const productId = req.params.id;
    const sql = 'UPDATE products SET is_active=0 WHERE id=?';
    db.query(sql, [productId], (err) => {
        if (err) return res.status(500).send("Database error");
        res.json({ success: true });
    });
});

// Approve Order
// ===== Approve Order (Admin) =====
// ===== Approve Order (Admin) =====
router.post('/order/approve/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const sql = `
        UPDATE orders
        SET status = 'processing'
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).send("Approve failed");
        res.redirect('/admin/dashboard');
    });
});

// ===== Mark Out For Delivery =====
router.post('/order/out-for-delivery/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const sql = `
        UPDATE orders
        SET status = 'out_for_delivery'
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).send("Update failed");
        res.redirect('/admin/dashboard');
    });
});

// ===== Mark As Delivered =====
router.post('/order/delivered/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const sql = `
        UPDATE orders
        SET status = 'delivered'
        WHERE id = ?
    `;

    db.query(sql, [req.params.id], (err) => {
        if (err) return res.status(500).send("Update failed");
        res.redirect('/admin/dashboard');
    });
});

// Reject Order
router.post('/order/reject/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const sql = `
        UPDATE orders
        SET status = 'cancelled'
        WHERE id = ?
    `;
    db.query(sql, [req.params.id], err => {
        if (err) return res.status(500).send("Reject failed");
        res.redirect('/admin/dashboard');
    });
});

// Update order delivery info
router.post('/order/update-delivery/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const { delivery_date, delivery_time, tracking_status } = req.body;

    const sql = `
        UPDATE orders
        SET delivery_date = ?, delivery_time = ?, tracking_status = ?
        WHERE id = ?
    `;

    db.query(sql, [delivery_date, delivery_time, tracking_status, req.params.id], err => {
        if (err) return res.status(500).send("Update failed");
        res.redirect('/admin/dashboard');
    });
});

// ===== Soft Delete Order (Admin) =====
router.post('/order/delete/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const orderId = req.params.id;

    const sql = `
        UPDATE orders
        SET status = 'cancelled'
        WHERE id = ?
    `;

    db.query(sql, [orderId], (err) => {
        if (err) {
            console.error('Delete order error:', err);
            return res.status(500).send('Failed to delete order');
        }

        res.redirect('/admin/dashboard');
    });
});


// Delete user
router.delete('/users/delete/:id', adminAuth.isAdminLoggedIn, (req, res) => {
    const id = req.params.id;
    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
        if(err) return res.json({ success: false });
        res.json({ success: true });
    });
});

// Edit user
router.post('/users/edit/:id', adminAuth.isAdminLoggedIn, async (req, res) => {
    const id = req.params.id;

    // SAFETY CHECK
    if (!req.body) {
        return res.status(400).json({ success: false, message: "No data received" });
    }

    const { firstname, lastname, email, password } = req.body;

    try {
        let sql;
        let params;

        if (password && password.trim() !== "") {
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(password, 10);

            sql = `
                UPDATE users
                SET firstname = ?, lastname = ?, email = ?, password = ?
                WHERE id = ?
            `;
            params = [firstname, lastname, email, hashedPassword, id];
        } else {
            sql = `
                UPDATE users
                SET firstname = ?, lastname = ?, email = ?
                WHERE id = ?
            `;
            params = [firstname, lastname, email, id];
        }

        db.query(sql, params, (err) => {
            if (err) {
                console.error("User update error:", err);
                return res.status(500).json({ success: false });
            }

            res.json({ success: true });
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false });
    }
});

// ===== Update Admin Profile =====
router.post(
  '/update-profile',
  adminAuth.isAdminLoggedIn,
  async (req, res) => {
    try {
      const { displayName, password } = req.body;

      // safety check
      if (!displayName || displayName.trim() === '') {
        return res.status(400).json({ message: 'Display name is required' });
      }

      // get admin id from session
      const adminId = req.session.admin.admin_id;

      let sql = 'UPDATE admins SET display_name = ?';
      let params = [displayName];

      // update password ONLY if provided
      if (password && password.trim() !== '') {
        const hashedPassword = await bcrypt.hash(password, 10);
        sql += ', password = ?';
        params.push(hashedPassword);
      }

      sql += ' WHERE admin_id = ?';
      params.push(adminId);

      db.query(sql, params, (err) => {
        if (err) {
          console.error('Admin profile update error:', err);
          return res.status(500).json({ message: 'Database error' });
        }

        // ✅ UPDATE SESSION CORRECTLY
        req.session.admin.display_name = displayName;

        res.json({ success: true });
      });

    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);


// ===== Export Router =====
module.exports = router;
