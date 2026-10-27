import { Link, useLocation } from 'react-router-dom'

type SiteHeaderProps = {
  overlay?: boolean
  backTo?: string
  backLabel?: string
}

export function SiteHeader({ overlay = false, backTo, backLabel }: SiteHeaderProps) {
  const { pathname } = useLocation()

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
