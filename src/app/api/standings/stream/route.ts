import { fetchLiveResults } from "@/lib/espn-api";
import type { LiveResults } from "@/types";

// Global cache shared across all connections
let globalCache: LiveResults | null = null;
let lastFetchTime = 0;

// Server-side polling interval (5 seconds)
const POLL_INTERVAL = 5 * 1000;

// Track if we're already polling
let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;
const connectedClients = new Set<ReadableStreamDefaultController>();

/**
 * Start the global polling loop (runs once, shared by all clients)
 */
function startPolling() {
  if (isPolling) return;
  isPolling = true;

  const poll = async () => {
    try {
      const results = await fetchLiveResults();
      const hasChanged = JSON.stringify(results) !== JSON.stringify(globalCache);
      
      globalCache = results;
      lastFetchTime = Date.now();

      // Only push if data changed and we have clients
      if (hasChanged && connectedClients.size > 0) {
        const message = `data: ${JSON.stringify(results)}\n\n`;
        const encoder = new TextEncoder();
        const data = encoder.encode(message);
        
        // Push to all connected clients
        for (const controller of connectedClients) {
          try {
            controller.enqueue(data);
          } catch {
            // Client disconnected, will be cleaned up
          }
        }
      }
    } catch (error) {
      console.error("Polling error:", error);
    }
  };

  // Initial fetch
  poll();

  // Set up interval
  pollInterval = setInterval(poll, POLL_INTERVAL);
}

/**
 * Stop polling when no clients are connected
 */
function stopPollingIfNoClients() {
  if (connectedClients.size === 0 && pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
    isPolling = false;
  }
}

export async function GET() {
  // Start polling if not already running
  startPolling();

  const stream = new ReadableStream({
    start(controller) {
      // Add this client to the set
      connectedClients.add(controller);

      // Send current cached data immediately if available
      if (globalCache) {
        const message = `data: ${JSON.stringify(globalCache)}\n\n`;
        controller.enqueue(new TextEncoder().encode(message));
      }

      // Send a heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": heartbeat\n\n"));
        } catch {
          clearInterval(heartbeat);
        }
      }, 30000);

      // Cleanup on close - this is handled by the cancel callback
    },
    cancel() {
      // Remove this client from the set
      for (const controller of connectedClients) {
        try {
          // Try to find and remove this controller
          connectedClients.delete(controller);
        } catch {
          // Already cleaned up
        }
      }
      stopPollingIfNoClients();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // Disable nginx buffering
    },
  });
}
