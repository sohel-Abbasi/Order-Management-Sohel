// src/utils/socketHandler.js
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Product from "../models/Product.js";

const setupSocket = (io) => {
  // Authentication middleware for sockets
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      socket.user = user;
      next();
    } catch (error) {
      console.error("Socket auth error:", error);
      next(new Error("Authentication error: Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log(`User connected: ${socket.user.name} (${socket.user.role})`);

    // Join user to their personal room
    socket.join(`user-${socket.user._id}`);

    // Join role-specific rooms
    if (socket.user.role === "admin") {
      socket.join("admin");
    } else if (socket.user.role === "seller") {
      socket.join(`seller-${socket.user._id}`);
    }

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.user.name}`);
    });

    // Low stock alerts (seller can request)
    socket.on("subscribe-low-stock", async () => {
      if (socket.user.role === "seller") {
        // Check for low stock products
        const lowStockProducts = await Product.find({
          sellerId: socket.user._id,
          stock: { $lt: 10 },
          isActive: true,
        }).countDocuments();

        if (lowStockProducts > 0) {
          socket.emit("low-stock-alert", {
            message: `You have ${lowStockProducts} products with low stock`,
            count: lowStockProducts,
          });
        }
      }
    });
  });

  return io;
};

export default setupSocket;
