'use client';
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';
import {isDebugQuery,type ServiceResponse} from '../lib/service-presentation';
import {DiagnosisDebugPanel} from './service-result';
function DebugContent({response}:{response:ServiceResponse|null}){
  const params=useSearchParams();
  return <DiagnosisDebugPanel enabled={isDebugQuery(params?.toString()??'')} response={response} />;
}
export function DiagnosisDebug({response}:{response:ServiceResponse|null}){
  return <Suspense fallback={null}><DebugContent response={response} /></Suspense>;
}
