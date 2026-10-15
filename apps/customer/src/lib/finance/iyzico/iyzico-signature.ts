import {createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import type {IyzicoSandboxConfig} from './iyzico-config-contract';
import {IyzicoError} from './iyzico-errors';

const endpointPath=/^\/[a-z0-9][a-z0-9/-]*$/;

export function createIyzicoRandomKey(): string {
  return `${Date.now()}${randomBytes(12).toString('hex')}`;
}

export function createIyzicoRequestSignature(secretKey:string,randomKey:string,path:string,body:string):string{
  if(!secretKey||!randomKey||!endpointPath.test(path)||typeof body!=='string')
    throw new IyzicoError('invalid_signature_input','validation',false,'İstek imzası oluşturulamadı.');
  return createHmac('sha256',secretKey).update(randomKey+path+body,'utf8').digest('hex');
}

export function createIyzicoAuthorization(
  config:IyzicoSandboxConfig,randomKey:string,path:string,body:string,
):Readonly<{authorization:string;randomKey:string;signature:string}>{
  const signature=createIyzicoRequestSignature(config.secretKey,randomKey,path,body);
  const pki=`apiKey:${config.apiKey}&randomKey:${randomKey}&signature:${signature}`;
  return Object.freeze({authorization:`IYZWSv2 ${Buffer.from(pki,'utf8').toString('base64')}`,randomKey,signature});
}

export function constantTimeHexEqual(left:string,right:string):boolean{
  if(!/^[0-9a-f]{64}$/i.test(left)||!/^[0-9a-f]{64}$/i.test(right))return false;
  return timingSafeEqual(Buffer.from(left,'hex'),Buffer.from(right,'hex'));
}
