const express = require('express');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Helper function to generate SVG placeholder images
function generatePlaceholderSVG(text, bgColor, textColor = 'FFFFFF') {
  const svg = `<svg width="300" height="300" xmlns="http://www.w3.org/2000/svg"><rect width="300" height="300" fill="#${bgColor}"/><text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#${textColor}" text-anchor="middle" dominant-baseline="middle">${text}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

// Category color mapping - Casino/Luxury theme
const categoryColors = {
  'Accommodation': { bg: '1a1a2e', text: 'D4AF37' }, // Dark navy with gold
  'Dining': { bg: '8B0000', text: 'FFD700' }, // Deep red with gold
  'Experiences': { bg: '2C1810', text: 'FFD700' }, // Dark brown with gold
  'Retail': { bg: '000000', text: 'D4AF37' }, // Black with gold
};

// The Star Sydney Product Catalog
const PRODUCTS = [
  // Accommodation - The "Stay" Category
  {
    id: 'acc-1',
    name: 'The Darling Hotel',
    description: 'Forbes 5-Star boutique hotel. Exclusive, artistic, bespoke experience. One night stay.',
    price: 450.00,
    category: 'Accommodation',
    imageUrl: generatePlaceholderSVG('The Darling', categoryColors.Accommodation.bg, categoryColors.Accommodation.text),
    inStock: true
  },
  {
    id: 'acc-2',
    name: 'The Star Grand Hotel',
    description: 'Luxury 5-star accommodation. Opulent, central to the casino floor. One night stay.',
    price: 380.00,
    category: 'Accommodation',
    imageUrl: generatePlaceholderSVG('Star Grand', categoryColors.Accommodation.bg, categoryColors.Accommodation.text),
    inStock: true
  },
  {
    id: 'acc-3',
    name: 'The Star Grand Residences',
    description: 'High-end apartment-style suites. Perfect for extended stays. One night stay.',
    price: 520.00,
    category: 'Accommodation',
    imageUrl: generatePlaceholderSVG('Residences', categoryColors.Accommodation.bg, categoryColors.Accommodation.text),
    inStock: true
  },
  
  // Dining - The "Dine" Category
  {
    id: 'dine-1',
    name: 'Sokyo',
    description: 'Innovative Japanese dining by celebrity chef. Omakase experience. High ticket value.',
    price: 280.00,
    category: 'Dining',
    imageUrl: generatePlaceholderSVG('Sokyo', categoryColors.Dining.bg, categoryColors.Dining.text),
    inStock: true
  },
  {
    id: 'dine-2',
    name: 'BLACK Bar & Grill',
    description: 'Premium steakhouse overlooking Sydney Harbour. Signature dining experience.',
    price: 220.00,
    category: 'Dining',
    imageUrl: generatePlaceholderSVG('BLACK', categoryColors.Dining.bg, categoryColors.Dining.text),
    inStock: true
  },
  {
    id: 'dine-3',
    name: 'Flying Fish',
    description: 'Modern Australian seafood with artisanal wine lists. Harbour views.',
    price: 180.00,
    category: 'Dining',
    imageUrl: generatePlaceholderSVG('Flying Fish', categoryColors.Dining.bg, categoryColors.Dining.text),
    inStock: true
  },
  {
    id: 'dine-4',
    name: 'Cucina Porto',
    description: 'Authentic, upscale Italian dining. Traditional recipes with modern flair.',
    price: 150.00,
    category: 'Dining',
    imageUrl: generatePlaceholderSVG('Cucina', categoryColors.Dining.bg, categoryColors.Dining.text),
    inStock: true
  },
  {
    id: 'dine-5',
    name: 'Fat Noodle',
    description: 'Asian street food by Luke Nguyen. Perfect for mid-tier rewards.',
    price: 85.00,
    category: 'Dining',
    imageUrl: generatePlaceholderSVG('Fat Noodle', categoryColors.Dining.bg, categoryColors.Dining.text),
    inStock: true
  },
  
  // Experiences - The "Play" Category
  {
    id: 'exp-1',
    name: 'The Darling Spa',
    description: 'One of Sydney\'s most luxurious day spas. Facials, massages, body wraps.',
    price: 320.00,
    category: 'Experiences',
    imageUrl: generatePlaceholderSVG('Spa', categoryColors.Experiences.bg, categoryColors.Experiences.text),
    inStock: true
  },
  {
    id: 'exp-2',
    name: 'Sydney Lyric Theatre',
    description: 'World-class musicals (Hamilton, Wicked). Premium seating for two.',
    price: 250.00,
    category: 'Experiences',
    imageUrl: generatePlaceholderSVG('Theatre', categoryColors.Experiences.bg, categoryColors.Experiences.text),
    inStock: true
  },
  {
    id: 'exp-3',
    name: 'Cherry Cocktail Bar',
    description: 'Exclusive cocktail bar with DJ sets. VIP table reservation.',
    price: 180.00,
    category: 'Experiences',
    imageUrl: generatePlaceholderSVG('Cherry', categoryColors.Experiences.bg, categoryColors.Experiences.text),
    inStock: true
  },
  {
    id: 'exp-4',
    name: 'Rock Lily',
    description: 'Live music venue with stocked whiskey bar. Premium experience.',
    price: 150.00,
    category: 'Experiences',
    imageUrl: generatePlaceholderSVG('Rock Lily', categoryColors.Experiences.bg, categoryColors.Experiences.text),
    inStock: true
  },
  {
    id: 'exp-5',
    name: '24/7 Sports Bar',
    description: 'Massive LED screens, casual pub food. Perfect for game day.',
    price: 75.00,
    category: 'Experiences',
    imageUrl: generatePlaceholderSVG('Sports Bar', categoryColors.Experiences.bg, categoryColors.Experiences.text),
    inStock: true
  },
  
  // Retail - The "Shop" Category
  {
    id: 'retail-1',
    name: 'Kennedy Watches',
    description: 'Official retailer for Rolex and luxury timepieces. Consultation included.',
    price: 8500.00,
    category: 'Retail',
    imageUrl: generatePlaceholderSVG('Kennedy', categoryColors.Retail.bg, categoryColors.Retail.text),
    inStock: true
  },
  {
    id: 'retail-2',
    name: 'Luxury Timepiece Consultation',
    description: 'Personal consultation for luxury watch selection at Kennedy.',
    price: 500.00,
    category: 'Retail',
    imageUrl: generatePlaceholderSVG('Consultation', categoryColors.Retail.bg, categoryColors.Retail.text),
    inStock: true
  },
  {
    id: 'retail-3',
    name: 'Premium Gift Voucher',
    description: 'Flexible gift voucher for luxury retail partners.',
    price: 200.00,
    category: 'Retail',
    imageUrl: generatePlaceholderSVG('Gift Card', categoryColors.Retail.bg, categoryColors.Retail.text),
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
