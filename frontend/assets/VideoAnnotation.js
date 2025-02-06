import{d as z,e as f,f as b,g as H,o as d,c as u,a as s,w as K,v as X,F as h,h as T,i as q,n as V,j as $,t as g,k as w,l as G,_ as A,b as J,r as O}from"./main.js";const i=[];for(let o=0;o<256;++o)i.push((o+256).toString(16).slice(1));function Q(o,n=0){return(i[o[n+0]]+i[o[n+1]]+i[o[n+2]]+i[o[n+3]]+"-"+i[o[n+4]]+i[o[n+5]]+"-"+i[o[n+6]]+i[o[n+7]]+"-"+i[o[n+8]]+i[o[n+9]]+"-"+i[o[n+10]]+i[o[n+11]]+i[o[n+12]]+i[o[n+13]]+i[o[n+14]]+i[o[n+15]]).toLowerCase()}let S;const W=new Uint8Array(16);function Y(){if(!S){if(typeof crypto>"u"||!crypto.getRandomValues)throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");S=crypto.getRandomValues.bind(crypto)}return S(W)}const Z=typeof crypto<"u"&&crypto.randomUUID&&crypto.randomUUID.bind(crypto),U={randomUUID:Z};function ee(o,n,l){if(U.randomUUID&&!n&&!o)return U.randomUUID();o=o||{};const r=o.random||(o.rng||Y)();return r[6]=r[6]&15|64,r[8]=r[8]&63|128,Q(r)}const te={class:"card"},ne={class:"card-body"},oe={class:"form-group mb-4"},ae=["value"],se={class:"video-container"},ie=["src"],le={class:"timeline mt-4"},re=["onClick"],ce={class:"controls mt-4"},de={class:"labels-overview mt-4"},ue=["onClick","disabled"],ve=["disabled"],k="http://127.0.0.1:8000/api",me=z({__name:"VideoAnnotation",setup(o){const n=f(null),l=f([]),r=f(0),p=f(0),y=f([]),v=f(null),c=f(null),x=b(()=>[...l.value].sort((e,a)=>e.startTime-a.startTime)),R=b(()=>{var e;return((e=v.value)==null?void 0:e.url)||""}),D=b(()=>l.value.length>0&&l.value.every(e=>e.isComplete));async function L(){try{const e=await w.get(`${k}/videos/`);y.value=e.data}catch(e){console.error("Failed to fetch videos:",e)}}async function I(e){var _;const a=(_=e.target.files)==null?void 0:_[0];if(!a)return;const t=new FormData;t.append("video",a),t.append("center_name","your_center"),t.append("processor_name","your_processor");try{const m=await w.post(`${k}/videos/upload/`,t);console.log("Upload response:",m.data),m.data.url?v.value=m.data:console.error("No URL in response:",m.data)}catch(m){console.error("Upload failed:",m)}}function F(){n.value&&(r.value=n.value.currentTime,p.value=n.value.duration)}function M(e){const a=e.currentTarget;if(a&&n.value){const t=a.getBoundingClientRect(),m=(e.clientX-t.left)/t.width;n.value.currentTime=m*p.value}}function B(){if(n.value)if(c.value)c.value.endTime=n.value.currentTime,c.value.isComplete=!0,c.value=null;else{const e={id:ee(),startTime:n.value.currentTime,endTime:null,isComplete:!1};l.value.push(e),c.value=e}}function P(e){l.value.find(t=>t.id===e)===c.value&&(c.value=null),l.value=l.value.filter(t=>t.id!==e)}function E(e){const a=e.startTime/p.value*100,t=e.endTime?e.endTime/p.value*100:r.value/p.value*100;return{left:`${a}%`,width:`${t-a}%`}}function C(e){const a=Math.floor(e/60),t=Math.floor(e%60),_=Math.floor(e%1*1e3);return`${a.toString().padStart(2,"0")}:${t.toString().padStart(2,"0")}.${_.toString().padStart(3,"0")}`}function N(e){n.value&&(n.value.currentTime=e.startTime)}async function j(){if(v.value)try{await w.post(`${k}/annotations/`,{video_id:v.value.id,labels:l.value.map(e=>({start_time:e.startTime,end_time:e.endTime,label_type:"outside_body"}))}),l.value=[],c.value=null}catch(e){console.error("Failed to save annotations:",e)}}return H(async()=>{await L()}),(e,a)=>(d(),u("div",te,[a[6]||(a[6]=s("div",{class:"card-header pb-0"},[s("h4",{class:"mb-0"},"Video Annotation")],-1)),s("div",ne,[s("div",oe,[a[2]||(a[2]=s("label",{class:"form-control-label"},"Select Video",-1)),s("input",{type:"file",onChange:I,accept:"video/*",class:"form-control"},null,32),y.value.length?K((d(),u("select",{key:0,"onUpdate:modelValue":a[0]||(a[0]=t=>v.value=t),class:"form-select mt-3"},[a[1]||(a[1]=s("option",{value:""},"Select a video...",-1)),(d(!0),u(h,null,T(y.value,t=>(d(),u("option",{key:t.id,value:t},g(t.center_name)+" - "+g(t.processor_name),9,ae))),128))],512)),[[X,v.value]]):q("",!0)]),s("div",se,[s("video",{ref_key:"videoRef",ref:n,onTimeupdate:F,controls:"",class:"w-100",src:R.value},null,40,ie)]),s("div",le,[s("div",{class:"timeline-track",onClick:M,ref:"timelineRef"},[s("div",{class:"progress-bar",style:V({width:`${r.value/p.value*100}%`})},null,4),(d(!0),u(h,null,T(l.value,t=>(d(),u("div",{key:t.id,class:"timeline-label",style:V(E(t)),onClick:G(_=>N(t),["stop"])},[s("div",{class:$(["label-span",{recording:!t.isComplete}])},null,2)],12,re))),128))],512)]),s("div",ce,[s("button",{onClick:B,class:$(["btn",c.value?"btn-danger":"btn-primary"])},g(c.value?"End Recording":"+ Start Recording"),3)]),s("div",de,[a[5]||(a[5]=s("h5",{class:"font-weight-bolder mb-3"},"Annotations",-1)),(d(!0),u(h,null,T(x.value,t=>(d(),u("div",{key:t.id,class:"label-item"},[s("span",null,g(C(t.startTime))+" "+g(t.endTime?"- "+C(t.endTime):"(Recording...)"),1),a[4]||(a[4]=s("span",null,"Außerhalb d. Körpers",-1)),s("button",{onClick:_=>P(t.id),disabled:!t.isComplete,class:"btn btn-link text-danger p-0"},a[3]||(a[3]=[s("i",{class:"fas fa-trash"},null,-1)]),8,ue)]))),128))]),s("button",{onClick:j,class:"btn btn-success mt-4",disabled:!D.value}," Save Annotations ",8,ve)])]))}}),pe=A(me,[["__scopeId","data-v-227b15b2"]]),_e={name:"Dashboard",components:{VideoAnnotation:pe}},fe={class:"container-fluid h-100 w-100 py-1 px-4"},ge={class:"row"},ye={class:"col-12"};function be(o,n,l,r,p,y){const v=O("VideoAnnotation",!0);return d(),u("div",fe,[s("div",ge,[s("div",ye,[J(v)])])])}const Te=A(_e,[["render",be]]);export{Te as default};
