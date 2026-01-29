// src/controllers/analyticsController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";
import User from "../models/User.js";

// @desc    Get seller-wise revenue and orders
// @route   GET /api/analytics/seller-revenue
// @access  Private/Admin
export const getSellerRevenue = async (req, res) => {
  try {
    const result = await Order.aggregate([
      // Unwind items array to process each product
      { $unwind: "$items" },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "items.productId",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },

      // Lookup seller details
      {
        $lookup: {
          from: "users",
          localField: "productDetails.sellerId",
          foreignField: "_id",
          as: "sellerDetails",
        },
      },
      { $unwind: "$sellerDetails" },

      // Filter delivered orders
      { $match: { status: "delivered" } },

      // Group by seller
      {
        $group: {
          _id: "$sellerDetails._id",
          sellerName: { $first: "$sellerDetails.name" },
          sellerEmail: { $first: "$sellerDetails.email" },
          totalOrders: { $sum: 1 },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          totalItemsSold: { $sum: "$items.quantity" },
        },
      },

      // Sort by revenue
      { $sort: { totalRevenue: -1 } },

      // Format output
      {
        $project: {
          _id: 1,
          sellerName: 1,
          sellerEmail: 1,
          totalOrders: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalItemsSold: 1,
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get top 5 products by quantity sold
// @route   GET /api/analytics/top-products
// @access  Private/Admin
export const getTopProducts = async (req, res) => {
  try {
    const result = await Order.aggregate([
      // Unwind items array
      { $unwind: "$items" },

      // Filter delivered orders
      { $match: { status: "delivered" } },

      // Group by product
      {
        $group: {
          _id: "$items.productId",
          totalQuantitySold: { $sum: "$items.quantity" },
          totalRevenue: {
            $sum: { $multiply: ["$items.price", "$items.quantity"] },
          },
          orderCount: { $sum: 1 },
        },
      },

      // Sort by quantity sold
      { $sort: { totalQuantitySold: -1 } },

      // Limit to top 5
      { $limit: 5 },

      // Lookup product details
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "productDetails",
        },
      },
      { $unwind: "$productDetails" },

      // Format output
      {
        $project: {
          _id: 1,
          productName: "$productDetails.name",
          productPrice: "$productDetails.price",
          productCategory: "$productDetails.category",
          totalQuantitySold: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          orderCount: 1,
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get monthly revenue
// @route   GET /api/analytics/monthly-revenue
// @access  Private/Admin
export const getMonthlyRevenue = async (req, res) => {
  try {
    const { year } = req.query;
    const currentYear = year || new Date().getFullYear();

    const result = await Order.aggregate([
      // Filter delivered orders and specific year
      {
        $match: {
          status: "delivered",
          createdAt: {
            $gte: new Date(`${currentYear}-01-01`),
            $lt: new Date(`${parseInt(currentYear) + 1}-01-01`),
          },
        },
      },

      // Extract year and month
      {
        $addFields: {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
        },
      },

      // Group by year and month
      {
        $group: {
          _id: { year: "$year", month: "$month" },
          totalRevenue: { $sum: "$totalAmount" },
          orderCount: { $sum: 1 },
          averageOrderValue: { $avg: "$totalAmount" },
        },
      },

      // Sort by year and month
      { $sort: { "_id.year": 1, "_id.month": 1 } },

      // Format output
      {
        $project: {
          year: "$_id.year",
          month: "$_id.month",
          totalRevenue: { $round: ["$totalRevenue", 2] },
          orderCount: 1,
          averageOrderValue: { $round: ["$averageOrderValue", 2] },
        },
      },
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get admin dashboard summary
// @route   GET /api/analytics/dashboard-summary
// @access  Private/Admin
export const getDashboardSummary = async (req, res) => {
  try {
    const [
      totalUsers,
      totalProducts,
      totalOrders,
      totalRevenue,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      // Total Users
      User.countDocuments(),

      // Total Products
      Product.countDocuments({ isActive: true }),

      // Total Orders
      Order.countDocuments(),

      // Total Revenue (from delivered orders)
      Order.aggregate([
        { $match: { status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]),

      // Recent Orders (last 10)
      Order.find()
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .limit(10),

      // Low Stock Products (stock < 10)
      Product.find({
        stock: { $lt: 10 },
        isActive: true,
      })
        .populate("sellerId", "name email")
        .sort({ stock: 1 })
        .limit(10),
    ]);

    // Format revenue
    const revenue = totalRevenue[0] ? totalRevenue[0].total : 0;

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      summary: {
        totalUsers,
        totalProducts,
        totalOrders,
        totalRevenue: parseFloat(revenue.toFixed(2)),
        averageOrderValue:
          totalOrders > 0 ? parseFloat((revenue / totalOrders).toFixed(2)) : 0,
      },
      ordersByStatus,
      recentOrders,
      lowStockProducts,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get low-stock report per seller
// @route   GET /api/analytics/low-stock-report
// @access  Private/Seller or Admin
export const getLowStockReport = async (req, res) => {
  try {
    const matchQuery = {
      stock: { $lt: 10 },
      isActive: true,
    };

    // If seller, only show their products
    if (req.user.role === "seller") {
      matchQuery.sellerId = req.user._id;
    }

    const result = await Product.aggregate([
      // Match low stock products
      { $match: matchQuery },

      // Lookup seller details
      {
        $lookup: {
          from: "users",
          localField: "sellerId",
          foreignField: "_id",
          as: "sellerDetails",
        },
      },
      { $unwind: "$sellerDetails" },

      // Group by seller
      {
        $group: {
          _id: "$sellerId",
          sellerName: { $first: "$sellerDetails.name" },
          sellerEmail: { $first: "$sellerDetails.email" },
          lowStockProducts: {
            $push: {
              productId: "$_id",
              productName: "$name",
              currentStock: "$stock",
              price: "$price",
              category: "$category",
            },
          },
          totalLowStockProducts: { $sum: 1 },
        },
      },

      // Sort by number of low stock products
      { $sort: { totalLowStockProducts: -1 } },
    ]);

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
