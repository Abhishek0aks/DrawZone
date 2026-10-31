import { io } from 'socket.io-client';

// ONE socket for the whole app. By default it talks to port 3001 of the same computer
// that served the page, so it also works when a phone opens http://<laptop-ip>:5173.
const SERVER_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ||
  (import.meta.env.DEV ? `${window.location.protocol}//${window.location.hostname}:3001` : window.location.origin);

export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnectionDelayMax: 3000,
  timeout: 5000,
});

export { SERVER_URL };

if (import.meta.env.DEV) {
  socket.on('connect', () => console.debug('[socket] connected', socket.id));
  socket.on('disconnect', (reason) => console.debug('[socket] disconnected:', reason));
  socket.on('connect_error', (err) => console.debug('[socket] connect_error:', err.message));
}
