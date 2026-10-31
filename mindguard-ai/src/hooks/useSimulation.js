import { useEffect, useRef, useState } from 'react';
import { simulateScenario, USE_MOCK_DATA } from '../services/api.js';

/**
 * Send simulation inputs to the service whenever they change and keep
 * only the newest result. Remote calls are debounced; the mock path
 * resolves on the next tick so sliders feel instant.
 */
export function useSimulation(inputs) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(true);
  const requestId = useRef(0);

  useEffect(() => {
    const id = ++requestId.current;
    setPending(true);
    const run = () =>
      simulateScenario(inputs)
        .then(({ data }) => {
          if (id !== requestId.current) return;
          setResult(data);
          setError(null);
        })
        .catch((err) => {
          if (id === requestId.current) setError(err);
        })
        .finally(() => {
          if (id === requestId.current) setPending(false);
        });

    if (USE_MOCK_DATA) {
      run();
      return undefined;
    }
    const timer = setTimeout(run, 200);
    return () => clearTimeout(timer);
  }, [inputs]);

  return { result, error, pending };
}
