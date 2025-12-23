const express = require('express');
const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Webhook endpoint
app.post('/webhook', (req, res) => {
  console.log('✓ Webhook received successfully!');
  console.log('Request body:', req.body);

  res.status(200).json({
    status: 'success',
    message: 'Webhook accepted'
  });
});

// Optional: Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Start the server
const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`🚀 Webhook server running on port ${PORT}`);
  console.log(`📍 Webhook URL: http://localhost:${PORT}/webhook`);
});