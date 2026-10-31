import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · Sisyphus` : 'Sisyphus · Workplace Wellbeing & Workload Forecasting';
  }, [title]);
}
