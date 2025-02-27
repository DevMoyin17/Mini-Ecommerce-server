
require('dotenv').config(); // Load environment variables from .env
const jsonServer = require('json-server');
const express = require('express'); // Required to use express middleware
const cors = require('cors');
const server = express(); 
const router = jsonServer.router('db.json'); // JSON file with products and orders
const middlewares = jsonServer.defaults(); // Default middlewares for JSON server
const { createProxyMiddleware } = require('http-proxy-middleware');


// Enable CORS for all routes
server.use(cors({
  origin: 'https://mini-ecommerce-eight-lyart.vercel.app',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Use express.json() to parse JSON request bodies
server.use(express.json()); 

// Admin login route
server.post('/api/admin-login', (req, res) => {
  const { pin } = req.body;  // Extract PIN from the request body

  if (!pin) {
    return res.status(400).json({ message: 'PIN is required' });
  }

  // Validate the PIN against the stored value in the .env file
  if (pin === process.env.ADMIN_PIN) {
    res.status(200).json({ message: 'Login successful', loggedIn: true });
  } else {
    res.status(401).json({ message: 'Invalid PIN' });
  }
});

// Rewriting the routes to handle the `/products` and `/orders` endpoints
server.use(jsonServer.rewriter({
  '/api/products/:id': '/products/:id',  // Get a single product by ID
  '/api/products': '/products',          // Get all products or POST a new product
  '/api/orders/:id': '/orders/:id',      // Get a single order by ID
  '/api/orders': '/orders',              // Get all orders or POST a new order
}));

// POST route to handle creating new orders
server.post('/api/orders', async (req, res) => {
  const newOrder = req.body;

  try {
    // Save order to database
    const order = router.db.get('orders').insert(newOrder).write();

    // Send confirmation email
    if (newOrder.status === 'success') {
      sendOrderConfirmationEmail(newOrder.email, newOrder);
    }

    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});
server.use('/paystack', createProxyMiddleware({
  target: 'https://checkout.paystack.com', 
  changeOrigin: true,
  pathRewrite: { '^/paystack': '' }, 
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying request: ${req.url}`);
  }
}));

// Error handler for all routes
server.use((err, req, res, next) => {
  console.error('Error occurred:', err.message);
  console.error('Stack Trace:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Use the JSON server's router to handle the actual CRUD operations
server.use(router);

// Listen on port 3000
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


module.exports = server;
