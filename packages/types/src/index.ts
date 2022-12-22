import { either, function as fp } from 'fp-ts';
import { array, Errors, intersection, literal, partial, string, tuple, Type, type, TypeOf, union, unknown } from 'io-ts';
import { excess } from './excessType';

export * from './enum';
export * from './excessType';

export const nftbbsAppKeyName = 'group_post';

const postBaseType = type({
  type: literal('Note'),
  content: string,
  name: string,
});

const postExcludedType = union([
  type({
    inreplyto: unknown,
  }),
  type({
    attributedTo: unknown,
  }),
]);

export const postType = new Type<PostType>(
  'post type',
  (u): u is PostType => postBaseType.is(u) && !postExcludedType.is(u),
  (u, c) => fp.pipe(
    postBaseType.validate(u, c),
    either.chain(() => fp.pipe(
      postExcludedType.validate(u, c),
      either.match(
        () => either.right(u),
        () => either.left([{
          value: u,
          context: c,
          message: 'item has unwanted properties',
        }] as Errors),
      ),
    )),
    either.chain((u) => {
      if ((u as PostType).content === 'OBJECT_STATUS_DELETED') {
        return either.left([{
          value: u,
          context: c,
          message: 'post delete type',
        }] as Errors);
      }
      return either.right(u);
    }),
    either.map((v) => v as PostType),
  ),
  fp.identity,
);

export const postAppendType = type({
  type: literal('NoteAppend'),
  content: string,
  attributedTo: tuple([
    type({
      type: literal('Note'),
      id: string,
    }),
  ]),
});

export const commentType = excess(intersection([
  type({
    type: literal('Note'),
    content: string,
    inreplyto: type({
      trxid: string,
    }),
  }),
  partial({
    image: array(type({
      name: string,
      mediaType: string,
      content: string,
    })),
  }),
]));

export const likeType = excess(type({
  type: literal('Like'),
  id: string,
}));

export const dislikeType = excess(type({
  type: literal('Dislike'),
  id: string,
}));

export const imageType = excess(type({
  type: literal('Note'),
  attributedTo: tuple([
    type({
      type: literal('Note'),
    }),
  ]),
  content: string,
  name: string,
  image: array(intersection([
    type({
      mediaType: string,
      content: string,
    }),
    partial({
      name: string,
    }),
  ])),
}));

export const profileType = excess(intersection([
  type({
    name: string,
  }),
  partial({
    image: type({
      mediaType: string,
      content: string,
    }),
    wallet: unknown,
  }),
]));

export const postDeleteType = type({
  type: literal('Note'),
  id: string,
  content: literal('OBJECT_STATUS_DELETED'),
});

export type PostType = TypeOf<typeof postBaseType>;
export type PostAppendType = TypeOf<typeof postAppendType>;
export type CommentType = TypeOf<typeof commentType>;
export type LikeType = TypeOf<typeof likeType>;
export type DislikeType = TypeOf<typeof dislikeType>;
export type ImageType = TypeOf<typeof imageType>;
export type ProfileType = TypeOf<typeof profileType>;
export type PostDeleteType = TypeOf<typeof postDeleteType>;
