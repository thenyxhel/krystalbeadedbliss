import { useEffect, useRef, useState } from 'react'

/**
 * Reveal-on-scroll, with two safeguards the old version lacked: it disconnects
 * after firing, and it resolves immediately for anyone who has asked their
 * system to reduce motion — so that content is never gated behind an
 * animation those users will not see.
 */
export function useReveal(options = {}) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(
    () => typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )

  useEffect(() => {
    if (visible) return
    const node = ref.current
    if (!node) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -8% 0px', ...options }
    )

    observer.observe(node)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible])

  return [ref, visible]
}
