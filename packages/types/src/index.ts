import { array, intersection, literal, partial, string, type, TypeOf, union } from 'io-ts';

export * from './enum';
export * from './excessType';

export const nftbbsAppKeyName = 'group_post';

const imageType = type({
  type: literal('Image'),
  mediaType: string,
  content: string,
});

const partialImages = partial({
  images: array(imageType),
});

export const postType = type({
  type: literal('Create'),
  object: intersection([
    partialImages,
    type({
      type: literal('Note'),
      id: string,
      name: string,
      content: string,
    }),
  ]),
});

// export const postAppendType = type({
//   type: literal('NoteAppend'),
//   content: string,
//   attributedTo: tuple([
//     type({
//       type: literal('Note'),
//       id: string,
//     }),
//   ]),
// });

export const commentType = type({
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
});

export const postDeleteType = type({
  type: literal('Delete'),
  object: type({
    type: literal('Note'),
    id: string,
  }),
});

export const postAppendType = type({
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
});

export const nonUndoCounterType = type({
  type: union([literal('Like'), literal('Dislike')]),
  object: type({
    type: literal('Note'),
    id: string,
  }),
});
export const undoCounterType = type({
  type: literal('Undo'),
  object: nonUndoCounterType,
});
export const counterType = union([nonUndoCounterType, undoCounterType]);

export const profileType = type({
  type: literal('Create'),
  object: intersection([
    type({
      type: literal('Person'),
      name: string,
    }),
    partial({
      avatar: imageType,
      wallet: array(type({
        id: string,
        type: string,
        name: string,
      })),
    }),
  ]),
});

export const imageActivityType = type({
  type: literal('Create'),
  object: intersection([
    imageType,
    type({
      id: string,
    }),
  ]),
});

export const nonUndoRelationType = type({
  type: union([literal('Follow'), literal('Block')]),
  object: type({
    type: literal('Person'),
    id: string,
  }),
});
export const undoRelationType = type({
  type: literal('Undo'),
  object: nonUndoRelationType,
});
export const relationType = union([nonUndoRelationType, undoRelationType]);

export type ImageType = TypeOf<typeof imageType>;
export type PostType = TypeOf<typeof postType>;
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
