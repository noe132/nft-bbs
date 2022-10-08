import { FastifyInstance } from 'fastify';
import { either } from 'fp-ts';
import { string, type, TypeOf } from 'io-ts';
import { Server, Socket } from 'socket.io';
import { Notification, Post, UniqueCounter } from '~/orm';

let socketIo: Server | null = null;

const socketMap = {
  byId: new Map<string, Socket>(),
  byAddress: new Map<string, Socket>(),
  byGroupId: new Map<string, Socket>(),
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

type SendParams<T extends keyof SocketIOEventMap> = {
  event: T
  data: SocketIOEventMap[T]
  groupId: string
} & ({
  userAddress: string
} | {
  broadcast: true
});

const authenticateData = type({
  userAddress: string,
  groupId: string,
});

export type AuthenticateData = TypeOf<typeof authenticateData>;

export const send = <T extends keyof SocketIOEventMap>(params: SendParams<T>) => {
  if ('userAddress' in params) {
    const socket1 = socketMap.byAddress.get(params.userAddress);
    const socket2 = socketMap.byGroupId.get(params.groupId);
    if (!socket1 || socket1 !== socket2) { return; }
    socket1.emit(params.event, params.data);
  } else if (params.broadcast) {
    if (!socketIo) { return; }
    socketIo.emit(params.event, params.data);
  }
};

const logout = (socketId: string) => {
  [socketMap.byAddress, socketMap.byGroupId].forEach((map) => {
    Array.from(map.entries())
      .filter(([_k, v]) => v.id === socketId)
      .forEach(([k]) => {
        socketMap.byAddress.delete(k);
      });
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

    socket.on('authenticate', (data: AuthenticateData) => {
      const result = authenticateData.decode(data);
      if (either.isLeft(result)) {
        socket.emit('authenticateResult', 'invalid authenticate');
      }
      socketMap.byAddress.set(data.userAddress, socket);
      socketMap.byGroupId.set(data.groupId, socket);
      socket.emit('authenticateResult', 'socket connected');
    });

    socket.on('logout', () => {
      logout(socket.id);
    });
  });

  return () => {
    socketIo?.close();
  };
};
