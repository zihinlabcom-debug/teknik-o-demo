import {execFileSync,spawnSync} from 'node:child_process';
export const docker='D:/DockerDesktop-T111/app/resources/bin/docker.exe';
const connection=['--host','npipe:////./pipe/dockerDesktopLinuxEngine'];
export const container='hizmetpey-t111-postgres-20261030';
export const database=process.env.T111_TEST_DATABASE??'t111_rehearsal';
if(!['t111_rehearsal','t111_release','t111_rollback','t111_acceptance'].includes(database))throw Error('Invalid T111-only database');
export function assertTarget(){
 const [c]=JSON.parse(execFileSync(docker,[...connection,'inspect',container],{encoding:'utf8'}));
 const [n]=JSON.parse(execFileSync(docker,[...connection,'network','inspect','hizmetpey-t111-rehearsal-20261030'],{encoding:'utf8'}));
 if(c.Id!=='f1f6c4d23a9330f93b76c96564d8b22ae28b9bf4a787096aa4e5a800d22258dd'||c.Config.Labels?.['hizmetpey.task']!=='t111'||c.Config.Labels?.['hizmetpey.owner']!=='codex-local-setup'||!c.State.Running||!n.Internal||Object.keys(c.HostConfig.PortBindings??{}).length||c.Mounts.some(m=>m.Type!=='volume'||m.Name!=='hizmetpey-t111-pgdata-20261030'))throw Error('Unsafe T111-only PostgreSQL target');
}
export function sql(text,{role=null}={}){
 assertTarget();if(role&&!['anon','authenticated','service_role'].includes(role))throw Error('Invalid test role');
 const r=spawnSync(docker,[...connection,'exec','-i',container,'psql','-X','-q','-t','-A','-v','ON_ERROR_STOP=1','-U','postgres','-d',database],{input:(role?`set role ${role};\n`:'')+text,encoding:'utf8',timeout:60000,maxBuffer:32*1024*1024});
 if(r.status!==0)throw Error(r.stderr||r.error?.message||'psql failed');return r.stdout.trim();
}
