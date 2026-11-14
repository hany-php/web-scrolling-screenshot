import { scaleCssToPhysicalPx } from '../capture/dimensions';

export default defineUnlistedScript(() => {
  // Phase 0 on-demand injected script skeleton; full scroll orchestration arrives in Phase 1.
  const metrics = scaleCssToPhysicalPx(
    Math.max(1, document.documentElement.scrollWidth),
    Math.max(1, document.documentElement.scrollHeight),
    window.devicePixelRatio || 1,
  );
  return metrics;
});
