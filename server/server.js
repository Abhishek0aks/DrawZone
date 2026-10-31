'use strict';
const { createServer } = require('./src/createServer');

const PORT = Number(process.env.PORT) || 3001;
const app = createServer();

app.httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `Port ${PORT} is already in use. Another DrawZone server is probably running.\n` +
        'Close the other terminal (Ctrl+C) or change the port: $env:PORT = "3002"'
    );
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

app.httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`DrawZone server running at http://localhost:${PORT}`);
  console.log(`Health check:             http://localhost:${PORT}/health`);
});

function shutdown() {
  console.log('Shutting down...');
  app.close().then(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
