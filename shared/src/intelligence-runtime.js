// @ts-nocheck
/** @param {unknown} input @returns {any} */
const TRADES = new Set(["carpentry", "electrical", "plumbing", "hvac", "mechanical", "construction", "multiple", "unsure"]);
const HAZARD_RULES = [
  { id:"live-electrical", pattern:/\b(live wire|live circuit|energized|energised|electric shock|electrocution|mains wiring|distribution board|breaker panel)\b/i, stopWork:true, instruction:"Do not touch exposed conductors or work on an energised circuit. Isolate power and have absence of voltage verified by a qualified electrician using appropriate equipment." },
  { id:"gas-leak", pattern:/\b(gas leak|smell of gas|leaking gas|lpg leak|propane leak|natural gas leak)\b/i, stopWork:true, instruction:"Stop work, avoid flames and electrical switching, leave the affected area, and contact the local gas emergency service or a qualified gas professional from a safe location." },
  { id:"pressure-system", pattern:/\b(pressurised|pressurized|pressure vessel|boiler|compressed air tank|hydraulic accumulator)\b/i, stopWork:true, instruction:"Do not loosen fittings or open the system while pressure may remain. Follow the equipment manufacturer's isolation and depressurisation procedure." },
  { id:"structural-load", pattern:/\b(load-bearing|load bearing|structural beam|foundation|support column|bearing wall|roof truss)\b/i, stopWork:false, instruction:"Do not cut, drill, remove or alter a potentially structural member without a competent structural assessment and applicable approvals." },
  { id:"working-at-height", pattern:/\b(roof work|working at height|scaffold|scaffolding|ladder above|fall arrest)\b/i, stopWork:true, instruction:"Do not proceed without a suitable inspected access system, fall protection and a task-specific safe-work plan." },
  { id:"rotating-machinery", pattern:/\b(unguarded machine|missing machine guard|operating without a guard|adjusting while running|clearing a jam while running|entanglement hazard)\b/i, stopWork:true, instruction:"Keep clear of moving parts. Isolate and lock out the machine before adjustment, clearing jams or maintenance; use the manufacturer's procedure." },
  { id:"hazardous-material", pattern:/\b(asbestos|silica dust|lead paint|chemical spill|unknown chemical|confined space)\b/i, stopWork:true, instruction:"Stop disturbance or entry. Identify the material or atmosphere through a competent assessment and follow local hazardous-material controls." },
  { id:"vehicle-safety", pattern:/\b(brake failure|brake line|airbag|steering failure|fuel leak|tyre blowout|tire blowout)\b/i, stopWork:true, instruction:"Do not operate or road-test the vehicle. Arrange inspection and repair by a qualified automotive technician." },
  { id:"battery-hazard", pattern:/\b(swollen lithium battery|punctured lithium battery|battery thermal runaway|battery fire)\b/i, stopWork:true, instruction:"Do not charge, puncture, compress or handle a damaged lithium battery. Move away from immediate danger and follow local emergency guidance." },
];
const TRADE_TERMS = {
  carpentry:/\b(cabinet|wood|timber|hinge|drawer|shelf|joinery|furniture|saw|door)\b/i,
  electrical:/\b(wire|circuit|voltage|current|socket|switch|breaker|electrical|conduit)\b/i,
  plumbing:/\b(pipe|tap|faucet|drain|valve|leak|toilet|water|pump|plumbing)\b/i,
  hvac:/\b(refrigerant|compressor|air conditioner|aircon|hvac|condenser|evaporator|thermostat)\b/i,
  mechanical:/\b(engine|bearing|gearbox|motor|pump|shaft|mechanical|machine)\b/i,
  construction:/\b(concrete|masonry|brick|roof|foundation|scaffold|construction|wall)\b/i,
  multiple:/[\s\S]/,
  unsure:/[\s\S]/,
};
const ELECTRICAL_HIGH_RISK=/\b(rewire|mains wiring|distribution board|breaker panel|replace breaker|install circuit|repair wiring|exposed conductor|live socket)\b/i;
const STOP_WORDS=new Set(["the","and","for","with","from","this","that","your","what","how","into","near","when","where","work","task","part","model","product"]);
const stringField=(value,min,max,trim=true)=>typeof value==="string"&&(trim?value.trim():value).length>=min&&(trim?value.trim():value).length<=max;

