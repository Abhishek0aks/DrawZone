'use strict';
const http = require('http');
const path = require('path');
const fs = require('fs');
const express = require('express');
const { Server } = require('socket.io');
const { DEFAULT_SETTINGS } = require('./config');
const { RoomStore } = require('./rooms');
const { GameService } = require('./game');
const { registerHandlers } = require('./handlers');

// Development default: localhost and private LAN addresses on any port.
const DEV_ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?$/;

function buildOriginCheck(list) {
  const allowed = (list || process.env.CLIENT_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return (origin, callback) => {
    if (!origin) return callback(null, true); // non-browser clients (tests, curl)
    if (allowed.length > 0) return callback(null, allowed.includes(origin));
    return callback(null, DEV_ORIGIN.test(origin));
  };
}

function createServer({ settings = {}, corsOrigins } = {}) {
  const config = { ...DEFAULT_SETTINGS, ...settings };
  const app = express();
  app.disable('x-powered-by');

  app.get('/health', (req, res) => {
    res.json({ status: 'ok', rooms: store.size, uptimeSeconds: Math.round(process.uptime()) });
  });
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/socket.io')) return next();
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }
  app.use((req, res) => res.status(404).json({ error: 'Not found' }));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('HTTP error:', err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: buildOriginCheck(corsOrigins) },
    maxHttpBufferSize: 1e5, // 100 KB per message is far more than this game needs
  });

  const store = new RoomStore();
  const game = new GameService({ io, store, settings: config });

  io.on('connection', (socket) => {
    registerHandlers({ io, socket, store, game, settings: config });
  });

  async function close() {
    store.closeAll();
    await new Promise((resolve) => io.close(() => resolve()));
  }

  return { app, httpServer, io, store, game, close };
}

module.exports = { createServer };
