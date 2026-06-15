export const CONFIG = {
  whatsapp:    import.meta.env.VITE_WHATSAPP_NUMBER,
  bank: {
    name:          import.meta.env.VITE_BANK_NAME,
    accountName:   import.meta.env.VITE_BANK_ACCOUNT_NAME,
    accountNumber: import.meta.env.VITE_BANK_ACCOUNT_NUMBER,
  },
  adminEmail:   import.meta.env.VITE_ADMIN_EMAIL,
  sweetSoiree:  import.meta.env.VITE_SWEET_SOIREE_URL || 'https://thesweetsoiree.vercel.app',
  delivery: {
    fee: 0,
    note: 'Delivery is free — arranged after order confirmation.',
  },
  categories: ['bracelet', 'necklace', 'earrings', 'anklet', 'set'],
  orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
}

export const whatsappLink = (message) =>
  `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(message)}`
