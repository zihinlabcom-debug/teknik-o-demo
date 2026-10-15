import 'server-only';
import {parseIyzicoSandboxConfig} from './iyzico-config-contract';

export function loadIyzicoSandboxConfig() {
  return parseIyzicoSandboxConfig(process.env);
}
