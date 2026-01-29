// src/controllers/orderController.js
import Order from "../models/Order.js";
import Product from "../models/Product.js";

// @desc    Create a new order
// @route   POST /api/orders
// @access  Private/Customer
export const createOrder = async (req, res) => {
  const session = await Order.startSession();
  session.startTransaction();

  try {
    const { items, shippingAddress, paymentMethod } = req.body;
    const userId = req.user._id;

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Order must contain at least one item");
    }

    let totalAmount = 0;
    const processedItems = [];

    // Process each item
    for (const item of items) {
      const product = await Product.findById(item.productId).session(session);

      if (!product || !product.isActive) {
        throw new Error(`Product ${item.productId} not found or inactive`);
      }

      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for product: ${product.name}`);
      }

      // Calculate item total
      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      processedItems.push({
        productId: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      // Reduce stock (atomic operation)
      product.stock -= item.quantity;
      await product.save({ session });
    }

    // Create order
    const order = await Order.create(
      [
        {
          userId,
          items: processedItems,
          totalAmount,
          shippingAddress,
          paymentMethod,
          paymentStatus: paymentMethod === "cod" ? "pending" : "paid",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    // Populate order details
    const populatedOrder = await Order.findById(order[0]._id)
      .populate("userId", "name email")
      .populate("items.productId", "name images");

    // Emit real-time notification (will be handled by socket)
    req.io
      .to(`seller-${processedItems[0].productId.sellerId}`)
      .emit("new-order", {
        orderId: order[0]._id,
        totalAmount,
        customer: req.user.name,
      });

    res.status(201).json(populatedOrder[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    console.error(error);
    res.status(400).json({
      message: error.message || "Failed to create order",
    });
  }
};

// @desc    Get all orders (admin/seller view)
// @route   GET /api/orders
// @access  Private/Admin
export const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, userId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = {};
    if (status) query.status = status;
    if (userId) query.userId = userId;

    const orders = await Order.find(query)
      .populate("userId", "name email")
      .populate("items.productId", "name images price")
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const total = await Order.countDocuments(query);

    res.json({
      orders,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
      total,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get my orders
// @route   GET /api/orders/my-orders
// @access  Private
export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .populate("items.productId", "name images price")
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("userId", "name email")
      .populate("items.productId", "name images price sellerId");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Check authorization
    if (
      req.user.role !== "admin" &&
      order.userId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin or Seller
export const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = [
      "pending",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true, runValidators: true },
    ).populate("userId", "name email");

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    // Emit real-time notifications
    req.io.to(`user-${order.userId._id}`).emit("order-status-update", {
      orderId: order._id,
      status: order.status,
    });

    if (req.user.role === "admin") {
      req.io.to("admin").emit("admin-order-update", {
        orderId: order._id,
        status: order.status,
        updatedBy: req.user.name,
      });
    }

    res.json(order);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
