/* eslint-disable consistent-return */
/* eslint-disable default-case */
/* eslint-disable @typescript-eslint/no-parameter-properties */
/* eslint-disable max-classes-per-file */
import { either, function as fp } from 'fp-ts';
import * as t from 'io-ts';

const getIsCodec = <T extends t.Any>(tag: string) => (codec: t.Any): codec is T => (codec as any)._tag === tag;
const isInterfaceCodec = getIsCodec<t.InterfaceType<t.Props>>('InterfaceType');
const isPartialCodec = getIsCodec<t.PartialType<t.Props>>('PartialType');

type AllowedTypes = t.HasProps;

const getProps = (codec: AllowedTypes): t.Props => {
  switch (codec._tag) {
    case 'RefinementType':
    case 'ReadonlyType':
      return getProps(codec.type);
    case 'InterfaceType':
    case 'StrictType':
    case 'PartialType':
      return codec.props as t.Props;
    case 'IntersectionType':
      return codec.types.reduce<t.Props>((props, type) => Object.assign(props, getProps(type)), {});
  }
};

const getNameFromProps = (props: t.Props): string => Object.keys(props)
  .map((k) => `${k}: ${props[k].name}`)
  .join(', ');

const getPartialTypeName = (inner: string): string => `Partial<${inner}>`;

const getExcessTypeName = (codec: t.Any): string => {
  if (isInterfaceCodec(codec)) {
    return `{| ${getNameFromProps(codec.props)} |}`;
  } if (isPartialCodec(codec)) {
    return getPartialTypeName(`{| ${getNameFromProps(codec.props)} |}`);
  }
  return `Excess<${codec.name}>`;
};

const getExcessiveKeys = <T = any>(o: T, props: t.Props): Array<string> => {
  const keys = Object.getOwnPropertyNames(o);
  const propsKeys = Object.getOwnPropertyNames(props);

  propsKeys.forEach((pk) => {
    const index = keys.indexOf(pk);
    if (index !== -1) {
      keys.splice(index, 1);
    }
  });

  return keys;
};

const validateExcessiveKeys = <T = any>(o: T, props: t.Props, context: t.Context): either.Either<t.Errors, T> => {
  const keys = getExcessiveKeys(o, props);

  return keys.length
    ? either.left(keys.map((k) => ({
      value: (o as any)[k],
      context,
      message: `excess key "${k}" found`,
    } as t.ValidationError)))
    : either.right(o);
};

export const excess = <C extends AllowedTypes>(codec: C, name: string = getExcessTypeName(codec)): ExcessType<C> => {
  const props: t.Props = getProps(codec);
  return new ExcessType<C>(
    name,
    (u): u is C => !getExcessiveKeys(u, props).length && codec.is(u),
    (u, c) => {
      const b: t.Validation<C> = fp.pipe(
        t.UnknownRecord.validate(u, c),
        either.chain(() => codec.validate(u, c)),
        either.chain(() => validateExcessiveKeys(u, props, c)),
        either.map(() => u as C),
      );
      return b;
    },
    fp.identity,
    codec,
  );
};

export class ExcessType<C extends t.Any, A = C['_A'], O = A, I = unknown> extends t.Type<A, O, I> {
  public readonly _tag = 'ExcessType' as const;
  public constructor(
    name: string,
    is: ExcessType<C, A, O, I>['is'],
    validate: ExcessType<C, A, O, I>['validate'],
    encode: ExcessType<C, A, O, I>['encode'],
    public readonly type: C,
  ) {
    super(name, is, validate, encode);
  }
}
