import ts from 'typescript';

type SignalApi = 'input' | 'model' | 'output' | 'outputFromObservable' | 'viewChild' | 'viewChildren' | 'contentChild' | 'contentChildren';

const SIGNAL_APIS = new Set<SignalApi>(['input', 'model', 'output', 'outputFromObservable', 'viewChild', 'viewChildren', 'contentChild', 'contentChildren']);

const deepClone = (ts as unknown as { getSynthesizedDeepClone<T extends ts.Node>(node: T): T }).getSynthesizedDeepClone;

const QUERY_DECORATORS: Partial<Record<SignalApi, string>> = {
  viewChild: 'ViewChild',
  viewChildren: 'ViewChildren',
  contentChild: 'ContentChild',
  contentChildren: 'ContentChildren',
};

interface SignalCall {
  api: SignalApi;
  required: boolean;
  call: ts.CallExpression;
}

function readSignalCall(initializer: ts.Expression | undefined): SignalCall | undefined {
  if (!initializer || !ts.isCallExpression(initializer)) {
    return undefined;
  }
  let callee = initializer.expression;
  let required = false;
  if (ts.isPropertyAccessExpression(callee) && callee.name.text === 'required') {
    required = true;
    callee = callee.expression;
  }
  const name = ts.isIdentifier(callee) ? callee.text : ts.isPropertyAccessExpression(callee) ? callee.name.text : undefined;
  return name && SIGNAL_APIS.has(name as SignalApi) ? { api: name as SignalApi, required, call: initializer } : undefined;
}

function optionsArgument({ api, required, call }: SignalCall): ts.Expression | undefined {
  if (api === 'output') return call.arguments[0];
  if (api === 'input' || api === 'model') return required ? call.arguments[0] : call.arguments[1];
  if (api === 'outputFromObservable') return call.arguments[1];
  return call.arguments[1];
}

function readAlias(options: ts.Expression | undefined): string | undefined {
  if (!options || !ts.isObjectLiteralExpression(options)) {
    return undefined;
  }
  const alias = options.properties.find(
    (property): property is ts.PropertyAssignment => ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === 'alias',
  );
  return alias && ts.isStringLiteralLike(alias.initializer) ? alias.initializer.text : undefined;
}

/**
 * Mirrors the Angular CLI JIT transform: signal inputs, models, outputs and signal queries get the decorators the JIT compiler reads.
 */
export const angularJitTransformer: ts.TransformerFactory<ts.SourceFile> = (context) => {
  const { factory } = context;

  const angularCore = () =>
    factory.createCallExpression(factory.createIdentifier('require'), undefined, [factory.createStringLiteral('@angular/core')]);

  const decorator = (name: string, args: ts.Expression[]) =>
    factory.createDecorator(factory.createCallExpression(factory.createPropertyAccessExpression(angularCore(), name), undefined, args));

  const object = (entries: Record<string, ts.Expression>) =>
    factory.createObjectLiteralExpression(Object.entries(entries).map(([key, value]) => factory.createPropertyAssignment(key, value)));

  const decoratorsFor = (fieldName: string, signal: SignalCall): ts.Decorator[] => {
    const options = optionsArgument(signal);
    const publicName = readAlias(options) ?? fieldName;
    switch (signal.api) {
      case 'input':
        return [decorator('Input', [object({ isSignal: factory.createTrue(), alias: factory.createStringLiteral(publicName), required: signal.required ? factory.createTrue() : factory.createFalse() })])];
      case 'model':
        return [
          decorator('Input', [object({ isSignal: factory.createTrue(), alias: factory.createStringLiteral(publicName), required: signal.required ? factory.createTrue() : factory.createFalse() })]),
          decorator('Output', [factory.createStringLiteral(`${publicName}Change`)]),
        ];
      case 'output':
      case 'outputFromObservable':
        return [decorator('Output', [factory.createStringLiteral(publicName)])];
      default: {
        const locator = signal.call.arguments[0];
        if (!locator) {
          return [];
        }
        const queryOptions = options
          ? factory.createObjectLiteralExpression([factory.createSpreadAssignment(deepClone(options)), factory.createPropertyAssignment('isSignal', factory.createTrue())])
          : object({ isSignal: factory.createTrue() });
        return [decorator(QUERY_DECORATORS[signal.api]!, [deepClone(locator), queryOptions])];
      }
    }
  };

  const visitClassMember = (member: ts.ClassElement): ts.ClassElement => {
    if (!ts.isPropertyDeclaration(member) || !ts.isIdentifier(member.name)) {
      return member;
    }
    const signal = readSignalCall(member.initializer);
    if (!signal) {
      return member;
    }
    const decorators = decoratorsFor(member.name.text, signal);
    return factory.updatePropertyDeclaration(member, [...decorators, ...(member.modifiers ?? [])], member.name, member.questionToken ?? member.exclamationToken, member.type, member.initializer);
  };

  const visit = (node: ts.Node): ts.Node => {
    if (ts.isClassDeclaration(node) && ts.getDecorators(node)?.length) {
      return factory.updateClassDeclaration(node, node.modifiers, node.name, node.typeParameters, node.heritageClauses, node.members.map(visitClassMember));
    }
    return ts.visitEachChild(node, visit, context);
  };

  return (sourceFile) => ts.visitNode(sourceFile, visit) as ts.SourceFile;
};
