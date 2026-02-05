const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Expanded product catalog with more variety
const PRODUCTS = [
  // Beverages
  {
    id: '1',
    name: 'Premium Coffee',
    description: 'Artisan roasted coffee beans from Colombia',
    price: 24.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/8B4513/FFFFFF?text=Coffee',
    inStock: true
  },
  {
    id: '2',
    name: 'Organic Tea Set',
    description: 'Collection of premium organic teas (12 varieties)',
    price: 34.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/228B22/FFFFFF?text=Tea',
    inStock: true
  },
  {
    id: '5',
    name: 'Energy Drink',
    description: 'Natural energy boost drink with vitamins',
    price: 4.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/4169E1/FFFFFF?text=Energy',
    inStock: true
  },
  {
    id: '7',
    name: 'Sparkling Water',
    description: 'Naturally flavored sparkling water (12-pack)',
    price: 2.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/00CED1/FFFFFF?text=Water',
    inStock: true
  },
  {
    id: '9',
    name: 'Cold Brew Coffee',
    description: 'Smooth cold brew concentrate (32oz)',
    price: 18.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/654321/FFFFFF?text=Cold+Brew',
    inStock: true
  },
  {
    id: '10',
    name: 'Matcha Green Tea',
    description: 'Premium ceremonial grade matcha powder',
    price: 29.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/90EE90/FFFFFF?text=Matcha',
    inStock: true
  },
  {
    id: '11',
    name: 'Kombucha',
    description: 'Probiotic fermented tea drink',
    price: 5.99,
    category: 'Beverages',
    imageUrl: 'https://via.placeholder.com/300/FF6347/FFFFFF?text=Kombucha',
    inStock: true
  },
  
  // Snacks
  {
    id: '3',
    name: 'Gourmet Chocolates',
    description: 'Handcrafted artisan chocolates (16 pieces)',
    price: 19.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/8B4513/FFFFFF?text=Chocolate',
    inStock: true
  },
  {
    id: '4',
    name: 'Trail Mix',
    description: 'Healthy mixed nuts and dried fruits (1lb)',
    price: 12.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/DAA520/FFFFFF?text=Trail+Mix',
    inStock: true
  },
  {
    id: '6',
    name: 'Protein Bar',
    description: 'High protein snack bar (12-pack)',
    price: 3.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/CD853F/FFFFFF?text=Protein',
    inStock: true
  },
  {
    id: '8',
    name: 'Granola',
    description: 'Organic crunchy granola (16oz)',
    price: 8.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/D2691E/FFFFFF?text=Granola',
    inStock: true
  },
  {
    id: '12',
    name: 'Kale Chips',
    description: 'Crispy baked kale chips (4oz)',
    price: 6.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/32CD32/FFFFFF?text=Kale+Chips',
    inStock: true
  },
  {
    id: '13',
    name: 'Almond Butter',
    description: 'Creamy organic almond butter (16oz)',
    price: 14.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/DEB887/FFFFFF?text=Almond+Butter',
    inStock: true
  },
  {
    id: '14',
    name: 'Rice Cakes',
    description: 'Whole grain rice cakes (12-pack)',
    price: 4.99,
    category: 'Snacks',
    imageUrl: 'https://via.placeholder.com/300/F5DEB3/FFFFFF?text=Rice+Cakes',
    inStock: true
  },
  
  // Wellness
  {
    id: '15',
    name: 'Vitamin D3',
    description: 'High potency vitamin D3 supplements (60ct)',
    price: 16.99,
    category: 'Wellness',
    imageUrl: 'https://via.placeholder.com/300/FFD700/FFFFFF?text=Vitamin+D',
    inStock: true
  },
  {
    id: '16',
    name: 'Probiotics',
    description: 'Daily probiotic capsules (30ct)',
    price: 24.99,
    category: 'Wellness',
    imageUrl: 'https://via.placeholder.com/300/98FB98/FFFFFF?text=Probiotics',
    inStock: true
  },
  {
    id: '17',
    name: 'Omega-3 Fish Oil',
    description: 'High quality fish oil capsules (90ct)',
    price: 19.99,
    category: 'Wellness',
    imageUrl: 'https://via.placeholder.com/300/4682B4/FFFFFF?text=Omega+3',
    inStock: true
  },
  {
    id: '18',
    name: 'Multivitamin',
    description: 'Complete daily multivitamin (60ct)',
    price: 22.99,
    category: 'Wellness',
    imageUrl: 'https://via.placeholder.com/300/FF69B4/FFFFFF?text=Multivitamin',
    inStock: true
  },
  
  // Accessories
  {
    id: '19',
    name: 'Reusable Water Bottle',
    description: 'Stainless steel insulated water bottle (32oz)',
    price: 29.99,
    category: 'Accessories',
    imageUrl: 'https://via.placeholder.com/300/708090/FFFFFF?text=Water+Bottle',
    inStock: true
  },
  {
    id: '20',
    name: 'Coffee Mug',
    description: 'Ceramic travel mug with lid',
    price: 15.99,
    category: 'Accessories',
    imageUrl: 'https://via.placeholder.com/300/8B4513/FFFFFF?text=Coffee+Mug',
    inStock: true
  },
  {
    id: '21',
    name: 'Lunch Box',
    description: 'Insulated lunch box with compartments',
    price: 24.99,
    category: 'Accessories',
    imageUrl: 'https://via.placeholder.com/300/FF4500/FFFFFF?text=Lunch+Box',
    inStock: true
  },
  {
    id: '22',
    name: 'Yoga Mat',
    description: 'Eco-friendly non-slip yoga mat',
    price: 39.99,
    category: 'Accessories',
    imageUrl: 'https://via.placeholder.com/300/9370DB/FFFFFF?text=Yoga+Mat',
    inStock: true
  }
];

/**
 * GET /api/products/categories
 * Get all available product categories
 */
router.get('/categories', authenticate, (req, res) => {
  try {
    const categories = [...new Set(PRODUCTS.map(p => p.category))].sort();
    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/products
 * Get all products or filter by category/search
 */
router.get('/', authenticate, (req, res) => {
  try {
    const { category, search } = req.query;
    
    let filteredProducts = [...PRODUCTS];

    // Filter by category
    if (category && category !== 'All') {
      filteredProducts = filteredProducts.filter(p => 
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by search term
    if (search) {
      const searchLower = search.toLowerCase();
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower)
      );
    }

    // Get unique categories for response
    const categories = [...new Set(PRODUCTS.map(p => p.category))].sort();

    res.json({
      products: filteredProducts,
      total: filteredProducts.length,
      categories: categories
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
