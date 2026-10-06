import {UPHOLSTERY_PRODUCTS} from './cleaning-upholstery';
import {CARPET_PRODUCTS} from './cleaning-carpet';

type Row={label:string;value:string};
const object=(value:unknown):Record<string,unknown>|null=>
  value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:null;
const number=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?
  new Intl.NumberFormat('tr-TR',{maximumFractionDigits:2}).format(value):null;
const yn=(value:unknown)=>typeof value==='boolean'?value?'Evet':'Hayır':null;
const text=(value:unknown)=>typeof value==='string'&&value.length>0&&value.length<=160?value:null;
const option=(value:unknown,labels:Record<string,string>)=>
  typeof value==='string'?labels[value]??text(value):null;
const paintingLabels:Record<string,string>={
  complete_home:'Komple ev',specific_area:'Belirli oda/alan',
  old_painted:'Eski boyalı',new_plaster:'Yeni sıvalı',satin_plaster_drywall:'Saten alçılı / alçıpan',
  none:'Yok',wide_putty:'Geniş alan macun',serious_plaster_damage:'Ciddi sıva / derin hasar',
  light:'Açık',dark:'Koyu',manual:'Manuel',dyo_catalog:'DYO katalog',
};
const paintTypeLabels:Record<string,string>={
  white_lime:'Beyaz kireç badana',silicone_matte:'Silikonlu mat',
  plastic_matte:'Plastik mat',silicone_silk_matte:'Silikonlu ipek mat',
  silicone_semi_matte:'Silikonlu yarı mat',
  antibacterial_silicone_matte:'Antibakteriyel silikonlu mat',
  antibacterial_silicone_silk_matte:'Antibakteriyel silikonlu ipek mat',
  antibacterial_plastic_matte:'Antibakteriyel plastik mat',
  synthetic_gloss:'Sentetik parlak',synthetic_matte:'Sentetik mat',
  silicone_soft_matte:'Silikonlu soft mat',ceiling_water_based:'Tavan boyası',
};
const cleaningLabels:Record<string,string>={
  same_day:'Aynı gün',two_days:'2 gün',flexible:'Esnek',
  none:'Yok',normal:'Normal',full:'Tam cam',
  oven:'Fırın',fridge:'Buzdolabı',kitchenCabinets:'Mutfak dolabı',
  roomClosets:'Oda dolabı',sofaChairs:'Koltuk / sandalye',
  carpetSurface:'Halı yüzeyi',chandelier:'Avize',walls:'Duvar',
  handFloors:'Elle zemin',pet:'Evcil hayvan',windows:'Cam',
};
export function assessmentDetailRows(snapshot:unknown):Row[]{
  const root=object(snapshot);
  if(!root||root.schemaVersion!==1)return [];
  const selections=object(root.selections),calculation=object(root.calculation);
  const rows:Row[]=[];
  const add=(label:string,value:string|null)=>{if(value!==null)rows.push({label,value});};
  const unit=(value:unknown,suffix:string)=>{const n=number(value);return n===null?null:`${n} ${suffix}`;};
  if(root.category==='painting'){
    add('Hizmet',root.serviceType==='wall_painting'?'Duvar Boyama':text(root.serviceType));
    if(!selections)return rows;
    add('Kapsam',option(selections.scopeType,paintingLabels));
    add('Net alan',unit(selections.netAreaM2,'m²'));
    add('Oda sayısı',number(selections.paintedRoomCount));
    add('Eşyalı',yn(selections.furnished));
    add('Tavan yüksekliği',unit(selections.ceilingHeightM,'m'));
    add('Tavan yüksekliği seçimi',option(selections.ceilingHeightMode,
      {standard:'Standart',custom:'Belirtilen yükseklik'}));
    add('Duvar boyanacak',yn(selections.paintWalls));
    add('Tavan boyanacak',yn(selections.paintCeiling));
    add('Yüzey',option(selections.surfaceType,paintingLabels));
    add('Onarım durumu',option(selections.repairStatus,paintingLabels));
    add('Ek macun alanı',unit(selections.extraPuttyM2,'m²'));
    add('Mevcut ton',option(selections.oldColorTone,paintingLabels));
    add('Yeni ton',option(selections.newColorTone,paintingLabels));
    add('Boya türü',option(selections.paintType,paintTypeLabels));
    add('Renk seçim kaynağı',option(selections.colorSelectionSource,paintingLabels));
    add('Boya markası',text(selections.paintBrand));
    add('Renk kodu',text(selections.colorCode));
    add('Renk adı',text(selections.colorName));
    add('Renk önizlemesi',text(root.colorPreviewHex));
    add('Hesaplanan duvar alanı',unit(calculation?.wallAreaM2,'m²'));
    add('Hesaplanan tavan alanı',unit(calculation?.ceilingAreaM2,'m²'));
    add('Fiyat',unit(calculation?.finalPrice,'TL'));
  }else if(root.category==='cleaning'){
    add('Hizmet',root.serviceType==='home_cleaning'?'Ev Temizliği':
      root.serviceType==='apartment_cleaning'?'Apartman Temizliği':text(root.serviceType));
    if(!selections)return rows;
    if(root.serviceType==='home_cleaning'){
      add('Alan',unit(selections.areaM2,'m²'));
      add('Oda',number(selections.rooms));
      add('Banyo',number(selections.bathrooms));
      add('Balkon',number(selections.balconies));
      add('Ek işler',Array.isArray(selections.extras)?selections.extras
        .map(x=>option(x,cleaningLabels)).filter(Boolean).join(', ')||'Yok':null);
      add('Dolap temizlenecek oda',number(selections.closetRooms));
      add('Malzeme mevcut',yn(selections.materialsAvailable));
      add('Ekipman mevcut',yn(selections.equipmentAvailable));
      add('Süre tercihi',option(selections.duration,cleaningLabels));
    }else if(root.serviceType==='apartment_cleaning'){
      add('Kat',number(selections.floors));
      add('Daire',number(selections.apartments));
      add('Cam tipi',option(selections.glass,cleaningLabels));
      add('Asansör temizliği',yn(selections.elevator));
      add('Malzeme mevcut',yn(selections.materialsAvailable));
    }
    add('Fiyat',unit(calculation?.finalPrice,'TL'));
  }else if(root.category==='sofa_cleaning'||root.category==='carpet_cleaning'){
    add('Hizmet',root.category==='sofa_cleaning'?'Koltuk / Yatak Yıkama':'Halı Yıkama');
    if(selections&&Array.isArray(selections.items))for(const item of selections.items){
      const value=object(item);if(!value)continue;
      const product=(root.category==='sofa_cleaning'?UPHOLSTERY_PRODUCTS:CARPET_PRODUCTS)
        .find(p=>p.key===value.key);
      if(!product)continue;
      const quantity=number(value.quantity);
      const areas=Array.isArray(value.areasM2)?value.areasM2.map(n=>unit(n,'m²')).filter(Boolean):[];
      add(product.label,areas.length?areas.join(' + '):quantity?`${quantity} adet`:null);
    }
    add('Fiyat',unit(calculation?.finalPrice,'TL'));
  }else if(root.category==='boiler'){
    const device=object(root.device),outcome=object(root.outcome);
    add('Marka',text(device?.brand));
    add('Model',text(device?.model));
    add('Hata kodu',text(device?.errorCode));
    add('Yakıt türü',text(device?.fuelType));
    if(Array.isArray(root.customerAnswers))for(const answer of root.customerAnswers){
      const value=object(answer);
      if(value)add(text(value.evidenceGroup)??'Müşteri cevabı',text(value.answerKey));
    }
    add('Fiyatlamaya esas parça',text(outcome?.verifiedPart));
  }
  return rows;
}
