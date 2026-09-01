import { useState } from 'react'
import { AppRouter } from './router'
import { SplashScreen } from './components/SplashScreen'

/** Mounts the real app immediately (so its live queries are already loading data behind
 *  the scenes) and overlays the splash on top until its animation finishes, instead of
 *  gating the mount — avoids a second loading flash right after the splash fades out. */
export function SplashGate() {
  const [showSplash, setShowSplash] = useState(true)
  return (
    <>
      <AppRouter />
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
    </>
  )
}
