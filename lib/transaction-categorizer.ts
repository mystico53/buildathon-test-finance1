import { RawTransaction } from './file-parsers';

export interface CategoryResult {
  category: string;
  subcategory?: string;
  confidence: number;
  source: 'ai' | 'rules' | 'manual';
}

export interface CategorizedTransaction extends RawTransaction {
  category: string;
  subcategory?: string;
  confidence: number;
  categorySource: 'ai' | 'rules' | 'manual';
}

// Rule-based categorization fallback
const CATEGORIZATION_RULES: Record<string, { category: string; subcategory?: string; keywords: string[] }> = {
  'food_dining': {
    category: 'Food & Dining',
    subcategory: 'Restaurants',
    keywords: ['restaurant', 'mcdonald', 'burger', 'pizza', 'starbucks', 'coffee', 'cafe', 'diner', 'food', 'grubhub', 'doordash', 'ubereats']
  },
  'groceries': {
    category: 'Food & Dining',
    subcategory: 'Groceries',
    keywords: ['grocery', 'supermarket', 'walmart', 'target', 'kroger', 'safeway', 'whole foods', 'trader joe']
  },
  'gas_fuel': {
    category: 'Transport',
    subcategory: 'Gas & Fuel',
    keywords: ['gas', 'fuel', 'shell', 'exxon', 'chevron', 'bp', 'mobil', 'station']
  },
  'parking_tolls': {
    category: 'Transport',
    subcategory: 'Parking & Tolls',
    keywords: ['parking', 'toll', 'meter', 'garage']
  },
  'public_transport': {
    category: 'Transport',
    subcategory: 'Public Transportation',
    keywords: ['metro', 'subway', 'bus', 'train', 'uber', 'lyft', 'taxi', 'transit']
  },
  'entertainment': {
    category: 'Entertainment',
    keywords: ['movie', 'theater', 'cinema', 'netflix', 'spotify', 'hulu', 'disney', 'gaming', 'concert', 'tickets']
  },
  'shopping_general': {
    category: 'Shopping',
    keywords: ['amazon', 'ebay', 'store', 'retail', 'shop', 'purchase', 'buy']
  },
  'utilities_electric': {
    category: 'Bills & Utilities',
    subcategory: 'Electricity',
    keywords: ['electric', 'power', 'utility', 'pge', 'edison']
  },
  'utilities_gas': {
    category: 'Bills & Utilities',
    subcategory: 'Gas',
    keywords: ['gas company', 'natural gas']
  },
  'utilities_water': {
    category: 'Bills & Utilities',
    subcategory: 'Water',
    keywords: ['water', 'sewer']
  },
  'utilities_phone': {
    category: 'Bills & Utilities',
    subcategory: 'Phone',
    keywords: ['verizon', 'att', 't-mobile', 'sprint', 'phone', 'cellular', 'wireless']
  },
  'utilities_internet': {
    category: 'Bills & Utilities',
    subcategory: 'Internet',
    keywords: ['comcast', 'xfinity', 'internet', 'broadband', 'wifi']
  },
  'healthcare_medical': {
    category: 'Healthcare',
    subcategory: 'Medical',
    keywords: ['doctor', 'hospital', 'clinic', 'medical', 'pharmacy', 'cvs', 'walgreens']
  },
  'healthcare_dental': {
    category: 'Healthcare',
    subcategory: 'Dental',
    keywords: ['dental', 'dentist', 'orthodont']
  },
  'education': {
    category: 'Education',
    keywords: ['school', 'university', 'college', 'tuition', 'education', 'course', 'textbook']
  },
  'travel_accommodation': {
    category: 'Travel',
    subcategory: 'Accommodation',
    keywords: ['hotel', 'motel', 'airbnb', 'booking', 'expedia', 'lodging']
  },
  'travel_transport': {
    category: 'Travel',
    subcategory: 'Transportation',
    keywords: ['airline', 'flight', 'airport', 'rental car', 'hertz', 'avis']
  },
  'personal_care': {
    category: 'Personal Care',
    keywords: ['salon', 'spa', 'haircut', 'barber', 'cosmetic', 'beauty']
  },
  'home_garden': {
    category: 'Home & Garden',
    keywords: ['home depot', 'lowes', 'hardware', 'garden', 'furniture', 'appliance']
  },
  'insurance_auto': {
    category: 'Insurance',
    subcategory: 'Auto',
    keywords: ['auto insurance', 'car insurance', 'geico', 'state farm', 'progressive']
  },
  'insurance_health': {
    category: 'Insurance',
    subcategory: 'Health',
    keywords: ['health insurance', 'medical insurance']
  },
  'insurance_home': {
    category: 'Insurance',
    subcategory: 'Home',
    keywords: ['home insurance', 'homeowner', 'property insurance']
  },
  'salary_income': {
    category: 'Salary',
    keywords: ['salary', 'paycheck', 'wages', 'payroll', 'direct deposit', 'employer']
  },
  'freelance_income': {
    category: 'Freelance',
    keywords: ['freelance', 'contractor', 'consulting', 'gig', 'upwork', 'fiverr']
  },
  'investment_income': {
    category: 'Investment',
    keywords: ['dividend', 'interest', 'investment', 'stock', 'bond', 'mutual fund', 'etf']
  },
  'business_income': {
    category: 'Business Income',
    keywords: ['business', 'revenue', 'sales', 'client payment']
  },
  'atm_fees': {
    category: 'Other Expenses',
    subcategory: 'ATM Fees',
    keywords: ['atm fee', 'withdrawal fee', 'foreign transaction']
  },
  'rent_housing': {
    category: 'Home & Garden',
    subcategory: 'Rent',
    keywords: ['rent', 'lease', 'housing', 'apartment', 'mortgage']
  }
};

