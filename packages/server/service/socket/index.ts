import * as QuorumLightNodeSDK from 'quorum-light-node-sdk-nodejs';
import { FastifyInstance } from 'fastify';
import { either } from 'fp-ts';
import { number, string, type, TypeOf } from 'io-ts';
import { DislikeType, LikeType } from 'nft-bbs-types';
import { Server, Socket } from 'socket.io';
import { GroupStatus, Notification, Profile, PostAppend } from '~/orm';

let socketIo: Server | null = null;

interface SocketItem {
  socket: Socket
  groupId: GroupStatus['id']
  address: string
}

const socketArr: Array<SocketItem> = [];

export interface SocketIOEventMap {
  post: { trxId: string }
  comment: { trxId: string }
  notification: Notification
  counter: {
    trxId: string
    type: LikeType['type'] | DislikeType['type']
    objectType: 'comment' | 'post'
    objectId: string
  }
  profile: Profile
  postDelete: {
    trxId: string
  }
  appconfig: {
    groupId: GroupStatus['id']
    data: Record<QuorumLightNodeSDK.IAppConfigItem['Name'], undefined | QuorumLightNodeSDK.IAppConfigItem>
  }
  postAppend: PostAppend
}

type SendParams<T extends keyof SocketIOEventMap> = {
  event: T
  data: SocketIOEventMap[T]
  groupId?: GroupStatus['id']
} & ({
  userAddress: string
} | {
  broadcast: true
});

const authenticateData = type({
  userAddress: string,
  groupId: number,
});

export type AuthenticateData = TypeOf<typeof authenticateData>;
export type SendFn = typeof send;

const send = <T extends keyof SocketIOEventMap>(params: SendParams<T>) => {
  if ('userAddress' in params) {
    const sockets = socketArr.filter((v) => v.address === params.userAddress && v.groupId === params.groupId);
    sockets.forEach((v) => {
      v.socket.emit(params.event, params.data);
    });
  } else if (params.broadcast) {
    if (!socketIo) { return; }
    const sockets = socketArr.filter((v) => (params.groupId ? v.groupId === params.groupId : true));
    sockets.forEach((v) => {
      v.socket.emit(params.event, params.data);
    });
  }
};

const logout = (socketId: string) => {
  const index = socketArr.findIndex((v) => v.socket.id === socketId);
  if (index !== -1) {
    socketArr.splice(index, 1);
  }
};

const init = (fastify: FastifyInstance) => {
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
      logout(socket.id);
    });

    socket.on('authenticate', (data: AuthenticateData) => {
      const result = authenticateData.decode(data);
      if (either.isLeft(result)) {
        socket.emit('authenticateResult', 'invalid authenticate');
      }
      const index = socketArr.findIndex((v) => v.socket.id === socket.id);
      if (index !== -1) {
        socketArr.splice(index, 1);
      }
      socketArr.push({
        socket,
        address: data.userAddress,
        groupId: data.groupId,
      });
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


export const socketService = {
  init,

  send,
};
