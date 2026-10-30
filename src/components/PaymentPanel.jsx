import { CONFIG, bankConfigured } from '../lib/config'
import { fmt } from '../lib/utils'
import Icon from './Icon'

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

/**
 * The bank details and receipt upload, shared by the shop checkout and the
 * custom builder so the two can never drift apart again.
 *
 * `onError('')` is called to clear a stale message; a string reports a problem
 * with the chosen file. The parent owns the error so it can also show upload
 * and order failures in the same place.
 */
export default function PaymentPanel({ amount, receipt, onReceipt, onError }) {
  const pick = (file) => {
    onError('')
    if (!file) return
    if (!ACCEPTED.includes(file.type)) {
      onError('Please upload a JPG, PNG, WebP or PDF.')
      return
    }
    if (file.size > MAX_RECEIPT_BYTES) {
      onError('That file is larger than 5MB. Please upload a smaller one.')
      return
    }
    onReceipt(file)
  }

  return (
    <>
      {bankConfigured ? (
        <dl className="well p-5 m-0">
          {[
            ['Bank', CONFIG.bank.name],
            ['Account name', CONFIG.bank.accountName],
            ['Account number', CONFIG.bank.accountNumber],
            ['Amount', fmt(amount)],
          ].map(([key, value], i, arr) => (
            <div
              key={key}
              className="flex justify-between items-center gap-4 py-2.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid var(--line)' : 'none' }}
            >
              <dt className="text-sm text-ink-2">{key}</dt>
              <dd className="numeric text-sm font-semibold m-0 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="well p-5" style={{ borderColor: 'var(--bad)' }}>
          <p className="text-sm" style={{ color: 'var(--bad)' }}>
            Bank details are not configured. Set VITE_BANK_NAME, VITE_BANK_ACCOUNT_NAME and
            VITE_BANK_ACCOUNT_NUMBER in your environment.
          </p>
        </div>
      )}

      <div className="mt-6">
        <span className="label">Payment receipt</span>
        <label
          className="flex flex-col items-center justify-center gap-2 py-9 px-4 text-center cursor-pointer"
          style={{
            border: `1.5px dashed ${receipt ? 'var(--accent)' : 'var(--line-strong)'}`,
            borderRadius: 'var(--r-md)',
            background: receipt ? 'var(--accent-wash)' : 'var(--surface-2)',
          }}
        >
          <Icon name={receipt ? 'check' : 'upload'} size={22} className={receipt ? 'text-accent' : 'text-ink-3'} />
          <span className="text-sm font-medium text-ink">{receipt ? receipt.name : 'Choose a file or take a photo'}</span>
          <span className="help m-0">JPG, PNG, WebP or PDF · up to 5MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => pick(e.target.files?.[0])}
          />
        </label>
        <p className="help">Your receipt is stored privately and is only ever seen by us.</p>
      </div>
    </>
  )
}
