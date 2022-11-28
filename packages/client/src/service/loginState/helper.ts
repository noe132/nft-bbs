import store from 'store2';
import * as t from 'io-ts';
import { either } from 'fp-ts';

const LOGIN_STATE_KEY = 'login_state';

const loginState = t.intersection([
  t.type({
    groups: t.record(t.string, t.union([
      t.partial({
        lastLogin: t.union([t.literal('keystore'), t.literal('mixin'), t.nullType]),
        keystore: t.type({
          keystore: t.string,
          privateKey: t.string,
          address: t.string,
          password: t.string,
        }),
        mixin: t.type({
          mixinJWT: t.string,
          userName: t.string,
        }),
      }),
      t.undefined,
    ])),
  }),
  t.partial({
    autoLoginGroupId: t.union([
      t.nullType,
      t.number,
    ]),
    autoOpenGroupId: t.union([
      t.nullType,
      t.number,
    ]),
  }),
]);

export type LoginState = t.TypeOf<typeof loginState>;

export const getLoginState = (): LoginState => {
  const result = loginState.decode(store(LOGIN_STATE_KEY));
  if (either.isRight(result)) {
    return result.right;
  }
  return {
    groups: {},
    autoLoginGroupId: null,
    autoOpenGroupId: null,
  };
};

export const setLoginState = (v: Partial<LoginState>) => {
  store('login_state', {
    ...getLoginState(),
    ...v,
  });
};
