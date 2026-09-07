import { useState, useEffect } from 'react';
import io from 'socket.io-client';

const useSocket = (url) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!url) return;

    const socketInstance = io(url);
    setSocket(socketInstance);

    const handleConnect = () => {
      setConnected(true);
      console.log('Socket connected');
    };

    const handleDisconnect = () => {
      setConnected(false);
      console.log('Socket disconnected');
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('disconnect', handleDisconnect);

    return () => {
      socketInstance.off('connect', handleConnect);
      socketInstance.off('disconnect', handleDisconnect);
      socketInstance.disconnect();
    };
  }, [url]);

  return { socket, connected };
};

export default useSocket;