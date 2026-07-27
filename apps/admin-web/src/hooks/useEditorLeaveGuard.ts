import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";

/**
 * Blocks in-app navigation and tab close while `when` is true.
 * After discard/publish, clear `when` then call `proceedLeave()`.
 * For acknowledged leave while still blocked (stale live / draft-only save), use `proceedLeave({ force: true })`.
 */
export function useEditorLeaveGuard(when: boolean) {
  const whenRef = useRef(when);
  whenRef.current = when;
  const forceLeaveOnceRef = useRef(false);
  const [guardEpoch, setGuardEpoch] = useState(0);

  const blocker = useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) => {
        if (forceLeaveOnceRef.current) {
          forceLeaveOnceRef.current = false;
          return false;
        }
        if (!whenRef.current) return false;
        if (currentLocation.pathname === nextLocation.pathname) return false;
        return true;
      },
      [guardEpoch],
    ),
  );

  const proceedLeave = useCallback(
    (options?: { force?: boolean }) => {
      if (options?.force) {
        forceLeaveOnceRef.current = true;
      }
      if (blocker.state === "blocked") {
        blocker.proceed();
      }
    },
    [blocker],
  );

  const cancelBlockedNavigation = useCallback(() => {
    forceLeaveOnceRef.current = false;
    if (blocker.state === "blocked") {
      blocker.reset();
    }
    setGuardEpoch((n) => n + 1);
  }, [blocker]);

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (forceLeaveOnceRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [when]);

  return { blocker, proceedLeave, cancelBlockedNavigation };
}
