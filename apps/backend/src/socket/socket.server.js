const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

function initSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    },
    path: '/socket.io'
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('AUTH_REQUIRED'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = {
        id: decoded.sub,
        role: decoded.role,
        storeId: decoded.storeId
      };
      next();
    } catch (error) {
      return next(new Error('TOKEN_INVALID'));
    }
  });

  io.on('connection', (socket) => {
    const { storeId, role, id } = socket.user;

    socket.join(`store:${storeId}`);
    if (role === 'admin' || role === 'accountant') {
      socket.join(`admin:${storeId}`);
    }
    socket.join(`employee:${id}`);
  });

  return io;
}

function emitToStore(io, storeId, event, payload) {
  io.to(`store:${storeId}`).emit(event, payload);
}

function emitToAdmin(io, storeId, event, payload) {
  io.to(`admin:${storeId}`).emit(event, payload);
}

module.exports = { initSocket, emitToStore, emitToAdmin };
