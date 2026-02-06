const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate SVG placeholder images
function generatePlaceholderSVG(text, bgColor, textColor = 'FFFFFF') {
  const svg = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#${bgColor}"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Category color mapping
const categoryColors = {
  'Beverages': { bg: '4A90E2', text: 'FFFFFF' },
  'Snacks': { bg: 'F5A623', text: 'FFFFFF' },
  'Wellness': { bg: '7ED321', text: 'FFFFFF' },
  'Accessories': { bg: '9013FE', text: 'FFFFFF' },
};

// Expanded product catalog with more variety
const PRODUCTS = [
  // Beverages
  {
    id: '1',
    name: 'Premium Coffee',
    description: 'Artisan roasted coffee beans from Colombia',
    price: 24.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Coffee', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '2',
    name: 'Organic Tea Set',
    description: 'Collection of premium organic teas (12 varieties)',
    price: 34.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Tea', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '5',
    name: 'Energy Drink',
    description: 'Natural energy boost drink with vitamins',
    price: 4.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Energy', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '7',
    name: 'Sparkling Water',
    description: 'Naturally flavored sparkling water (12-pack)',
    price: 2.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Water', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '9',
    name: 'Cold Brew Coffee',
    description: 'Smooth cold brew concentrate (32oz)',
    price: 18.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Cold Brew', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '10',
    name: 'Matcha Green Tea',
    description: 'Premium ceremonial grade matcha powder',
    price: 29.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Matcha', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  {
    id: '11',
    name: 'Kombucha',
    description: 'Probiotic fermented tea drink',
    price: 5.99,
    category: 'Beverages',
    imageUrl: generatePlaceholderSVG('Kombucha', categoryColors.Beverages.bg, categoryColors.Beverages.text),
    inStock: true
  },
  
  // Snacks
  {
    id: '3',
    name: 'Gourmet Chocolates',
    description: 'Handcrafted artisan chocolates (16 pieces)',
    price: 19.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Chocolate', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '4',
    name: 'Trail Mix',
    description: 'Healthy mixed nuts and dried fruits (1lb)',
    price: 12.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Trail Mix', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '6',
    name: 'Protein Bar',
    description: 'High protein snack bar (12-pack)',
    price: 3.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Protein', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '8',
    name: 'Granola',
    description: 'Organic crunchy granola (16oz)',
    price: 8.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Granola', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '12',
    name: 'Kale Chips',
    description: 'Crispy baked kale chips (4oz)',
    price: 6.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Kale Chips', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '13',
    name: 'Almond Butter',
    description: 'Creamy organic almond butter (16oz)',
    price: 14.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Almond Butter', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  {
    id: '14',
    name: 'Rice Cakes',
    description: 'Whole grain rice cakes (12-pack)',
    price: 4.99,
    category: 'Snacks',
    imageUrl: generatePlaceholderSVG('Rice Cakes', categoryColors.Snacks.bg, categoryColors.Snacks.text),
    inStock: true
  },
  
  // Wellness
  {
    id: '15',
    name: 'Vitamin D3',
    description: 'High potency vitamin D3 supplements (60ct)',
    price: 16.99,
    category: 'Wellness',
    imageUrl: generatePlaceholderSVG('Vitamin D', categoryColors.Wellness.bg, categoryColors.Wellness.text),
    inStock: true
  },
  {
    id: '16',
    name: 'Probiotics',
    description: 'Daily probiotic capsules (30ct)',
    price: 24.99,
    category: 'Wellness',
    imageUrl: generatePlaceholderSVG('Probiotics', categoryColors.Wellness.bg, categoryColors.Wellness.text),
    inStock: true
  },
  {
    id: '17',
    name: 'Omega-3 Fish Oil',
    description: 'High quality fish oil capsules (90ct)',
    price: 19.99,
    category: 'Wellness',
    imageUrl: generatePlaceholderSVG('Omega 3', categoryColors.Wellness.bg, categoryColors.Wellness.text),
    inStock: true
  },
  {
    id: '18',
    name: 'Multivitamin',
    description: 'Complete daily multivitamin (60ct)',
    price: 22.99,
    category: 'Wellness',
    imageUrl: generatePlaceholderSVG('Multivitamin', categoryColors.Wellness.bg, categoryColors.Wellness.text),
    inStock: true
  },
  
  // Accessories
  {
    id: '19',
    name: 'Reusable Water Bottle',
    description: 'Stainless steel insulated water bottle (32oz)',
    price: 29.99,
    category: 'Accessories',
    imageUrl: generatePlaceholderSVG('Water Bottle', categoryColors.Accessories.bg, categoryColors.Accessories.text),
    inStock: true
  },
  {
    id: '20',
    name: 'Coffee Mug',
    description: 'Ceramic travel mug with lid',
    price: 15.99,
    category: 'Accessories',
    imageUrl: generatePlaceholderSVG('Coffee Mug', categoryColors.Accessories.bg, categoryColors.Accessories.text),
    inStock: true
  },
  {
    id: '21',
    name: 'Lunch Box',
    description: 'Insulated lunch box with compartments',
    price: 24.99,
    category: 'Accessories',
    imageUrl: generatePlaceholderSVG('Lunch Box', categoryColors.Accessories.bg, categoryColors.Accessories.text),
    inStock: true
  },
  {
    id: '22',
    name: 'Yoga Mat',
    description: 'Eco-friendly non-slip yoga mat',
    price: 39.99,
    category: 'Accessories',
    imageUrl: generatePlaceholderSVG('Yoga Mat', categoryColors.Accessories.bg, categoryColors.Accessories.text),
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
