import {normalizePartText} from './parts-catalog';
// Domains identify manufacturers, not a finite list of supported models/error codes.
export const DOMAINS: Record<string,string[]> = {
  vaillant:['vaillant.com.tr','vaillant.com','vaillant.co.uk'],
  bosch:['bosch-homecomfort.com','bosch-thermotechnology.com','bosch.com.tr'],
  demirdokum:['demirdokum.com.tr'], buderus:['buderus.com','buderus.com.tr'],
  baymak:['baymak.com.tr'], eca:['eca.com.tr'], ariston:['ariston.com'],
  viessmann:['viessmann.com.tr','viessmann.com'], ferroli:['ferroli.com'],
  immergas:['immergas.com','immergas.com.tr'], airfel:['airfel.com.tr'],
  arcelik:['arcelik.com.tr'], beko:['beko.com','beko.com.tr'], warmhaus:['warmhaus.com.tr','warmhaus.com'],
};
export function approvedHost(url: string, brand: string) {
  try {
    const u=new URL(url), host=u.hostname.toLowerCase();
    if(u.protocol!=='https:' || u.username || u.password || u.port) return false;
    const brandKey=normalizePartText(brand).replace(/ /g,'');
    const domains=DOMAINS[brandKey];
    if(domains) return domains.some(d=>host===d || host.endsWith('.'+d));
    // Discovery can search new brands, but a hostname alone cannot prove ownership.
    return false;
  } catch {return false;}
}
