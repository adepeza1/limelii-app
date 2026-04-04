import { useEffect, useRef } from "react";

/**
 * Intercepts the browser back gesture (iOS swipe back) for in-component detail
 * views that don't change the URL. Pushes a history entry when the detail is
 * active, and calls onBack instead of navigating away when the user goes back.
 */
export function useBackHandler(isActive: boolean, onBack: () => void) {
  const pushed = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive) return;

    window.history.pushState({ internalDetail: true }, "");
    pushed.current = true;

    const handlePopState = () => {
      pushed.current = false;
      onBackRef.current();
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (pushed.current) {
        // Detail was closed via UI button, not swipe — pop the entry we pushed
        pushed.current = false;
        window.history.back();
      }
    };
  }, [isActive]);
}
