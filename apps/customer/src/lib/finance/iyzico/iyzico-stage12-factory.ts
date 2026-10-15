import 'server-only';
import {IyzicoSandboxAdapter} from './iyzico-adapter';
import {IyzicoClient} from './iyzico-client';
import {loadIyzicoSandboxConfig} from './iyzico-config';
import {IyzicoStage12Repository} from './iyzico-stage12-repository';
import {IyzicoStage12Server} from './iyzico-stage12-server';
import {IyzicoHttpTransport} from './iyzico-transport';

export function createIyzicoStage12Server(){
  const config=loadIyzicoSandboxConfig();
  const client=new IyzicoClient(new IyzicoHttpTransport(config));
  return new IyzicoStage12Server(
    new IyzicoSandboxAdapter(config,client),new IyzicoStage12Repository(),process.env,
  );
}