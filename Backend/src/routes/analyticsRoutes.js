// src/routes/analyticsRoutes.js
import express from "express";
import {
  getSellerRevenue,
  getTopProducts,
  getMonthlyRevenue,
  getDashboardSummary,
  getLowStockReport,
} from "../controllers/analyticsController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
const router = express.Router();

// All routes protected
router.use(protect);

// Admin only routes
router.get("/seller-revenue", authorize("admin"), getSellerRevenue);
router.get("/top-products", authorize("admin"), getTopProducts);
router.get("/monthly-revenue", authorize("admin"), getMonthlyRevenue);
router.get("/dashboard-summary", authorize("admin"), getDashboardSummary);
router.get(
  "/low-stock-report",
  authorize("admin", "seller"),
  getLowStockReport,
);

// Admin only routes
router.get("/seller-revenue", authorize("admin"), getSellerRevenue);
router.get("/top-products", authorize("admin"), getTopProducts);
router.get("/monthly-revenue", authorize("admin"), getMonthlyRevenue);
router.get("/dashboard-summary", authorize("admin"), getDashboardSummary);

// Admin and Seller routes
router.get(
  "/low-stock-report",
  authorize("admin", "seller"),
  getLowStockReport,
);

export default router;
