import { runOpportunityScan } from './opportunityScanner.js';

let intervalId = null;

export function startScannerWorker() {
  const ms = parseInt(process.env.SCAN_INTERVAL_MS || '900000', 10); // 15 min

  const run = async () => {
    try {
      const result = await runOpportunityScan();
      if (!result.skipped && result.created > 0) {
        console.log(`🔍 Scanner: ${result.created} nuevas oportunidades (${result.pending} pendientes)`);
      }
    } catch (err) {
      console.warn('Scanner error:', err.message);
    }
  };

  setTimeout(run, 8000);
  intervalId = setInterval(run, ms);
  console.log(`🔍 Scanner automático cada ${Math.round(ms / 60000)} min`);
}

export function stopScannerWorker() {
  if (intervalId) clearInterval(intervalId);
}
