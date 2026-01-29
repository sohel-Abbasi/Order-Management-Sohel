// src/controllers/productController.js
import Product from "../models/Product.js";
import path from "path";

// @desc    Create a product
// @route   POST /api/products
// @access  Private/Seller
export const createProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;

    let imagePaths = [];

    // Check if files were uploaded
    if (req.files && req.files.length > 0) {
      imagePaths = req.files.map(
        (file) => `/uploads/products/${path.basename(file.path)}`,
      );
    } else if (req.body.images) {
      // Handle images from body (URL strings)
      if (Array.isArray(req.body.images)) {
        imagePaths = req.body.images;
      } else {
        imagePaths = [req.body.images];
      }
    }

    if (imagePaths.length === 0) {
      return res
        .status(400)
        .json({ message: "Please upload at least one image" });
    }

    // Create product
    const product = await Product.create({
      name,
      description,
      price: parseFloat(price),
      stock: parseInt(stock),
      category,
      images: imagePaths,
      sellerId: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get all products (with filters)
// @route   GET /api/products
// @access  Public
export const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      minPrice,
      maxPrice,
      search,
      sellerId,
    } = req.query;

    const query = { isActive: true };

    // Apply filters
    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = parseFloat(minPrice);
      if (maxPrice) query.price.$lte = parseFloat(maxPrice);
    }
    if (sellerId) query.sellerId = sellerId;
    if (search) {
      query.$text = { $search: search };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const products = await Product.find(query)
      .populate("sellerId", "name email")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get product by ID
// @route   GET /api/products/:id
// @access  Public
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate(
      "sellerId",
      "name email",
    );

    if (!product || !product.isActive) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a product
// @route   PUT /api/products/:id
// @access  Private/Seller or Admin
export const updateProduct = async (req, res) => {
  try {
    const { name, description, price, stock, category } = req.body;
    const productId = req.params.id;

    const updateData = { name, description, price, stock, category };

    // Add images if new ones are uploaded
    if (req.files && req.files.length > 0) {
      const images = req.files.map(
        (file) => `/uploads/products/${path.basename(file.path)}`,
      );
      updateData.images = images;
    } else if (req.body.images) {
      if (Array.isArray(req.body.images)) {
        updateData.images = req.body.images;
      } else {
        updateData.images = [req.body.images];
      }
    }

    // Remove null/undefined fields
    Object.keys(updateData).forEach(
      (key) => updateData[key] === undefined && delete updateData[key],
    );

    const product = await Product.findByIdAndUpdate(productId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json(product);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Soft delete a product
// @route   DELETE /api/products/:id
// @access  Private/Seller or Admin
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    res.json({ message: "Product removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get seller's products
// @route   GET /api/products/seller/my-products
// @access  Private/Seller
export const getMyProducts = async (req, res) => {
  try {
    const products = await Product.find({
      sellerId: req.user._id,
      isActive: true,
    }).sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
