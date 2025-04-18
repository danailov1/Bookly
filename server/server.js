// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Basic health check route
app.get('/', (req, res) => {
  res.json({ status: 'Bookly API is running' });
});

// TasteDive API proxy endpoint
app.get('/api/similar', async (req, res) => {
  try {
    const query = req.query.q;
    const type = req.query.type || 'book';
    const limit = req.query.limit || 5;
    const apiKey = process.env.TASTE_DIVE_API_KEY || req.query.k;

    if (!apiKey) {
      return res.status(400).json({ error: 'API key is required' });
    }

    console.log(`Proxying request to TasteDive API: q=${query}, type=${type}, limit=${limit}`);
    
    const response = await axios.get('https://tastedive.com/api/similar', {
      params: {
        q: query,
        type,
        k: apiKey,
        limit,
        info: 1
      }
    });

    console.log('TasteDive API response received');
    res.json(response.data);
  } catch (error) {
    console.error('Error fetching from TasteDive:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch recommendations',
      details: error.message 
    });
  }
});

// LibreTranslate API proxy endpoint
app.post('/api/translate', async (req, res) => {
  try {
    const { q, source, target } = req.body;
    
    if (!q || !source || !target) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    console.log(`Translating text from ${source} to ${target}`);

    const response = await axios.post('https://translate.argosopentech.com/translate', {
      q,
      source,
      target
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log('Translation response received');
    res.json(response.data);
  } catch (error) {
    console.error('Error translating text:', error.message);
    res.status(500).json({ 
      error: 'Failed to translate text',
      details: error.message 
    });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});