/** @param {unknown} input @returns {any} */
export function parseWorkRequest(input) {
  if (!input || typeof input!=="object" || Array.isArray(input)) throw new Error("invalid_work_request");
  const trade=input.trade;
  const task=typeof input.task==="string"?input.task.trim():"";
  if(!TRADES.has(trade)||task.length<3||task.length>4000) throw new Error("invalid_work_request");
  const jurisdiction=input.jurisdiction===undefined?undefined:typeof input.jurisdiction==="string"?input.jurisdiction.trim():null;
  if(jurisdiction===null||(jurisdiction!==undefined&&(jurisdiction.length<2||jurisdiction.length>120))) throw new Error("invalid_work_request");
  const involvesEquipment=input.involvesEquipment===undefined?false:input.involvesEquipment;
  if(typeof involvesEquipment!=="boolean") throw new Error("invalid_work_request");
  const optionalText=(key,max)=>{
    const value=input[key];
    if(value===undefined) return undefined;
    if(typeof value!=="string"||value.trim().length>max) throw new Error("invalid_work_request");
    return value.trim();
  };
  const equipmentMake=optionalText("equipmentMake",120);
  const equipmentModel=optionalText("equipmentModel",120);
  const knownFacts=input.knownFacts===undefined?[]:input.knownFacts;
  if(!Array.isArray(knownFacts)||knownFacts.length>30||knownFacts.some(v=>!stringField(v,1,500))) throw new Error("invalid_work_request");
  return {trade,task,...(jurisdiction?{jurisdiction}:{}),involvesEquipment,...(equipmentMake?{equipmentMake}:{}),...(equipmentModel?{equipmentModel}:{}),knownFacts:knownFacts.map(v=>v.trim())};
}

function parseEvidenceSources(input) {
  if(!Array.isArray(input)||input.length>100) throw new Error("invalid_evidence");
  return input.map((s)=>{
    if(!s||typeof s!=="object"||Array.isArray(s)) throw new Error("invalid_evidence");
    if(!stringField(s.id,1,120,false)||!stringField(s.publisher,1,200,false)||!stringField(s.title,1,300,false)||!TRADES.has(s.trade)||!stringField(s.topic,1,200,false)||!stringField(s.excerpt,1,4000,false)) throw new Error("invalid_evidence");
    if(s.url!==undefined){try{new URL(s.url)}catch{throw new Error("invalid_evidence")}}
    if(s.documentId!==undefined&&!stringField(s.documentId,0,200,false)) throw new Error("invalid_evidence");
    if(s.productModels!==undefined&&(!Array.isArray(s.productModels)||s.productModels.length>30||s.productModels.some(v=>!stringField(v,1,120,false)))) throw new Error("invalid_evidence");
    if(s.productMake!==undefined&&!stringField(s.productMake,1,120,false)) throw new Error("invalid_evidence");
    if(s.jurisdiction!==undefined&&!stringField(s.jurisdiction,2,120,false)) throw new Error("invalid_evidence");
    if(s.revisionDate!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(s.revisionDate)) throw new Error("invalid_evidence");
    if(typeof s.retrievedAt!=="string"||!Number.isFinite(Date.parse(s.retrievedAt))) throw new Error("invalid_evidence");
    if(s.pageOrSection!==undefined&&!stringField(s.pageOrSection,0,200,false)) throw new Error("invalid_evidence");
    if(s.reviewed!==undefined&&typeof s.reviewed!=="boolean") throw new Error("invalid_evidence");
    return {...s,productModels:s.productModels??[],reviewed:s.reviewed??false};
  });
}

