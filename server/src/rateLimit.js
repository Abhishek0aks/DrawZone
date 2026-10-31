'use strict';

// Tiny fixed-window limiter stored on socket.data. Returns true if the action is allowed.
function allow(socket, key, max, windowMs, now = Date.now()) {
  const buckets = (socket.data.rate = socket.data.rate || {});
  const b = buckets[key];
  if (!b || now - b.start >= windowMs) {
    buckets[key] = { start: now, count: 1 };
    return true;
  }
  b.count += 1;
  return b.count <= max;
}

module.exports = { allow };
