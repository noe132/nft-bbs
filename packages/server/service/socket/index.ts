import { FastifyInstance } from 'fastify';
import { Server, Socket } from 'socket.io';
import { Notification, Post, UniqueCounter } from '~/orm';

let socketIo: Server | null = null;

// TODO: by groupId-userAddress
const socketMap = {
  byId: new Map<string, Socket>(),
  byAddress: new Map<string, Socket>(),
};

export interface SocketIOEventMap {
  notification: Notification
  trx: {
    trxId: string
    type: 'post' | 'comment' | 'profile' | 'groupInfo'
  }
  uniqueCounter: {
    uniqueCounter: UniqueCounter
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

interface SendParams<T extends keyof SocketIOEventMap> {
  event: T
  data: SocketIOEventMap[T]
  userAddress?: string
  broadcast?: boolean
}


export const send = <T extends keyof SocketIOEventMap>(params: SendParams<T>) => {
  if (params.userAddress) {
    const socket = socketMap.byAddress.get(params.userAddress);
    if (socket) {
      socket.emit(params.event, params.data);
    }
  } else if (params.broadcast) {
    if (!socketIo) { return; }
    socketIo.emit(params.event, params.data);
  }
};

const logout = (socketId: string) => {
  Array.from(socketMap.byAddress.entries())
    .filter(([_k, v]) => v.id === socketId)
    .forEach(([k]) => {
      socketMap.byAddress.delete(k);
    });
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
    socketMap.byId.set(socket.id, socket);

    socket.on('disconnect', (_reason) => {
      socketMap.byId.delete(socket.id);
      logout(socket.id);
    });

    socket.on('authenticate', (userAddress) => {
      if (!userAddress) {
        socket.emit('authenticateResult', 'userAddress is required');
      }
      socketMap.byAddress.set(userAddress, socket);
      socket.emit('authenticateResult', 'socket connected');
    });

    socket.on('logout', () => {
      logout(socket.id);
    });
  });
};

export const disposeSocket = () => {
  socketIo?.close();
};
