import { Component } from 'react'
import { CONFIG, whatsappLink } from '../lib/config'

/**
 * The last line of defence. Before this existed, one malformed product row or
 * a missing env var gave the customer a white screen and no way forward.
 */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Swap this for your error reporter when you have one.
    console.error('[KBB] Unhandled error:', error, info?.componentStack)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const wa = whatsappLink('Hi! The website showed me an error.')

    return (
      <main
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'var(--bg)', padding: 'var(--gutter)' }}
      >
        <div className="card p-8 text-center" style={{ maxWidth: 480 }}>
          <p className="eyebrow mb-3">Something broke</p>
          <h1 className="h2 mb-3">This page did not load.</h1>
          <p className="text-ink-2 text-sm mb-6">
            That is our fault, not yours. Reloading usually fixes it. If it keeps
            happening, message us and we will take your order by hand.
          </p>

          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button type="button" className="btn btn-primary" onClick={() => window.location.reload()}>
              Reload the page
            </button>
            <a className="btn btn-outline" href="/">
              Go to the shop
            </a>
            {wa && (
              <a className="btn btn-ghost" href={wa} target="_blank" rel="noreferrer">
                Message {CONFIG.name.split(' ')[0]}
              </a>
            )}
          </div>

          {import.meta.env.DEV && (
            <pre
              className="mt-6 text-left text-xs overflow-auto p-3"
              style={{ background: 'var(--surface-2)', borderRadius: 'var(--r-md)', maxHeight: 200, color: 'var(--bad)' }}
            >
              {String(error?.stack ?? error)}
            </pre>
          )}
        </div>
      </main>
    )
  }
}
