// Manufacturer labels are extractive, not model-written diagnoses/translations.
// A semantic reviewer must still reject misleading omissions or wrong context.
function normalized(value:string) {
 return value.normalize('NFKC').replace(/-\s*\r?\n\s*/g,'').toLocaleLowerCase('en')
  .replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
}
export function isSourceFaithfulLabel(label:string,basis:string):boolean {
 if(!label.trim()||!basis.trim())return false;
 const source=' '+normalized(basis)+' ';
 let offset=0;
 // Slash-separated neutral source phrases are allowed, e.g. electrodes / cables.
 // Each complete phrase must occur literally and in order in its own evidence.
 for(const phrase of label.split('/')) {
  const part=normalized(phrase);if(!part)return false;
  const index=source.indexOf(' '+part+' ',offset);if(index<0)return false;
  offset=index+part.length+1;
 }
 return true;
}
