import { FastifyInstance } from 'fastify';
import { Server, Socket } from 'socket.io';
import { Notification, Post } from '~/orm';

let socketIo: Server | null = null;

const userToSocket: Record<string, Socket> = {};

export interface SocketIOEventMap {
  notification: Notification
  trx: {
    trxId: string
    type: 'post' | 'comment' | 'uniqueCounter' | 'profile' | 'groupInfo'
  }
  postEdit: {
    post: Post
    updatedTrxId: string
  }
  postDelete: {
    post: Post
    deletedTrxId: string
  }
}

export const trySendSocket = <T extends keyof SocketIOEventMap>(userAddress: string, event: T, data: SocketIOEventMap[T]) => {
  const socket = userToSocket[userAddress];
  if (socket) {
    socket.emit(event, data);
  }
};

export const broadcast = <T extends keyof SocketIOEventMap>(event: T, data: SocketIOEventMap[T]) => {
  if (!socketIo) { return; }
  socketIo.emit(event, data);
};

export const initSocket = (fastify: FastifyInstance) => {
  socketIo = new Server(fastify.server, {
    cors: {
      origin: '*',
      methods: ['PUT', 'GET', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['secretHeader'],
      credentials: true,
    },
  });

  socketIo.on('connection', (socket) => {
    socket.on('disconnect', (_reason) => {
      for (const [userAddress, _socket] of Object.entries(userToSocket)) {
        if (_socket.id === socket.id) {
          delete userToSocket[userAddress];
        }
      }
    });

    socket.on('authenticate', (userAddress) => {
      if (!userAddress) {
        socket.emit('authenticateResult', 'userAddress is required');
      }
      userToSocket[userAddress] = socket;
      socket.emit('authenticateResult', 'socket connected');
    });
  });
};

export const disposeSocket = () => {
  socketIo?.close();
};
