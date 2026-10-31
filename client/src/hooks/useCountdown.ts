import { useEffect, useState } from 'react';

// Seconds left until `deadline` (a SERVER timestamp). clockOffset = serverNow - clientNow,
// so a wrong clock on the player's computer does not change the timer.
export function useCountdown(deadline: number | null, clockOffset: number): number {
  const compute = () =>
    deadline === null ? 0 : Math.max(0, Math.ceil((deadline - (Date.now() + clockOffset)) / 1000));
  const [seconds, setSeconds] = useState(compute);

  useEffect(() => {
    setSeconds(compute());
    if (deadline === null) return undefined;
    const id = window.setInterval(() => setSeconds(compute()), 250);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deadline, clockOffset]);

  return seconds;
}
