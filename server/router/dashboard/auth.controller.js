import bcrypt from "bcryptjs";
import { db } from "../../config/Database.js"; // Adjusted path

const User = db.User;

export const renderRegisterPage = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("dashboard/register", {
    layout: "layouts/main",
    success_msg: req.flash("success_msg"),
    error_msg: req.flash("error_msg"),
    // Pass other necessary variables if your layout expects them
  });
};

export const registerUser = async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;

  // Basic Validations
  if (!username || !email || !password || !confirmPassword) {
    req.flash("error_msg", "Please fill in all fields.");
    return res.redirect("/dashboard/register");
  }

  if (password !== confirmPassword) {
    req.flash("error_msg", "Passwords do not match.");
    return res.redirect("/dashboard/register");
  }

  if (password.length < 6) {
    req.flash("error_msg", "Password should be at least 6 characters.");
    return res.redirect("/dashboard/register");
  }

  try {
    // Check if user exists
    const existingUserByEmail = await User.findOne({ where: { email } });
    if (existingUserByEmail) {
      req.flash("error_msg", "Email is already registered.");
      return res.redirect("/dashboard/register");
    }

    const existingUserByUsername = await User.findOne({ where: { username } });
    if (existingUserByUsername) {
      req.flash("error_msg", "Username is already taken.");
      return res.redirect("/dashboard/register");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // 10 is salt rounds

    // Create new user
    const newUser = await User.create({
      username,
      email,
      password: hashedPassword,
    });

    // Log the user in automatically
    req.session.user = {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
    };

    req.flash("success_msg", "You are now registered and logged in!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Registration error:", error);
    req.flash("error_msg", "Something went wrong. Please try again.");
    res.redirect("/dashboard/register");
  }
};

export const renderLoginPage = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.render("dashboard/login", {
    layout: "layouts/main",
    // success_msg and error_msg are already available globally via App.js middleware
  });
};

// Handle raw /login path
export const handleRootLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/dashboard");
  }
  res.redirect("/dashboard/login");
};

export const loginUser = async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    req.flash("error_msg", "Please provide both username and password.");
    return res.redirect("/dashboard/login");
  }

  try {
    const user = await User.findOne({ where: { username } });
    if (!user) {
      req.flash("error_msg", "Invalid username or password.");
      return res.redirect("/dashboard/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error_msg", "Invalid username or password.");
      return res.redirect("/dashboard/login");
    }

    // Passwords match, set up session
    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
    };

    req.flash("success_msg", "You are now logged in!");
    res.redirect("/dashboard");
  } catch (error) {
    console.error("Login error:", error);
    req.flash("error_msg", "Something went wrong. Please try again.");
    res.redirect("/dashboard/login");
  }
};

export const logoutUser = (req, res) => {
  // Set flash message before destroying the session
  req.flash("success_msg", "You have successfully logged out.");

  req.session.destroy((err) => {
    if (err) {
      console.error("Logout error:", err);
      // Even if there's an error, try to redirect to login
      return res.redirect("/dashboard/login");
    }
    // res.clearCookie("connect.sid"); // express-session handles cookie removal on destroy
    res.redirect("/dashboard/login");
  });
};
