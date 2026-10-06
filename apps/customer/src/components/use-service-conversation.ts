'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {classifyServiceCategory,isServiceCategory,type ServiceCategory} from '../lib/service-categories';
import {hidesFinalTechnicalText,type ServiceResponse} from '../lib/service-presentation';
export interface ServiceChatMessage {id:string;sender:'user'|'ai';text:string;options?:string[];time:string}
export function useServiceConversation(endpoint='/api/diagnose'){
  const [messages,setMessages]=useState<ServiceChatMessage[]>([]),[input,setInput]=useState('');
  const [isAnalyzing,setIsAnalyzing]=useState(false),[category,setCategory]=useState<ServiceCategory|null>(null);
  const [response,setResponse]=useState<ServiceResponse|null>(null),[resultDismissed,setResultDismissed]=useState(false);
  const current=useRef<{category:ServiceCategory|null;stateToken:string|null;conversationToken:string|null;messages:ServiceChatMessage[]}>({category:null,stateToken:null,conversationToken:null,messages:[]});
  const busy=useRef(false);
  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      if(current.current.messages.length)return;
      const query=new URLSearchParams(window.location.search).get('category');
      let saved:string|null=null;try{saved=localStorage.getItem('tekniko_service_category');localStorage.removeItem('tekniko_service_category');}catch{/* Storage may be disabled. */}
      const initial=isServiceCategory(query)?query:isServiceCategory(saved)?saved:null;
      if(initial){current.current.category=initial;setCategory(initial);}
    },0);
    return ()=>window.clearTimeout(timer);
  },[]);
  const reset=()=>{
    if(busy.current)return;
    current.current={category:null,stateToken:null,conversationToken:null,messages:[]};
    setMessages([]);setInput('');setCategory(null);setResponse(null);setResultDismissed(false);
  };
  const submit=useCallback(async(text:string,selectedCategory?:ServiceCategory)=>{
    if(!text.trim()||busy.current)return;
    busy.current=true;setIsAnalyzing(true);setResultDismissed(false);
    const detected=classifyServiceCategory(text,current.current.category);
    const nextCategory=selectedCategory??detected??current.current.category;
    const changed=current.current.category!==null&&nextCategory!==current.current.category;
    if(changed){current.current={category:nextCategory,stateToken:null,conversationToken:null,messages:[]};setResponse(null);}
    current.current.category=nextCategory;setCategory(nextCategory);
    const before=current.current.messages;
    const user:ServiceChatMessage={id:crypto.randomUUID(),sender:'user',text,time:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})};
    current.current.messages=[...before,user];setMessages(current.current.messages);setInput('');
    try{
      const history=before.map(m=>({role:m.sender==='ai'?'assistant':'user',content:m.text}));
      const reply=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        message:text,history,chatHistory:history,stateToken:current.current.stateToken,
        conversationToken:current.current.conversationToken,category:nextCategory??undefined,categorySelected:!!selectedCategory,turnId:user.id,
      })});
      if(!reply.ok)throw Error('Service response unavailable');
      const data=await reply.json() as ServiceResponse;
      const switched=data.category!==current.current.category&&current.current.category!==null;
      current.current.category=data.category;current.current.stateToken=data.stateToken;current.current.conversationToken=data.conversationToken;
      setCategory(data.category);setResponse(data);
      const keep=switched?[user]:current.current.messages;
      current.current.messages=data.aiText&&!hidesFinalTechnicalText(data.resultState)?[...keep,{
        id:crypto.randomUUID(),sender:'ai',text:data.aiText,options:data.options,time:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'}),
      }]:keep;
      setMessages(current.current.messages);
    }catch{
      current.current.messages=[...current.current.messages,{id:crypto.randomUUID(),sender:'ai',text:'Bağlantı sırasında bir hata oluştu. Lütfen tekrar deneyin.',time:new Date().toLocaleTimeString('tr-TR',{hour:'2-digit',minute:'2-digit'})}];
      setMessages(current.current.messages);
    }finally{busy.current=false;setIsAnalyzing(false);}
  },[endpoint]);
  return {messages,input,setInput,isAnalyzing,category,response,submit,reset,resultDismissed,dismissResult:()=>setResultDismissed(true)};
}
