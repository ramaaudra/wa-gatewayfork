/**
 * Middleware to expose the Node.js environment to views
 * This allows us to conditionally include scripts/styles based on environment
 */
const exposeEnvironment = (req, res, next) => {
  // Set NODE_ENV in res.locals so it's accessible in templates
  res.locals.NODE_ENV = process.env.NODE_ENV || "development";
  next();
};

export { exposeEnvironment };
