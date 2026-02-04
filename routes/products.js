const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Mock product data (in production, this could come from Salesforce or another database)
const PRODUCTS = [
  {
    id: '1',
    name: 'Premium Coffee',
    description: 'Artisan roasted coffee beans',
    price: 24.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Coffee'
  },
  {
    id: '2',
    name: 'Organic Tea Set',
    description: 'Collection of premium organic teas',
    price: 34.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/150/228B22/FFFFFF?text=Tea'
  },
  {
    id: '3',
    name: 'Gourmet Chocolates',
    description: 'Handcrafted artisan chocolates',
    price: 19.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/150/8B4513/FFFFFF?text=Chocolate'
  },
  {
    id: '4',
    name: 'Trail Mix',
    description: 'Healthy mixed nuts and dried fruits',
    price: 12.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/150/DAA520/FFFFFF?text=Trail+Mix'
  },
  {
    id: '5',
    name: 'Energy Drink',
    description: 'Natural energy boost drink',
    price: 4.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/150/4169E1/FFFFFF?text=Energy'
  },
  {
    id: '6',
    name: 'Protein Bar',
    description: 'High protein snack bar',
    price: 3.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/150/CD853F/FFFFFF?text=Protein'
  },
  {
    id: '7',
    name: 'Sparkling Water',
    description: 'Naturally flavored sparkling water',
    price: 2.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/150/00CED1/FFFFFF?text=Water'
  },
  {
    id: '8',
    name: 'Granola',
    description: 'Organic crunchy granola',
    price: 8.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/150/D2691E/FFFFFF?text=Granola'
  }
];

/**
 * GET /api/products
 * Get all products or filter by category
 */
router.get('/', authenticate, (req, res) => {
  try {
    const { category, search } = req.query;
    
    let filteredProducts = [...PRODUCTS];

    // Filter by category
    if (category) {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }

    res.json({
      products: filteredProducts,
      total: filteredProducts.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products/:id
 * Get a specific product by ID
 */
router.get('/:id', authenticate, (req, res) => {
  try {
    const product = PRODUCTS.find(p => p.id === req.params.id);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
