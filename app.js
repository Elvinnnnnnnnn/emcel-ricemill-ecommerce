const express = require('express');
const path = require('path');
const app = express();
const mysql = require("mysql");
const dotenv = require("dotenv");
const authController = require('./controllers/auth');
const cookieParser = require('cookie-parser');
const session = require('express-session');

// Load environment variables
dotenv.config({ path:'./.env' });

// View engine & static files
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use('/product_photos', express.static('public/product_photos'));
app.use('/user_photos', express.static('public/user_photos'));

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Session
app.use(session({
    secret: 'adminSecretKey123',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 }
}));

// Database connection
const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE
});

db.connect((error)=> {
  if(error){
    console.log(error);
  } else{
    console.log("MYSQL Connected....");
  }
});

// Routes
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/address', require('./routes/address'));
app.use('/orders', require('./routes/orders'));
app.use('/', require('./routes/ratings'));
app.use('/cart', require('./routes/carts'));

app.get('/', authController.isLoggedIn, (req, res) => {
    res.render('index', { user: req.user });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});