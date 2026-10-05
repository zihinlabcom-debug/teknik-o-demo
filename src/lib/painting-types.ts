import type {PaintingSurface,PaintingType} from './painting-price-data';

export type ScopeType='complete_home'|'specific_area';
export type RepairStatus='none'|'wide_putty'|'serious_plaster_damage';
export type ColorTone='light'|'dark';
export interface PaintingFields {
  scopeType?:ScopeType;netAreaM2?:number;paintedRoomCount?:number;furnished?:boolean;
  ceilingHeightM?:number;ceilingHeightMode?:'standard'|'custom';paintWalls?:boolean;paintCeiling?:boolean;
  surfaceType?:Extract<PaintingSurface,'old_painted'|'new_plaster'|'satin_plaster_drywall'>;
  repairStatus?:RepairStatus;extraPuttyM2?:number;
  oldColorTone?:ColorTone;newColorTone?:ColorTone;paintType?:PaintingType;
  paintBrand?:string;colorCode?:string;colorName?:string|null;
  colorSelectionSource?:'manual'|'dyo_catalog';
}
export type PaintingQuestionKey='scopeType'|'netAreaM2'|'paintedRoomCount'|'furnished'|'ceilingHeightM'|
 'surfaces'|'surfaceType'|'repairStatus'|'extraPuttyM2'|'oldColorTone'|'newColorTone'|'paintType'|'brandColor';
export interface PaintingState {
 version:1;fields:PaintingFields;currentQuestionKey:PaintingQuestionKey|null;
 answeredQuestionKeys:PaintingQuestionKey[];answeredSystemQuestions:number;
 stage:'collecting'|'confirming_color'|'priced'|'manual_review';
}
export interface PaintingQuote {
 wallAreaM2:number;ceilingAreaM2:number;totalPaintAreaM2:number;
 selectedWallPozId:string|null;selectedCeilingPozId:string|null;
 wallReferenceCost:number;ceilingReferenceCost:number;repairCost:number;
 furnishedExtraFee:number;scaffoldExtraFee:number;regionalCoefficient:1;
 referenceCost:number;riskPremium:number;serviceFee:number;finalPrice:number;
}
