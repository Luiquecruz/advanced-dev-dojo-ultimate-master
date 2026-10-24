// TODO: resolve to T when C is true, otherwise F
type If<C extends boolean, T, F> = unknown;

// TODO: true when T is assignable to string, otherwise false
type IsString<T> = boolean;

// TODO: chain conditional types to mirror the typeof operator
type TypeName<T> = string;

// TODO: unwrap one level of array, leave other types unchanged
type Flatten<T> = T;

function typeName<T>(value: T): TypeName<T> {
  // TODO: return the runtime typeof string, typed as TypeName<T>
  return '';
}
