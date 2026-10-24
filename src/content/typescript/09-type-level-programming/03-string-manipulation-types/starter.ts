type Whitespace = ' ' | '\n' | '\t';

// TODO: remove leading whitespace recursively
type TrimStart<S extends string> = S;

// TODO: replace every occurrence of From with To
type ReplaceAll<S extends string, From extends string, To extends string> = S;

// TODO: split S by Separator into a tuple
type Split<S extends string, Separator extends string> = string[];

// TODO: convert kebab-case to camelCase
type KebabToCamel<S extends string> = S;

// TODO: count the characters with a tuple accumulator
type StringLength<S extends string> = number;

function kebabToCamel<S extends string>(value: S): KebabToCamel<S> {
  // TODO: implement the runtime conversion
  return value;
}
