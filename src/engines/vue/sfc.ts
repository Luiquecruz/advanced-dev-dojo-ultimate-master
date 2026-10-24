import { compileScript, compileStyle, compileTemplate, parse } from '@vue/compiler-sfc';
import { CompileError, transpile } from '../shared/compile';

function hashId(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Compiles a Single File Component into an ES module (TypeScript allowed).
 */
export function compileSfcToModule(fileName: string, code: string): { code: string; lang: string } {
  const { descriptor, errors } = parse(code, { filename: fileName });
  if (errors.length > 0) {
    throw new CompileError(`${fileName}: ${errors.map((error) => (error instanceof Error ? error.message : String(error))).join('\n')}`);
  }
  const id = hashId(fileName);
  const scopeId = `data-v-${id}`;
  const scoped = descriptor.styles.some((style) => style.scoped);
  const lang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang ?? 'js';
  const parts: string[] = [];

  if (descriptor.script || descriptor.scriptSetup) {
    const script = compileScript(descriptor, {
      id,
      inlineTemplate: true,
      genDefaultAs: '__sfc__',
      templateOptions: { scoped, compilerOptions: { scopeId: scoped ? scopeId : undefined } },
    });
    parts.push(script.content);
  } else {
    parts.push('const __sfc__ = {};');
  }

  if (descriptor.template && !descriptor.scriptSetup) {
    const template = compileTemplate({
      source: descriptor.template.content,
      filename: fileName,
      id,
      scoped,
      compilerOptions: { scopeId: scoped ? scopeId : undefined },
    });
    if (template.errors.length > 0) {
      throw new CompileError(`${fileName}: ${template.errors.map((error) => (typeof error === 'string' ? error : error.message)).join('\n')}`);
    }
    parts.push(template.code.replace(/\bexport function render\b/, 'function render'), '__sfc__.render = render;');
  }

  for (const style of descriptor.styles) {
    const result = compileStyle({ source: style.content, filename: fileName, id: scopeId, scoped: style.scoped });
    parts.push(`import __injectStyle_${parts.length} from '__dojo/style';\n__injectStyle_${parts.length}(${JSON.stringify(result.code)});`);
  }

  if (scoped) {
    parts.push(`__sfc__.__scopeId = ${JSON.stringify(scopeId)};`);
  }
  parts.push(`__sfc__.__name = ${JSON.stringify(fileName.replace(/\.vue$/, ''))};`, 'export default __sfc__;');
  return { code: parts.join('\n'), lang };
}

/**
 * Compiles any file of a Vue project into CommonJS.
 */
export function compileVueFile(name: string, code: string): string {
  if (name.endsWith('.vue')) {
    const sfc = compileSfcToModule(name, code);
    return transpile(sfc.code, { fileName: name.replace(/\.vue$/, sfc.lang === 'tsx' || sfc.lang === 'jsx' ? '.tsx' : '.ts') });
  }
  return transpile(code, { fileName: name });
}
