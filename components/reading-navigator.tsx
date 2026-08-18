import type { CSSProperties, KeyboardEvent, MouseEvent, RefObject } from 'react'
import { useEffect, useState } from 'react'
import styles from './reading-navigator.module.css'

type Marker = {
  label: string
  ratio: number
  targetId?: string
}

type ReadingNavigatorProps = {
  contentRef: RefObject<HTMLElement | null>
  contentId: string
}

const MIN_SCROLL_LENGTH = 0.5
const MAX_FALLBACK_MARKERS = 12

function maximumScroll() {
  return Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
}

function currentProgress() {
  const maximum = maximumScroll()
  return maximum ? Math.min(1, Math.max(0, window.scrollY / maximum)) : 0
}

function fallbackMarkers(maximum: number): Marker[] {
  const markerCount = Math.min(
    MAX_FALLBACK_MARKERS,
    Math.max(4, Math.ceil(maximum / window.innerHeight) + 1)
  )

  return Array.from({ length: markerCount }, (_, index) => {
    const ratio = index / (markerCount - 1)
    return { label: `${Math.round(ratio * 100)}%`, ratio }
  })
}

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function ReadingNavigator({ contentRef, contentId }: ReadingNavigatorProps) {
  const [markers, setMarkers] = useState<Marker[]>([])
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)
  const [horizontal, setHorizontal] = useState(false)

  useEffect(() => {
    const content = contentRef.current
    if (!content) return

    let animationFrame = 0

    function updateProgress() {
      cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => setProgress(currentProgress()))
    }

    function updateLayout() {
      const maximum = maximumScroll()
      setVisible(maximum > window.innerHeight * MIN_SCROLL_LENGTH)
      setHorizontal(window.matchMedia('(max-width: 700px)').matches)
      setProgress(currentProgress())

      const headings = Array.from(content!.querySelectorAll<HTMLElement>('h2, h3'))
      if (!headings.length) {
        setMarkers(fallbackMarkers(maximum))
        return
      }

      setMarkers(headings.map((heading, index) => ({
        label: heading.textContent?.trim() || `Section ${index + 1}`,
        ratio: maximum
          ? Math.min(1, Math.max(0, (heading.getBoundingClientRect().top + window.scrollY) / maximum))
          : 0,
        targetId: heading.id || undefined
      })))
    }

    updateLayout()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateLayout)
    const observer = new ResizeObserver(updateLayout)
    observer.observe(content)

    return () => {
      cancelAnimationFrame(animationFrame)
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateLayout)
      observer.disconnect()
    }
  }, [contentRef])

  function jumpToRatio(ratio: number) {
    window.scrollTo({
      top: ratio * maximumScroll(),
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }

  function jumpToMarker(marker: Marker) {
    const target = marker.targetId ? document.getElementById(marker.targetId) : null
    if (!target) return jumpToRatio(marker.ratio)

    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - 24,
      behavior: prefersReducedMotion() ? 'auto' : 'smooth'
    })
  }

  function handleRailClick(event: MouseEvent<HTMLButtonElement>) {
    const bounds = event.currentTarget.getBoundingClientRect()
    const horizontal = bounds.width > bounds.height
    const position = horizontal ? event.clientX - bounds.left : event.clientY - bounds.top
    jumpToRatio(Math.min(1, Math.max(0, position / (horizontal ? bounds.width : bounds.height))))
  }

  function handleRailKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, number> = {
      ArrowUp: -0.05,
      ArrowLeft: -0.05,
      ArrowDown: 0.05,
      ArrowRight: 0.05,
      PageUp: -0.2,
      PageDown: 0.2
    }

    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      jumpToRatio(event.key === 'Home' ? 0 : 1)
    } else if (steps[event.key]) {
      event.preventDefault()
      jumpToRatio(Math.min(1, Math.max(0, progress + steps[event.key])))
    }
  }

  if (!visible) return null

  const activeMarker = markers.reduce(
    (active, marker, index) => marker.ratio <= progress + 0.01 ? index : active,
    0
  )
  const progressStyle = { '--reading-progress': `${progress * 100}%` } as CSSProperties

  return (
    <nav className={styles.navigator} style={progressStyle} aria-label="Reading progress">
      <button
        className={styles.rail}
        type="button"
        onClick={handleRailClick}
        onKeyDown={handleRailKeyDown}
        role="scrollbar"
        aria-controls={contentId}
        aria-orientation={horizontal ? 'horizontal' : 'vertical'}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress * 100)}
        aria-label={`Reading progress: ${Math.round(progress * 100)}%. Click to move through the post.`}
      >
        <span className={styles.progress} />
      </button>

      <div className={styles.markers}>
        {markers.map((marker, index) => (
          <button
            className={`${styles.marker} ${index === activeMarker ? styles.activeMarker : ''}`}
            style={{ top: `${marker.ratio * 100}%` }}
            type="button"
            key={`${marker.targetId || marker.ratio}-${index}`}
            onClick={() => jumpToMarker(marker)}
            aria-label={`Go to ${marker.label}`}
            data-label={marker.label}
          />
        ))}
      </div>
      <output className={styles.percentage} aria-live="off">{Math.round(progress * 100)}%</output>
    </nav>
  )
}