// AI-based categorization using fina.money API
export async function categorizeWithAI(descriptions: string[]): Promise<string[]> {
  try {
    // Using the free fina.money API as mentioned in research
    const response = await fetch('https://fina.money/api/categorize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transactions: descriptions
      })
    });

    if (!response.ok) {
      throw new Error(`AI API failed: ${response.status}`);
    }

    const result = await response.json();
    return result.categories || [];
  } catch (error) {
    console.warn('AI categorization failed:', error);
    // Fall back to rule-based categorization
    return descriptions.map(desc => categorizeWithRules(desc).category);
  }
}

// Rule-based categorization fallback
export function categorizeWithRules(description: string): CategoryResult {
  const lowerDesc = description.toLowerCase();
  
  // Check each rule
  for (const [ruleKey, rule] of Object.entries(CATEGORIZATION_RULES)) {
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return {
          category: rule.category,
          subcategory: rule.subcategory,
          confidence: 0.8,
          source: 'rules'
        };
      }
    }
  }
  
  // Default categorization based on amount (positive vs negative)
  return {
    category: 'Other Expenses',
    confidence: 0.3,
    source: 'rules'
  };
}

// Main categorization function that tries AI first, then falls back to rules
export async function categorizeTransactions(transactions: RawTransaction[]): Promise<CategorizedTransaction[]> {
  const descriptions = transactions.map(t => t.description);
  
  try {
    // Try AI categorization first
    const aiCategories = await categorizeWithAI(descriptions);
    
    if (aiCategories.length === transactions.length) {
      // AI categorization successful
      return transactions.map((transaction, index) => ({
        ...transaction,
        category: aiCategories[index] || 'Other Expenses',
        confidence: 0.9,
        categorySource: 'ai' as const
      }));
    }
  } catch (error) {
    console.warn('AI categorization failed, using rule-based fallback:', error);
  }
  
  // Fall back to rule-based categorization
  return transactions.map(transaction => {
    const result = categorizeWithRules(transaction.description);
    return {
      ...transaction,
      category: result.category,
      subcategory: result.subcategory,
      confidence: result.confidence,
      categorySource: result.source
    };
  });
}

// Helper function to get category suggestions for manual categorization
export function getCategorySuggestions(description: string): CategoryResult[] {
  const suggestions: CategoryResult[] = [];
  const lowerDesc = description.toLowerCase();
  
  // Get rule-based suggestions
  for (const [ruleKey, rule] of Object.entries(CATEGORIZATION_RULES)) {
    let matchScore = 0;
    
    for (const keyword of rule.keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        matchScore++;
      }
    }
    
    if (matchScore > 0) {
      suggestions.push({
        category: rule.category,
        subcategory: rule.subcategory,
        confidence: Math.min(0.9, matchScore * 0.3),
        source: 'rules'
      });
    }
  }
  
  // Sort by confidence and return top 3
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

// Helper to map categories to our database category IDs
export function mapCategoryToId(categoryName: string): string | null {
  const categoryMap: Record<string, string> = {
    'Food & Dining': 'food_dining',
    'Transport': 'transport',
    'Entertainment': 'entertainment', 
    'Shopping': 'shopping',
    'Bills & Utilities': 'bills_utilities',
    'Healthcare': 'healthcare',
    'Education': 'education',
    'Travel': 'travel',
    'Personal Care': 'personal_care',
    'Home & Garden': 'home_garden',
    'Insurance': 'insurance',
    'Taxes': 'taxes',
    'Gifts & Donations': 'gifts_donations',
    'Business': 'business',
    'Other Expenses': 'other_expenses',
    'Salary': 'salary',
    'Freelance': 'freelance',
    'Investment': 'investment',
    'Business Income': 'business_income',
    'Other Income': 'other_income'
  };
  
  return categoryMap[categoryName] || null;
}