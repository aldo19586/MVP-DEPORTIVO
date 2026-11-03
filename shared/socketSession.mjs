// Both clients read the current token for each handshake, including reconnects.
export function bindSocketSession(socket, { getToken, invalidate, onReplaced, onError = () => {} }) {
  let active = true;
  let handshakeToken;
  socket.auth = async callback => {
    try {
      const token = await getToken();
      if (active) { handshakeToken = token; callback({ token }); }
    } catch { if (active) onError({ message: 'No se pudo leer la sesión guardada' }); }
  };
  const invalid = async () => {
    if (!active) return;
    socket.disconnect();
    try { await invalidate(handshakeToken); }
    catch { if (active) onError({ message: 'No se pudo limpiar la sesión guardada' }); }
  };
  const connectionError = error => { if (error.data?.code === 'SESSION_INVALID') void invalid(); };
  const replaced = () => { if (active) { socket.disconnect(); onReplaced(); } };
  const operationError = error => { if (active && error.code !== 'SESSION_INVALID') onError(error); };
  socket.on('sessionInvalid', invalid);
  socket.on('connect_error', connectionError);
  socket.on('session_replaced', replaced);
  socket.on('operationError', operationError);
  return () => {
    active = false;
    socket.off('sessionInvalid', invalid);
    socket.off('connect_error', connectionError);
    socket.off('session_replaced', replaced);
    socket.off('operationError', operationError);
  };
}