function topicMatchesTask(topic,task) {
  const topicWords=topic.toLowerCase().match(/[a-z0-9]+/g)??[];
  const taskWords=new Set((task.toLowerCase().match(/[a-z0-9]+/g)??[]).filter(w=>!STOP_WORDS.has(w)));
  const meaningful=topicWords.filter(w=>w.length>2&&!STOP_WORDS.has(w));
  return meaningful.length>0&&meaningful.some(w=>taskWords.has(w));
}

/** @param {unknown} input @param {unknown[]} [evidenceInput] @returns {any} */
const requiresJurisdiction=(text,highRisk)=>highRisk||/\b(code|standard|regulation|permit|inspection|compliance|certification|building control)\b/i.test(text);
function addTradeContextQuestions(trade,text,missingInformation,questions){
 const add=(missing,question)=>{missingInformation.push(missing);questions.push(question);};
 if(trade==="carpentry"&&/\b(cut|fit|join|install|build|repair|replace|make|assemble|cabinet|drawer|shelf|door|furniture)\b/i.test(text)){
  if(!/\b(timber|wood|plywood|mdf|particleboard|hardwood|softwood|aluminium|aluminum|steel|plastic)\b/i.test(text))add("material or board type","What material or board type are you working with, such as solid timber, plywood or MDF?");
  if(!/\b\d+(?:[.,]\d+)?\s?(?:mm|cm|m|in|ft)\b/i.test(text))add("required dimensions and thickness","What are the required dimensions and material thickness?");
 }
 if(trade==="plumbing"&&/\b(pipe|tap|faucet|drain|valve|leak|toilet|pump|joint|fitting)\b/i.test(text)){
  if(!/\b(water supply|drainage|sewage|gas line|potable|irrigation)\b/i.test(text))add("plumbing system type","Is this a water-supply, drainage or gas system?");
  if(/\b(pipe|joint|fitting)\b/i.test(text)&&!/\b(pvc|cpvc|pex|copper|galvanized|galvanised|polypropylene|hdpe|steel pipe)\b/i.test(text))add("pipe material and size","What pipe material and nominal size are involved?");
  if(/\b(leak|burst|dripping)\b/i.test(text)&&!/\b(isolated|shut off|shutoff|closed the valve)\b/i.test(text))add("safe isolation status","Has the affected supply been isolated safely?");
 }
 if(trade==="hvac"&&/\b(air conditioner|aircon|hvac|compressor|condenser|evaporator|thermostat|refrigerant)\b/i.test(text)){
  if(!/\b(split|window unit|central|ducted|portable|chiller|heat pump)\b/i.test(text))add("HVAC unit type","What type of unit is this, such as split, window, central, portable or a heat pump?");
  if(!/\b(not cooling|not heating|noise|odor|smell|water leak|fault code|error code|not starting|tripping)\b/i.test(text))add("observed symptom","What symptom or fault code are you seeing?");
 }
 if(trade==="mechanical"&&/\b(engine|bearing|gearbox|motor|pump|shaft|machine|equipment)\b/i.test(text)){
  if(/\b(repair|maintain|service|adjust|inspect|troubleshoot|diagnos)\w*\b/i.test(text)&&!/\b(isolated|locked out|lockout|disconnected)\b/i.test(text))add("energy isolation status","Which energy sources have been isolated before inspection or maintenance?");
  if(/\b(repair|troubleshoot|diagnos)\w*\b/i.test(text)&&!/\b(noise|vibration|overheat|leak|not starting|stalled|fault|error)\b/i.test(text))add("observed machine symptom","What symptom are you observing, and under what operating condition?");
 }
 if(trade==="construction"&&/\b(concrete|masonry|brick|roof|foundation|scaffold|wall|beam|column|floor)\b/i.test(text)){
  if(!/\b(concrete|masonry|brick|timber|wood|steel|blockwork|drywall|plasterboard)\b/i.test(text))add("construction material","What material is the component made from?");
  if(!/\b\d+(?:[.,]\d+)?\s?(?:mm|cm|m|in|ft)\b/i.test(text))add("component dimensions","What are the component dimensions and thickness?");
  if(/\b(wall|beam|column|foundation|roof truss)\b/i.test(text))add("structural role","Has a competent person confirmed whether this component is structural or load-bearing?");
 }
 if(trade==="electrical"&&ELECTRICAL_HIGH_RISK.test(text))add("qualified electrical isolation","Has a qualified electrician isolated the supply and verified absence of voltage?");
 if(trade==="unsure")add("trade confirmation","Which trade best describes this task: carpentry, electrical, plumbing, HVAC, mechanical or construction?");
}

