import { useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'

const POINTER_LINKS = '.wordmark, .method-link, .back-link'

function linkFromEvent(event: Event) {
  if (!(event.target instanceof Element)) return null
  return event.target.closest(POINTER_LINKS)
}

type SiteHeaderProps = {
  overlay?: boolean
  backTo?: string
  backLabel?: string
}

export function SiteHeader({ overlay = false, backTo, backLabel }: SiteHeaderProps) {
  const { pathname } = useLocation()

  useEffect(() => {
    let pointer = false

    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return
      pointer = true
      linkFromEvent(event)?.setAttribute('data-pointer-focus', '')
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      pointer = false
      document.querySelectorAll('[data-pointer-focus]').forEach((node) => {
        node.removeAttribute('data-pointer-focus')
      })
    }

    const onFocusIn = (event: FocusEvent) => {
      const link = linkFromEvent(event)
      if (!link) return
      if (pointer) link.setAttribute('data-pointer-focus', '')
      else link.removeAttribute('data-pointer-focus')
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('focusin', onFocusIn, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('focusin', onFocusIn, true)
    }
  }, [])

  return (
    <header className={overlay ? 'site-header site-header-overlay' : 'site-header'}>
      <div className="site-leading">
        {backTo ? (
          <Link to={backTo} className="back-link" aria-label={backLabel ?? 'Get your Elo guessed'}>
            <svg viewBox="0 0 12 20" width="12" height="20" aria-hidden="true">
              <path
                d="M10 2 2 10l8 8"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Link>
        ) : null}
        <Link to="/" className="wordmark" aria-current={pathname === '/' ? 'page' : undefined}>
          Queen's Range
        </Link>
      </div>
      <nav aria-label="Pages">
        <Link
          to="/method"
          className="method-link"
          aria-current={pathname === '/method' ? 'page' : undefined}
        >
          How it works
        </Link>
      </nav>
    </header>
  )
}
