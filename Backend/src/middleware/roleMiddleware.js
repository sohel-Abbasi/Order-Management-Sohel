export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `User role ${req.user.role} is not authorized to access this route`,
      });
    }
    next();
  };
};

export const isOwnerOrAdmin = (Model, paramName = "id") => {
  return async (req, res, next) => {
    try {
      const resource = await Model.findById(req.params[paramName]);

      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      // Check if user is admin or owner
      if (
        req.user.role === "admin" ||
        resource.sellerId.toString() === req.user._id.toString()
      ) {
        next();
      } else {
        return res.status(403).json({
          message: "You are not authorized to perform this action",
        });
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  };
};
