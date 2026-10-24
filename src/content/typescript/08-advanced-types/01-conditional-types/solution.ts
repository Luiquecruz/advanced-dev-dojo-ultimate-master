type If<C extends boolean, T, F> = C extends true ? T : F;

type IsString<T> = T extends string ? true : false;

type TypeName<T> =
  T extends string ? 'string' :
  T extends number ? 'number' :
  T extends boolean ? 'boolean' :
  T extends undefined ? 'undefined' :
  T extends (...args: never[]) => unknown ? 'function' :
  'object';

type Flatten<T> = T extends readonly unknown[] ? T[number] : T;

function typeName<T>(value: T): TypeName<T> {
  return typeof value as TypeName<T>;
}
