const env = import.meta.env

export const CONFIG = {
  name:    'Krystal Beaded Bliss',
  tagline: 'Hand-strung in Lagos',
  city:    'Lagos, Nigeria',

  whatsapp: env.VITE_WHATSAPP_NUMBER,
  instagram: env.VITE_INSTAGRAM_URL || null,

  bank: {
    name:          env.VITE_BANK_NAME,
    accountName:   env.VITE_BANK_ACCOUNT_NAME,
    accountNumber: env.VITE_BANK_ACCOUNT_NUMBER,
  },

  sisterStore: {
    name: 'The Sweet Soirée',
    url:  env.VITE_SWEET_SOIREE_URL || 'https://thesweetsoiree.vercel.app',
  },

  delivery: {
    note: 'Delivery is arranged with you directly once your order is confirmed.',
  },

  // Category is the one taxonomy the whole app shares. The database CHECK
  // constraint must stay in step with this list.
  categories: [
    { key: 'bracelet', label: 'Bracelets', singular: 'Bracelet' },
    { key: 'necklace', label: 'Necklaces', singular: 'Necklace' },
    { key: 'earrings', label: 'Earrings',  singular: 'Earrings' },
    { key: 'set',      label: 'Sets',      singular: 'Set' },
  ],

  orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
}

export const categoryLabel = (key) =>
  CONFIG.categories.find((c) => c.key === key)?.singular ?? key

export const whatsappLink = (message) => {
  if (!CONFIG.whatsapp) return null
  const digits = String(CONFIG.whatsapp).replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** True when the bank block is fully configured — checkout depends on it. */
export const bankConfigured = Boolean(
  CONFIG.bank.name && CONFIG.bank.accountName && CONFIG.bank.accountNumber
)
