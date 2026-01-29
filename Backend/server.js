// src/app.js
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import http from "http";
import { Server } from "socket.io";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

// Configure __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();
import connectDB from "./src/config/db.js";

// Route imports
import authRoutes from "./src/routes/authRoutes.js";
import productRoutes from "./src/routes/productsRoutes.js";
import orderRoutes from "./src/routes/orderRoutes.js";
import analyticsRoutes from "./src/routes/analyticsRoutes.js";
import setupSocket from "./src/utils/socketHandler.js";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin:
      process.env.NODE_ENV === "production"
        ? ["https://your-frontend-domain.com"]
        : ["http://localhost:5000"],
    credentials: true,
  },
});

// Setup Socket.IO
setupSocket(io);

// Make io accessible in routes
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Middleware
app.use(helmet());
// app.use(
//   cors({
//     origin:
//       process.env.NODE_ENV === "production"
//         ? ["https://your-frontend-domain.com"]
//         : ["http://localhost:5000"],
//     credentials: true,
//   }),
// );

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/analytics", analyticsRoutes);

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// globel Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal server error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB();

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});

export default { app, server, io };
