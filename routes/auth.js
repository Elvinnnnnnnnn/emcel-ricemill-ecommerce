const express = require('express');
const authController = require('../controllers/auth');
const db = require('../db.js'); // your database connection
const router = express.Router();
const multer = require('multer');
const path = require('path');

// ===== Existing auth routes =====
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/logout', authController.logout);

// ===== Protected route: get shipping addresses =====
router.get('/delivery', authController.isLoggedIn, (req, res) => {
    const userId = req.user.id;

    const sql = 'SELECT * FROM shipping_details WHERE user_id = ?';
    db.query(sql, [userId], (err, results) => {
        if (err) {
            console.error('Error loading addresses:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json(results);
    });
});

// ===== Multer Setup for user profile images =====
const userStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/user_photos');
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, req.user.id + '-' + Date.now() + ext);
    }
});
const userUpload = multer({ storage: userStorage });

// ===== Profile Update Route =====
router.post(
  '/profile/update',
  authController.isLoggedIn,
  userUpload.single('profile_photo'),
  (req, res) => {
    const { firstname, lastname, email } = req.body;
    const userId = req.user.id;

    const photo = req.file ? req.file.filename : null;

    let sql = `
      UPDATE users
      SET firstname = ?, lastname = ?, email = ?
    `;
    const params = [firstname, lastname, email];

    // ✅ ONLY update photo if one was uploaded
    if (photo) {
      sql += `, profile_photo = ?`;
      params.push(photo);
    }

    sql += ` WHERE id = ?`;
    params.push(userId);

    db.query(sql, params, (err) => {
      if (err) {
        console.error('Error updating profile:', err);
        return res.status(500).json({ success: false });
      }

      res.json({
        success: true,
        imageUrl: photo ? `/user_photos/${photo}` : null
      });
    });
  }
);

module.exports = router;
