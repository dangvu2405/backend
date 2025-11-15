const express = require('express');
const router = express.Router();
const AdminController = require('../app/controllers/AdminController');
const adminMiddleware = require('../app/middlewares/admin.middleware');

// ============================================
// Áp dụng admin middleware cho TẤT CẢ routes
// User PHẢI có role Admin mới truy cập được
// ============================================
router.use(adminMiddleware);

// ==========================
// PRODUCTS
// ==========================
router.post('/products', (req, res) => AdminController.createProduct(req, res));
router.get('/products', (req, res) => AdminController.getAllProducts(req, res));
router.get('/products/:id', (req, res) => AdminController.getProduct(req, res));
router.put('/products/:id', (req, res) => AdminController.updateProduct(req, res));
router.delete('/products/:id', (req, res) => AdminController.deleteProduct(req, res));

// ==========================
// CATEGORIES
// ==========================
router.post('/categories', (req, res) => AdminController.createCategory(req, res));
router.get('/categories', (req, res) => AdminController.getAllCategories(req, res));
router.get('/categories/:id', (req, res) => AdminController.getCategory(req, res));
router.put('/categories/:id', (req, res) => AdminController.updateCategory(req, res));
router.delete('/categories/:id', (req, res) => AdminController.deleteCategory(req, res));

// ==========================
// ROLES
// ==========================
router.post('/roles', (req, res) => AdminController.createRole(req, res));
router.get('/roles', (req, res) => AdminController.getAllRoles(req, res));
router.get('/roles/:id', (req, res) => AdminController.getRole(req, res));
router.put('/roles/:id', (req, res) => AdminController.updateRole(req, res));
router.delete('/roles/:id', (req, res) => AdminController.deleteRole(req, res));

// ==========================
// USERS (self info endpoints from TaiKhoanController)
// ==========================
router.post('/users', (req, res) => AdminController.createUser(req, res));
router.put('/users/:id', (req, res) => AdminController.updateUser(req, res));
router.delete('/users/:id', (req, res) => AdminController.deleteUser(req, res));
router.get('/users', (req, res) => AdminController.getAllUsers(req, res));
router.get('/users/me', (req, res) => AdminController.getUser(req, res));
router.put('/users/me', (req, res) => AdminController.updateUser(req, res));
router.delete('/users/me', (req, res) => AdminController.deleteUser(req, res));

// ==========================
// CUSTOMERS (only Customer role accounts)
// ==========================
router.get('/customers', (req, res) => AdminController.getCustomers(req, res));
router.put('/customers/:id', (req, res) => AdminController.updateCustomer(req, res));
router.delete('/customers/:id', (req, res) => AdminController.deleteCustomer(req, res));
router.post('/customers/:id/lock', (req, res) => AdminController.lockCustomer(req, res));
router.post('/customers/:id/change-role', (req, res) => AdminController.changeCustomerRole(req, res));

// ==========================
// ORDERS
// ==========================
router.post('/orders', (req, res) => AdminController.createOrder(req, res));
router.get('/orders', (req, res) => AdminController.getAllOrders(req, res));
router.get('/orders/:id', (req, res) => AdminController.getOrder(req, res));
router.put('/orders/:id', (req, res) => AdminController.updateOrder(req, res));
router.delete('/orders/:id', (req, res) => AdminController.deleteOrder(req, res));
router.post('/orders/:id/cancel', (req, res) => AdminController.cancelOrder(req, res));
router.post('/orders/checkout', (req, res) => AdminController.checkout(req, res));

// ==========================
// CART
// ==========================
router.post('/cart/items', (req, res) => AdminController.addToCart(req, res));
router.get('/cart', (req, res) => AdminController.getCart(req, res));
router.put('/cart/items/:id', (req, res) => AdminController.updateCart(req, res));
router.delete('/cart/items/:id', (req, res) => AdminController.deleteCartItem(req, res));
router.delete('/cart', (req, res) => AdminController.clearCart(req, res));

// ==========================
// INVENTORY
// ==========================
router.get('/inventory', (req, res) => AdminController.getInventory(req, res));
router.get('/inventory/:id', (req, res) => AdminController.getInventoryItem(req, res));
router.post('/inventory/:id/increase', (req, res) => AdminController.increaseStock(req, res));
router.post('/inventory/:id/decrease', (req, res) => AdminController.decreaseStock(req, res));
router.put('/inventory/:id', (req, res) => AdminController.setStock(req, res));
router.delete('/inventory/:id', (req, res) => AdminController.clearStock(req, res));

// ==========================
// STATISTICS
// ==========================
router.get('/stats/summary', (req, res) => AdminController.getSummaryStats(req, res));
router.get('/stats/revenue', (req, res) => AdminController.getRevenueStats(req, res));
router.get('/stats/top-products', (req, res) => AdminController.getTopSellingProducts(req, res));
router.get('/stats/low-stock', (req, res) => AdminController.getLowStockProducts(req, res));
router.get('/stats/monthly-orders', (req, res) => AdminController.getMonthlyOrdersStats(req, res));
router.get('/stats/top-customers', (req, res) => AdminController.getTopCustomersByOrders(req, res));

module.exports = router;