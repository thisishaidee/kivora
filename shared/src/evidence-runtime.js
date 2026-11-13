// @ts-nocheck
const TRADES=new Set(["carpentry","electrical","plumbing","hvac","mechanical","construction","multiple","unsure"]);
const TYPES=new Set(["manufacturer_manual","technical_bulletin","service_notice","standard","field_observation","other"]);
const LANGUAGES=new Set(["en","en-ng","pcm-ng","fr","und"]);
const text=(v,min,max)=>typeof v==="string"&&v.trim().length>=min&&v.trim().length<=max;
const validDate=(value)=>typeof value==="string"&&/^\\d{4}-\\d{2}-\\d{2}$/.test(value)&&new Date(value+"T00:00:00.000Z").toISOString().slice(0,10)===value;
/** @param {unknown} input @returns {any} */
export function parsePrivateEvidenceCapture(input) {
  if(!input||typeof input!=="object"||Array.isArray(input)) return {success:false};
  const allowed=new Set(["trade","sourceType","publisher","title","sourceUrl","documentRef","sourceVersion","revisionDate","jurisdiction","language","productMake","productModel","topic","pageOrSection","evidenceNote","sourceSha256"]);
  if(Object.keys(input).some(k=>!allowed.has(k))) return {success:false};
  if(!TRADES.has(input.trade)||!TYPES.has(input.sourceType)||!text(input.publisher,1,200)||!text(input.title,1,300)||!text(input.topic,1,200)||!text(input.evidenceNote,1,2000)) return {success:false};
  const optional=(key,max)=>input[key]===undefined||text(input[key],0,max);
  if(!optional("documentRef",200)||!optional("sourceVersion",120)||!optional("jurisdiction",120)||!optional("productMake",120)||!optional("productModel",120)||!optional("pageOrSection",120)) return {success:false};
  if(input.revisionDate!==undefined&&!validDate(input.revisionDate)) return {success:false};
  if(input.sourceUrl!==undefined){try{const u=new URL(input.sourceUrl);if(u.protocol!=="https:")return {success:false}}catch{return {success:false}}}
  const language=input.language??"und";
  if(!LANGUAGES.has(language)) return {success:false};
  if(input.sourceSha256!==undefined&&!/^[0-9a-f]{64}$/i.test(input.sourceSha256)) return {success:false};
  const data={trade:input.trade,sourceType:input.sourceType,publisher:input.publisher.trim(),title:input.title.trim(),topic:input.topic.trim(),evidenceNote:input.evidenceNote.trim(),language};
  for(const key of ["sourceUrl","documentRef","sourceVersion","revisionDate","jurisdiction","productMake","productModel","pageOrSection"]) if(input[key]!==undefined&&input[key]!==""){const value=typeof input[key]==="string"?input[key].trim():input[key];if(value!=="")data[key]=value;}
  if(input.sourceSha256!==undefined)data.sourceSha256=input.sourceSha256.toLowerCase();
  return {success:true,data};
}
