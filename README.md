MONGO_URL = mongodb+srv://khansohail7963_db_user:Abbasi123@cluster0.5xrl0fy.mongodb.net/

JWT_SECRET = 123456

PORT = 5000

JWT_EXPIRES_IN=7d
NODE_ENV=development
UPLOAD_PATH=./uploads/products/
MAX_FILE_SIZE=5 * 1024 * 1024

------------------------------------------ End points ----------------------------------
Authentication
POST /api/auth/register - Register new user

POST /api/auth/login - User login

GET /api/auth/me - Get current user

Products
GET /api/products - Get all products (public)

GET /api/products/:id - Get product by ID (public)

POST /api/products - Create product (seller/admin)

PUT /api/products/:id - Update product (owner/admin)

DELETE /api/products/:id - Delete product (owner/admin)

Orders
POST /api/orders - Create order (customer)

GET /api/orders/my-orders - Get user's orders

GET /api/orders - Get all orders (admin)

PUT /api/orders/:id/status - Update order status (admin)

Analytics
GET /api/analytics/seller-revenue - Seller revenue report (admin)

GET /api/analytics/top-products - Top products report (admin)

GET /api/analytics/monthly-revenue - Monthly revenue (admin)

GET /api/analytics/dashboard-summary - Dashboard stats (admin)

GET /api/analytics/low-stock-report - Low stock report (admin/seller)                  ok based on that give complete api url with some data so that i can enter it into postman and check it it's runs on localhost:5000
