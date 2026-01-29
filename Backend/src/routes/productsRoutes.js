// src/routes/productRoutes.js
import express from "express";
import Product from "../models/Product.js";
const router = express.Router();
import {
  createProduct,
  getProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getMyProducts,
} from "../controllers/productController.js";
import { protect } from "../middleware/authMiddleware.js";
import { authorize, isOwnerOrAdmin } from "../middleware/roleMiddleware.js";
import { uploadMultiple } from "../middleware/uploadMiddleware.js";

// Public routes
router.get("/", getProducts);
router.get("/:id", getProductById);

// Protected routes
router.use(protect);

// Seller routes
router.post("/", authorize("seller", "admin"), uploadMultiple, createProduct);

router.get("/seller/my-products", authorize("seller"), getMyProducts);

router.put(
  "/:id",
  authorize("seller", "admin"),
  isOwnerOrAdmin(Product),
  uploadMultiple,
  updateProduct,
);

router.delete(
  "/:id",
  authorize("seller", "admin"),
  isOwnerOrAdmin(Product),
  deleteProduct,
);

export default router;
