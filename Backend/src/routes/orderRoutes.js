// src/routes/orderRoutes.js
import express from "express";

const router = express.Router();
import {
  createOrder,
  getAllOrders,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";

// All routes protected
router.use(protect);

// Customer routes
router.post("/", authorize("customer"), createOrder);
router.get("/my-orders", getMyOrders);

// Admin routes
router.get("/", authorize("admin"), getAllOrders);
router.get("/:id", getOrderById);
router.put("/:id/status", authorize("admin"), updateOrderStatus);

export default router;
