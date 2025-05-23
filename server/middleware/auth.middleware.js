export const ensureAuthenticated = (req, res, next) => {
  if (req.session.user) {
    return next();
  }

  // Check if the request is an API request (e.g., path starts with /api/)
  // Or if the client prefers JSON (more robust)
  // Adjusted to check originalUrl for routes like /api/v1/endpoint
  const isApiRoute = req.originalUrl.startsWith('/api/'); 
  const prefersJson = req.accepts(['html', 'json']) === 'json';

  if (isApiRoute || prefersJson) {
    return res.status(401).json({
      status: 401,
      message: "Unauthorized. Please log in to access this resource.",
    });
  } else {
    req.flash("error_msg", "Please log in to view this resource.");
    res.redirect("/dashboard/login");
  }
};
