const db = require("../db")
const jwt = require("jsonwebtoken")
const bcrypt = require("bcryptjs")
const crypto = require("crypto")
const transporter = require("../utils/mailer")



exports.register = async (req, res) => {

    console.log("REGISTER FUNCTION TRIGGERED")

  const { firstname, lastname, email, password, confirmPassword } = req.body

  if (password !== confirmPassword) {
    return res.render("login", { message: "Passwords do not match" })
  }

  db.query("SELECT email FROM users WHERE email = ?", [email], async (err, results) => {

    if (err) {
      return res.render("login", { message: "Database error" })
    }

    if (results.length > 0) {
      return res.render("login", { message: "Email already in use" })
    }

    const hashedPassword = await bcrypt.hash(password, 8)

    const verificationToken = crypto.randomBytes(32).toString("hex")

    const userData = {
      firstname,
      lastname,
      email,
      password: hashedPassword,
      email_verified: false,
      verification_token: verificationToken
    }

    db.query("INSERT INTO users SET ?", userData, async (err) => {

      if (err) {
        return res.render("login", { message: "Registration failed" })
      }

      const verifyLink = `http://192.168.8.54:${process.env.PORT || 3000}/auth/verify/${verificationToken}`

      try {

        const info = await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Verify your account",
            html: `
            <h2>Email Verification</h2>
            <p>Click the link below to activate your account.</p>
            <a href="${verifyLink}">Verify Email</a>
            `
        })

        console.log("Email sent:", info.response)

        } catch (error) {

        console.error("Email error:", error)

        }

      res.render("login", {
        message: "Account created. Check your email to verify."
      })

    })
  })
}



exports.login = (req, res) => {

  const { email, password } = req.body

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {

    if (err) {
      return res.render("login", { message: "Database error" })
    }

    if (results.length === 0) {
      return res.render("login", { message: "Email not found" })
    }

    const user = results[0]

    if (!user.email_verified) {
      return res.render("login", {
        message: "Verify your email before login"
      })
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      return res.render("login", { message: "Incorrect password" })
    }

    const token = jwt.sign(
      { id: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    )

    const cookieOptions = {
      expires: new Date(
        Date.now() +
        process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
      ),
      httpOnly: true
    }

    res.cookie("jwt", token, cookieOptions)
    res.redirect("/")
  })
}



exports.verifyEmail = (req, res) => {

  const token = req.params.token

  db.query(
    "SELECT * FROM users WHERE verification_token = ?",
    [token],
    (err, results) => {

      if (err || results.length === 0) {
        return res.send("Invalid verification link")
      }

      const userId = results[0].id

      db.query(
        "UPDATE users SET email_verified = true, verification_token = NULL WHERE id = ?",
        [userId],
        (err) => {

          if (err) {
            return res.send("Verification failed")
          }

          res.send("Email verified. You can now login.")
        }
      )
    }
  )
}



exports.isLoggedIn = (req, res, next) => {

  const token = req.cookies.jwt

  if (!token) {
    req.user = null
    return next()
  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    db.query(
      "SELECT * FROM users WHERE id = ?",
      [decoded.id],
      (err, results) => {

        if (err || results.length === 0) {
          req.user = null
        } else {
          req.user = results[0]
        }

        next()
      }
    )

  } catch {
    req.user = null
    next()
  }
}



exports.protect = (req, res, next) => {

  if (!req.user) {
    return res.status(401).json({ error: "User not logged in" })
  }

  next()
}



exports.logout = (req, res) => {

  res.cookie("jwt", "logout", {
    expires: new Date(Date.now() + 2000),
    httpOnly: true
  })

  res.redirect("/")
}