export function assessWorkRequest(input,evidenceInput=[]) {
  const request=parseWorkRequest(input);
  const evidence=parseEvidenceSources(evidenceInput);
  const text=[request.task,...request.knownFacts].join("\n");
  const matched=HAZARD_RULES.filter(rule=>rule.pattern.test(text));
  const detectedHazards=matched.map(rule=>rule.id);
  const highRisk=matched.length>0||(request.trade==="electrical"&&ELECTRICAL_HIGH_RISK.test(text));
  const stopWork=matched.some(rule=>rule.stopWork);
  const missingInformation=[];
  const questions=[];
  const limitations=[
    "This assessment is a deterministic triage layer, not a substitute for a qualified professional or a site-specific risk assessment.",
    "No technical specification is asserted unless supported by a reviewed, applicable source.",
  ];
  if(request.involvesEquipment&&!request.equipmentMake) missingInformation.push("equipment make");
  if(request.involvesEquipment&&!request.equipmentModel) missingInformation.push("equipment model");
  const jurisdictionRequired=requiresJurisdiction(text,highRisk);
  if(jurisdictionRequired&&!request.jurisdiction) missingInformation.push("work jurisdiction");
  if(!TRADE_TERMS[request.trade].test(text)&&request.trade!=="multiple"&&request.trade!=="unsure") missingInformation.push("confirmation that the selected trade matches the task");
  if(jurisdictionRequired&&!request.jurisdiction) questions.push("Which country or jurisdiction is this work taking place in? Local codes and emergency procedures may differ.");
  addTradeContextQuestions(request.trade,text,missingInformation,questions);
  if(request.involvesEquipment&&(!request.equipmentMake||!request.equipmentModel)) questions.push("What is the equipment make and exact model?");
  if(matched.length>0) questions.push("Has the hazard been isolated and the area made safe by a competent person?");
  const applicableEvidence=evidence.filter(source=>
    source.trade===request.trade&&source.reviewed&&topicMatchesTask(source.topic,text)&&
    (!source.jurisdiction||(!!request.jurisdiction&&source.jurisdiction.trim().toLowerCase()===request.jurisdiction.trim().toLowerCase()))&&
    (!source.productMake||(request.involvesEquipment&&!!request.equipmentMake&&source.productMake.trim().toLowerCase()===request.equipmentMake.trim().toLowerCase()))&&
    (source.productModels.length===0||(request.involvesEquipment&&!!request.equipmentModel&&source.productModels.some(model=>model.toLowerCase()===request.equipmentModel.toLowerCase())))
  );
  const permittedGuidance=matched.map(rule=>rule.instruction);
  const decision=highRisk?"escalate":applicableEvidence.length>0&&missingInformation.length===0?"guided":"clarify";
  if(applicableEvidence.length===0) limitations.push("No reviewed source with confirmed trade and model applicability was supplied; product-specific steps and specifications are withheld.");
  return {
    decision,trade:request.trade,safetyLevel:highRisk?"high-risk":matched.length>0?"caution":"routine",
    compatibilityStatus:"undetermined",detectedHazards,stopWork,escalationRequired:highRisk,
    missingInformation:[...new Set(missingInformation)],questions,permittedGuidance,
    evidenceSources:applicableEvidence,limitations,
  };
}
