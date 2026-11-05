// Sends a "tick" once a second.
//
// Why a Worker and not a plain setInterval on the page? When a tab is in the
// background for a few minutes, Chrome slows the page's timers down to once
// per MINUTE to save battery – your "study's done" chime could be a minute
// late. Workers aren't slowed down like that.
//
// Note the tick is only a "wake up and look at the clock" signal. The timer
// itself is always calculated from saved timestamps, never by counting ticks.
setInterval(() => postMessage('tick'), 1000);
