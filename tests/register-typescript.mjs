import { registerHooks } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

// Node 24 test adapter; uses the project's existing TypeScript dependency.
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts') && !specifier.endsWith('.ts')) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.endsWith('.ts') && !url.includes('/node_modules/')) {
      return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
      }).outputText };
    }
    return nextLoad(url, context);
  },
});
