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

  // Two independent axes, both shared by the shop, the admin panel and the
  // builder. The database CHECK constraints must stay in step with these.

  // What the piece is.
  categories: [
    { key: 'bracelet', label: 'Bracelets',  singular: 'Bracelet' },
    { key: 'necklace', label: 'Necklaces',  singular: 'Necklace' },
    { key: 'set',      label: 'Sets',       singular: 'Set' },
    { key: 'watch',    label: 'Watches',    singular: 'Watch' },
    { key: 'keychain', label: 'Keychains',  singular: 'Keychain' },
    { key: 'bagcharm', label: 'Bag charms', singular: 'Bag charm' },
    { key: 'earrings', label: 'Earrings',   singular: 'Earrings' },
  ],

  // How it is made. Bracelets and necklaces are one or the other; keychains
  // and bag charms routinely combine the two, so 'both' is a real option.
  styles: [
    { key: 'beaded', label: 'Beaded' },
    { key: 'chains', label: 'Chains' },
    { key: 'both',   label: 'Beaded + chains' },
  ],

  orderStatuses: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'],
}

export const categoryLabel = (key) =>
  CONFIG.categories.find((c) => c.key === key)?.singular ?? key

export const styleLabel = (key) =>
  CONFIG.styles.find((s) => s.key === key)?.label ?? key

export const whatsappLink = (message) => {
  if (!CONFIG.whatsapp) return null
  const digits = String(CONFIG.whatsapp).replace(/\D/g, '')
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

/** True when the bank block is fully configured — checkout depends on it. */
export const bankConfigured = Boolean(
  CONFIG.bank.name && CONFIG.bank.accountName && CONFIG.bank.accountNumber
)
