// Small in-memory fixed-window rate limiter (no extra dependency).
// LIMITATION (documented): counters live in this process only. With several server instances, or after a restart,
// each has its own counters. Per-account lockout (User.failedLogins/lockUntil) is DB-backed and covers that gap for logins.
function rateLimit({ windowMs, max, message = 'Too many requests. Please try again later.', key = (req) => req.ip, skip = () => false }) {
  const hits = new Map(); // key -> { count, reset }
  const timer = setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, Math.max(windowMs, 60000));
  timer.unref();
  return (req, res, next) => {
    if (skip(req)) return next();
    const now = Date.now();
    const k = key(req);
    let h = hits.get(k);
    if (!h || h.reset <= now) { h = { count: 0, reset: now + windowMs }; hits.set(k, h); }
    h.count++;
    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - h.count)));
    if (h.count > max) {
      res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json({ message, code: 'RATE_LIMITED' });
    }
    next();
  };
}
module.exports = rateLimit;
