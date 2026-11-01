import type { Answer } from './knowledge';
export interface ConversationMessage {id:number;role:'user'|'assistant';text:string;reply?:Answer}
// Page-memory only: survives an in-app reading trip, never a reload or closed tab.
let conversation:ConversationMessage[]=[];
export function readConversation(){return conversation.slice();}
export function saveConversation(messages:ConversationMessage[]){conversation=messages.slice(-40);}
export function hasConversation(){return conversation.some(m=>m.role==='user');}
