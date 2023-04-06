import { array, Errors, intersection, literal, partial, string, Type, type, TypeOf, union } from 'io-ts';
import { either, function as fp } from 'fp-ts';

export * from './enum';
export * from './excessType';

export const nftbbsAppKeyName = 'group_post';

const imageType = type({
  type: literal('Image'),
  mediaType: string,
  content: string,
});

const partialImages = partial({
  image: union([
    array(imageType),
    imageType,
  ]),
});

export const postBaseType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      partialImages,
      type({
        type: literal('Note'),
        id: string,
        content: string,
      }),
      partial({
        name: string,
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export const postExcludedType = type({
  type: literal('Create'),
  object: type({
    type: literal('Note'),
    inreplyto: type({
      type: literal('Note'),
      id: string,
    }),
  }),
});

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
    either.map((v) => v as PostType),
  ),
  fp.identity,
);

export const commentType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      partialImages,
      type({
        type: literal('Note'),
        id: string,
        content: string,
        inreplyto: type({
          type: literal('Note'),
          id: string,
        }),
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export const postDeleteType = intersection([
  type({
    type: literal('Delete'),
    object: type({
      type: literal('Note'),
      id: string,
    }),
  }),
  partial({
    published: string,
  }),
]);

export const postAppendType = intersection([
  type({
    type: literal('Create'),
    object: type({
      type: literal('NoteAppend'),
      id: string,
      content: string,
      inreplyto: type({
        type: literal('Note'),
        id: string,
      }),
    }),
  }),
  partial({
    published: string,
  }),
]);

export const nonUndoCounterType = intersection([
  type({
    type: union([literal('Like'), literal('Dislike')]),
    object: type({
      type: literal('Note'),
      id: string,
    }),
  }),
  partial({
    published: string,
  }),
]);
export const undoCounterType = intersection([
  type({
    type: literal('Undo'),
    object: nonUndoCounterType,
  }),
  partial({
    published: string,
  }),
]);
export const counterType = union([nonUndoCounterType, undoCounterType]);

export const profileType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      type({
        type: literal('Profile'),
        name: string,
        describes: type({
          type: literal('Person'),
          id: string,
        }),
      }),
      partialImages,
      partial({
        wallet: array(type({
          id: string,
          type: string,
          name: string,
        })),
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);

export const imageActivityType = intersection([
  type({
    type: literal('Create'),
    object: intersection([
      imageType,
      type({
        id: string,
      }),
    ]),
  }),
  partial({
    published: string,
  }),
]);
export const nonUndoRelationType = intersection([
  type({
    type: union([literal('Follow'), literal('Block')]),
    object: type({
      type: literal('Person'),
      id: string,
    }),
  }),
  partial({
    published: string,
  }),
]);
export const undoRelationType = intersection([
  type({
    type: literal('Undo'),
    object: nonUndoRelationType,
  }),
  partial({
    published: string,
  }),
]);
export const relationType = union([nonUndoRelationType, undoRelationType]);

export type ImageType = TypeOf<typeof imageType>;
export type PostType = TypeOf<typeof postBaseType>;
export type PostDeleteType = TypeOf<typeof postDeleteType>;
export type PostAppendType = TypeOf<typeof postAppendType>;
export type NonUndoCounterType = TypeOf<typeof nonUndoCounterType>;
export type UndoCounterType = TypeOf<typeof undoCounterType>;
export type CounterType = TypeOf<typeof counterType>;
export type CommentType = TypeOf<typeof commentType>;
export type ImageActivityType = TypeOf<typeof imageActivityType>;
export type ProfileType = TypeOf<typeof profileType>;
export type NonUndoRelationType = TypeOf<typeof nonUndoRelationType>;
export type UndoRelationType = TypeOf<typeof undoRelationType>;
export type RelationType = TypeOf<typeof relationType>;
