"use client";
const activeActions=new WeakSet<(value:boolean)=>void>();
export function beginUiAction(setBusy:(value:boolean)=>void){if(activeActions.has(setBusy))return false;activeActions.add(setBusy);return true;}
export function endUiAction(setBusy:(value:boolean)=>void){activeActions.delete(setBusy);}
