import {InMemoryVerifiedKnowledgeRepository} from '../src/lib/verified-knowledge.ts';
import test from 'node:test';import assert from 'node:assert/strict';
test('repository can be loaded independently of the research service',()=>{
 assert.equal(new InMemoryVerifiedKnowledgeRepository().durability,'process_memory');
});
