import Image from 'next/image';

type BrandSize='compact'|'standard'|'hero'|'showcase';
const sizes={
  compact:{mark:34,text:'text-lg',gap:'gap-1.5'},
  standard:{mark:46,text:'text-[1.65rem]',gap:'gap-2'},
  hero:{mark:64,text:'text-[2.65rem] sm:text-5xl',gap:'gap-2'},
  showcase:{mark:96,text:'text-[2.8rem] sm:text-[3.4rem]',gap:'gap-3'},
};

export function TeknikOBrand({size='standard',onDark=false,showWordmark=true,className='',wordmarkClassName=''}:{
  size?:BrandSize;onDark?:boolean;showWordmark?:boolean;className?:string;wordmarkClassName?:string;
}){
  const style=sizes[size];
  return <span aria-label={showWordmark?undefined:'TEKNİK-O'} className={`inline-flex items-center ${style.gap} ${className}`}>
    <span className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
      <Image src="/logo-icon.png" alt="" width={Math.round(style.mark*648/691)} height={style.mark} className="object-contain" priority={size==='hero'||size==='showcase'} />
    </span>
    {showWordmark&&<span className={`${style.text} font-black leading-none tracking-[-0.055em] ${onDark?'text-white':'text-[#0B1727]'} ${wordmarkClassName}`}>
      TEKNİK-<span className="text-[#D97724]">O</span>
    </span>}
  </span>;
}
