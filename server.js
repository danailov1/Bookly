const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Proxy endpoint for TasteDive API
app.get('/api/similar', async (req, res) => {
  try {
    // Get query parameters
    const { q, type, limit } = req.query;
    const apiKey = process.env.TASTE_DIVE_API_KEY || '1049527-DanailDa-36868088';
    
    // Make request to TasteDive API
    const response = await axios.get('https://tastedive.com/api/similar', {
      params: {
        q: q,
        type: type || 'book',
        k: apiKey,
        limit: limit || 5,
        info: 1
      }
    });
    
    // Return the data from TasteDive
    res.json(response.data);
  } catch (error) {
    console.error('TasteDive API error:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Failed to fetch recommendations',
      details: error.message
    });
  }
});

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Set static folder
  app.use(express.static('build'));
  
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));