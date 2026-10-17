import Image from 'next/image';

type BrandSize='compact'|'standard'|'hero';
const styles={
  compact:{frame:'h-[70px] w-[100px]',image:'size-[100px] -top-[14px]'},
  standard:{frame:'h-[88px] w-[126px]',image:'size-[126px] -top-[18px]'},
  hero:{frame:'h-[112px] w-[160px]',image:'size-[160px] -top-[23px]'},
} as const;

export function HizmetPeyBrand({size='standard',className='' }:{size?:BrandSize;className?:string;onDark?:boolean}){
  const visual=styles[size];
  return <span className={`relative inline-flex shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ${visual.frame} ${className}`}>
    <Image src="/brand/hizmetpey-resmi.png" alt="HizmetPey" width={160} height={160} className={`absolute left-0 h-auto max-w-none object-contain ${visual.image}`} priority/>
  </span>;
}
