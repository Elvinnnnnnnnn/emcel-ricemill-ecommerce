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
// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Product photos folder inside public
// e.g., public/product_photos/myphoto.jpg
// No need to create a second '/Photos' route if you store all images in public
app.use('/product_photos', express.static('public/product_photos'));
// serve user photos so browser can access them
app.use('/user_photos', express.static('public/user_photos'));

// Middleware
app.use(cookieParser());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// ----------------- SESSION MIDDLEWARE -----------------
app.use(session({
    secret: 'adminSecretKey123',  // change this to something secure
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60 * 60 * 1000 } // 1 hour
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
    console.log("MYSQL Connected....")
  }
});

// ----------------- ROUTES -----------------
app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));       // customer auth routes
app.use('/admin', require('./routes/admin'));     // admin routes
app.use('/address', require('./routes/address'));
app.use('/orders', require('./routes/orders'));
app.use('/', require('./routes/ratings'));

app.get('/', authController.isLoggedIn, (req, res) => {
    res.render('index', { user: req.user });
});

app.use('/cart', require('./routes/carts'));

app.use('/orders', require('./routes/orders'));

// Start server
app.listen(3000, () => console.log('Server running on http://localhost:3000'));