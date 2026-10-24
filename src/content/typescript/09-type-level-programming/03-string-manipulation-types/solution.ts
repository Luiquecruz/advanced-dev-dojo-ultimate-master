type Whitespace = ' ' | '\n' | '\t';

type TrimStart<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimStart<Rest> : S;

type ReplaceAll<S extends string, From extends string, To extends string> = From extends ''
  ? S
  : S extends `${infer Before}${From}${infer After}`
    ? `${Before}${To}${ReplaceAll<After, From, To>}`
    : S;

type Split<S extends string, Separator extends string> = S extends `${infer Head}${Separator}${infer Rest}`
  ? [Head, ...Split<Rest, Separator>]
  : [S];

type KebabToCamel<S extends string> = S extends `${infer Word}-${infer Rest}`
  ? `${Word}${Capitalize<KebabToCamel<Rest>>}`
  : S;

type StringLength<S extends string, Counter extends unknown[] = []> = S extends `${string}${infer Rest}`
  ? StringLength<Rest, [...Counter, unknown]>
  : Counter['length'];

function kebabToCamel<S extends string>(value: S): KebabToCamel<S> {
  return value.replace(/-(\w)/g, (_match, letter: string) => letter.toUpperCase()) as KebabToCamel<S>;
}
