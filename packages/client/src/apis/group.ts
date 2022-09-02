import request from '~/request';
import { API_BASE_URL } from './common';

export const join = async (seedUrl: string) => {
  const data: { status: 0, msg: string } = await request(
    `${API_BASE_URL}/group/join`,
    {
      method: 'post',
      body: { seedUrl },
      json: true,
    },
  );
  return data;
};
