// An explicit handoff stays in page memory; questions never enter URLs or storage.
let pending='';
export const handoffEvent='lihuaji:xiaoli-handoff';
export function queueQuestion(question:string){pending=question.trim().slice(0,500);}
export function takeQuestion(){const value=pending;pending='';return value;}
