import test from 'node:test';import assert from 'node:assert/strict';
import {discoverManufacturerSources} from '../src/lib/manufacturer-discovery.ts';
test('discovery returns official source candidates without pretending to validate their fault contents',async()=>{
 const identity={brand:'Vaillant',model:'MODEL X',code:'F28'};
 const client={responses:{create:async()=>({status:'completed',output:[],output_text:JSON.stringify({sources:[
  {url:'https://www.vaillant.com.tr/user.pdf#page=3',title:'User manual; fault not in search snippet'},
  {url:'https://www.vaillant.com.tr/user.pdf#top',title:'Same manual'},
  {url:'https://seller.example/doc.pdf',title:'Seller manual'}]})})}};
 const sources=await discoverManufacturerSources(client,identity,['vaillant.com.tr'],[],0,AbortSignal.timeout(5000));
 assert.deepEqual(sources,[{url:'https://www.vaillant.com.tr/user.pdf',title:'User manual; fault not in search snippet'}]);
 assert.equal(sources[0].verified,undefined);
});
