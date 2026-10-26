import { QueenPortrait } from '../board/QueenPortrait.tsx'
import { SiteHeader } from '../components/SiteHeader.tsx'

export function LandingPage() {
  return (
    <div className="room">
      <SiteHeader />
      <main className="portrait">
        <div className="portrait-canvas" aria-hidden="true">
          <QueenPortrait />
        </div>
        <div className="portrait-scrim">
          <div className="portrait-copy">
            <h1>Get your Elo guessed.</h1>
            <p>
            Bring eight rated Lichess games you already played. We read the moves and draw a range around our best guess, from a cautious low to a cautious high.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
