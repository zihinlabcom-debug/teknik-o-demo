import Image from 'next/image';
import officialLogo from '../../../../customer/public/brand/hizmetpey-resmi.png';

type BrandSize='compact'|'standard'|'hero'|'showcase';
const sizes={
  compact:{mark:'size-9',image:'size-[76px] -left-5 -top-[14px]',text:'text-[19px]',gap:'gap-1.5'},
  standard:{mark:'size-11',image:'size-[92px] -left-6 -top-[18px]',text:'text-[25px]',gap:'gap-2'},
  hero:{mark:'size-14',image:'size-[116px] -left-[30px] -top-[22px]',text:'text-[32px]',gap:'gap-2.5'},
  showcase:{mark:'size-16',image:'size-[132px] -left-[34px] -top-[25px]',text:'text-[36px]',gap:'gap-3'},
};

export function TeknikOBrand({size='standard',onDark=false,showWordmark=true,className='',wordmarkClassName=''}:{
  size?:BrandSize;onDark?:boolean;showWordmark?:boolean;className?:string;wordmarkClassName?:string;
}){
  const style=sizes[size];
  return <span aria-label={showWordmark?undefined:'HizmetPey'} className={`inline-flex min-w-0 items-center ${style.gap} ${className}`}>
    <span className={`relative ${style.mark} shrink-0 overflow-hidden rounded-xl bg-white shadow-sm`}>
      <Image src={officialLogo} alt="" className={`absolute max-w-none ${style.image}`} priority={size==='hero'||size==='showcase'}/>
    </span>
    {showWordmark&&<span className={`${style.text} truncate font-extrabold leading-none tracking-[-0.045em] ${onDark?'text-white':'text-[#082B4C]'} ${wordmarkClassName}`}>
      Hizmet<span className="text-[#E38245]">Pey</span>
    </span>}
  </span>;
}
