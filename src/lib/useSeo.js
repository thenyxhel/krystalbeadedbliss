import { useEffect } from 'react'
import { CONFIG } from './config'

const setMeta = (selector, attr, value) => {
  let el = document.head.querySelector(selector)
  if (!el) {
    el = document.createElement('meta')
    const [, name] = selector.match(/\[(?:name|property)="([^"]+)"\]/) ?? []
    el.setAttribute(selector.includes('property') ? 'property' : 'name', name ?? '')
    document.head.appendChild(el)
  }
  el.setAttribute(attr, value)
}

/**
 * Per-route title and description. A single-page app that ships one <title>
 * for every URL is invisible in search results and unreadable in a list of
 * browser tabs — which is how people actually keep a shop open while they
 * think about buying.
 */
export function useSeo({ title, description, noindex = false } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} · ${CONFIG.name}` : `${CONFIG.name} — ${CONFIG.tagline}`
    document.title = fullTitle
    setMeta('meta[property="og:title"]', 'content', fullTitle)

    if (description) {
      setMeta('meta[name="description"]', 'content', description)
      setMeta('meta[property="og:description"]', 'content', description)
    }

    let robots = document.head.querySelector('meta[name="robots"]')
    if (noindex) {
      if (!robots) {
        robots = document.createElement('meta')
        robots.setAttribute('name', 'robots')
        document.head.appendChild(robots)
      }
      robots.setAttribute('content', 'noindex, nofollow')
    } else if (robots) {
      robots.remove()
    }
  }, [title, description, noindex])
}
