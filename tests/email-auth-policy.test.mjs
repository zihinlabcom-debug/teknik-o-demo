import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeEmail,validEmailOtp,safeAuthOrigin,sameOriginJson,smsAuthEnabled} from '../apps/customer/src/lib/email-auth-policy.ts';
test('email identity normalization and malformed input',()=>{
 assert.equal(normalizeEmail('  Test@Example.COM '),'test@example.com');
 for(const value of [null,{},'x','a@@x.test','x y@z.test','a@b','x'.repeat(255)+'@a.test'])assert.equal(normalizeEmail(value),null);
});
test('OTP requires exactly six ASCII digits',()=>{
 assert.equal(validEmailOtp('012345'),true);
 for(const value of [123456,'12345','1234567','123 45','１２３４５６',' 123456',null])assert.equal(validEmailOtp(value),false);
});
test('recovery origin rejects arbitrary redirects',()=>{
 for(const value of [undefined,'//evil.test','https://a.test/next','https://a.test?next=x','https://u:p@a.test','http://remote.test','javascript:alert(1)'])assert.throws(()=>safeAuthOrigin(value));
 assert.equal(safeAuthOrigin('https://customer.example.test'),'https://customer.example.test');
 assert.equal(safeAuthOrigin('http://127.0.0.1:3130'),'http://127.0.0.1:3130');
});
test('JSON auth endpoints reject cross-site and form posts',()=>{
 const request=headers=>new Request('https://app.test/api/auth/email/login',{method:'POST',headers});
 assert.ok(sameOriginJson(request({'content-type':'application/json','origin':'https://app.test'})));
 assert.equal(sameOriginJson(request({'content-type':'application/json','origin':'https://evil.test'})),false);
 assert.equal(sameOriginJson(request({'content-type':'application/json','sec-fetch-site':'cross-site'})),false);
 assert.equal(sameOriginJson(request({'content-type':'application/x-www-form-urlencoded'})),false);
});
test('test environment flags cannot enable SMS',()=>{
 process.env.TEST_OTP_ENABLED='true';assert.equal(smsAuthEnabled(),false);delete process.env.TEST_OTP_ENABLED;
});
