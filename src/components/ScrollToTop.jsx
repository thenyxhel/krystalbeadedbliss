import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/**
 * Jump to the top on navigation — instantly.
 *
 * The old version used `behavior: 'smooth'`, which meant every route change
 * animated a scroll through the page you were leaving. On a long shop page
 * that is a second of visual noise before the new page is readable.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash)
      if (el) {
        el.scrollIntoView({ block: 'start' })
        return
      }
    }
    window.scrollTo(0, 0)
  }, [pathname, hash])

  return null
}
