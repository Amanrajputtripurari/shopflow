export const SEED_COMPANY = {
  name: 'ShopFlow Demo Store',
  gstin: '27AABCU9603R1ZM',
  address: '123 Main Street, Andheri West, Mumbai 400058',
  phone: '+91 98765 43210'
} as const

export const SEED_SETTINGS = {
  companyName: SEED_COMPANY.name,
  setupComplete: true,
  theme: 'light' as const,
  themeColor: 'blue' as const
}

export const SEED_STAFF = {
  username: 'staff',
  password: 'staff',
  displayName: 'Staff User',
  role: 'staff' as const
}

export const SEED_PRODUCTS = [
  { name: 'Basmati Rice 5kg', sku: 'RICE-5KG', unit: 'bag', price: 650, taxPercent: 5 },
  { name: 'Sunflower Oil 1L', sku: 'OIL-1L', unit: 'bottle', price: 180, taxPercent: 5 },
  { name: 'Whole Wheat Flour 2kg', sku: 'ATTA-2KG', unit: 'pack', price: 95, taxPercent: 0 },
  { name: 'Masala Tea 500g', sku: 'TEA-500G', unit: 'pack', price: 220, taxPercent: 5 },
  { name: 'Detergent Powder 1kg', sku: 'DET-1KG', unit: 'pack', price: 140, taxPercent: 18 }
] as const

export const SEED_CUSTOMERS = [
  {
    name: 'Rahul Sharma',
    phone: '9876543210',
    address: 'Flat 12, Green Park, Mumbai',
    gstin: '',
    tags: ['retail']
  },
  {
    name: 'Priya Traders',
    phone: '9123456780',
    address: 'Shop 4, Market Road, Pune',
    gstin: '27AABCP1234A1Z5',
    tags: ['wholesale']
  },
  {
    name: 'Walk-in Customer',
    phone: '',
    address: '',
    gstin: '',
    tags: []
  }
] as const
