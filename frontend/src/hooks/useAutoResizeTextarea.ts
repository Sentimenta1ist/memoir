import { useCallback } from 'react'

const supportsFieldSizing =
  typeof CSS !== 'undefined' && !!CSS.supports?.('field-sizing', 'content')

/**
 * Resizes a textarea to fit its content without forcing a collapse-then-grow
 * reflow on every keystroke: it only remeasures via `height: auto` when the
 * content may have shrunk. On browsers that support CSS `field-sizing:
 * content` (declared in styles.css), this is a no-op — the browser sizes the
 * textarea natively with no JS reflow at all.
 */
export function useAutoResizeTextarea() {
  return useCallback((el: HTMLTextAreaElement | null) => {
    if (!el || supportsFieldSizing) return

    if (el.scrollHeight > el.clientHeight) {
      el.style.height = `${el.scrollHeight}px`
      return
    }

    const prevHeight = el.style.height
    el.style.height = 'auto'
    el.style.height = el.scrollHeight < el.clientHeight ? `${el.scrollHeight}px` : prevHeight
  }, [])
}
