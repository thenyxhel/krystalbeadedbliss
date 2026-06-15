/** Format naira price — e.g. 8500 → ₦8,500 */
export const fmt = (n) =>
  '₦' + Number(n).toLocaleString('en-NG')

/** Generate order number — e.g. KBB-A3X9PQ */
export const generateOrderNumber = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `KBB-${code}`
}

/** Capitalise first letter */
export const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)

/** Status colour map */
export const statusColor = {
  pending:    'bg-yellow-500',
  confirmed:  'bg-blue-500',
  processing: 'bg-purple-500',
  shipped:    'bg-indigo-500',
  delivered:  'bg-green-500',
  cancelled:  'bg-red-500',
  open:       'bg-yellow-500',
  in_review:  'bg-blue-500',
  resolved:   'bg-green-500',
}

/** Clamp text to n chars */
export const clamp = (s, n = 100) =>
  s?.length > n ? s.slice(0, n) + '…' : s
