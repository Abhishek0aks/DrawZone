import type { Socket } from 'socket.io-client';
import type { Ack } from '../types';

type TimeoutEmitter = {
  emit: (event: string, payload: object, cb: (err: Error | null, res: Ack<never>) => void) => void;
};

// Sends an event and waits for the server's acknowledgment.
// Never hangs: if the server does not answer in time, the promise resolves with an error.
export function emitWithAck<T extends object = object>(
  socket: Socket,
  event: string,
  payload: object = {},
  timeoutMs = 5000,
): Promise<Ack<T>> {
  return new Promise((resolve) => {
    if (!socket.connected) {
      resolve({ ok: false, error: 'Not connected to the server. Make sure the backend is running, then try again.' });
      return;
    }
    const emitter = socket.timeout(timeoutMs) as unknown as TimeoutEmitter;
    emitter.emit(event, payload, (err, res) => {
      if (err) {
        resolve({ ok: false, error: 'The server did not answer in time. Please try again.' });
      } else {
        resolve(res as unknown as Ack<T>);
      }
    });
  });
}
