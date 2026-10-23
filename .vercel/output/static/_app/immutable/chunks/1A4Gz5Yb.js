import{o as u}from"./DmIfrDov.js";function C(a){const e=a?.meta?.year,t=e==="11"?"11":e==="12"?"12":e==="dropper"?"dropper":"general",n=t==="11"?"Class 11 (Foundations & Core Mechanics)":t==="12"?"Class 12 (Board + JEE Advanced Integration)":t==="dropper"?"Dropper / Repeater (Targeting Top JEE Advanced Ranks)":"JEE Aspirant",s={P:[],C:[],M:[]},r=["P","C","M"];for(const o of r){const d=a?.chapterGrids?.[o],l=u(a,o);for(const c of l){const h=!!d?.started?.[c.no],p=!!d?.data?.[c.no]?.some(m=>m==="✓");(h||p)&&s[o].push(c.name)}}const i=[...s.P,...s.C,...s.M];return{gradeLevel:n,gradeYear:t,tickmarkedChapters:s,allTickmarkedChapters:i,hasAnyTickmarks:i.length>0}}function f(a){const e=C(a);let t=`
--- MANDATORY ACADEMIC & SYLLABUS RESTRICTIONS ---
1. STUDENT GRADE LEVEL: ${e.gradeLevel}.
   - Calibrate all explanations, question complexity, and mathematical notation strictly for this academic grade level.
`;return e.gradeYear==="11"?t+=`   - The student is in Class 11. Do NOT introduce or assume knowledge of Class 12 chapters (such as Electrostatics, Magnetism, Optics, Modern Physics, Calculus/Differential Equations, 3D Geometry, Electrochemistry) unless specifically studying that topic. Keep mathematics appropriate for Class 11.
`:e.gradeYear==="12"?t+=`   - The student is in Class 12. Synthesize Class 11 fundamentals with Class 12 calculus and electrodynamics as appropriate for JEE Main/Advanced.
`:e.gradeYear==="dropper"&&(t+=`   - The student is a Dropper/Repeater targeting JEE Advanced. You may employ full cross-topic synthesis, advanced mathematical rigor, and challenging multi-step edge cases.
`),e.hasAnyTickmarks?t+=`2. ACTIVE SYLLABUS RESTRICTION (CHECKLIST TICKMARKS):
   - The student has actively started and tickmarked ONLY the following chapters in their checklist:
     * Physics: ${e.tickmarkedChapters.P.length?e.tickmarkedChapters.P.join(", "):"None tickmarked yet"}
     * Chemistry: ${e.tickmarkedChapters.C.length?e.tickmarkedChapters.C.join(", "):"None tickmarked yet"}
     * Mathematics: ${e.tickmarkedChapters.M.length?e.tickmarkedChapters.M.join(", "):"None tickmarked yet"}
   - STRICT INSTRUCTION: You MUST restrict your questions, examples, thought experiments, counter-examples, and topic suggestions strictly to the concepts contained within these tickmarked chapters.
   - DO NOT test or reference unstarted/unticked chapters that the student has not yet studied!
`:t+=`2. SYLLABUS CONTEXT:
   - The student has not yet tickmarked specific chapters in their checklist. Keep all questions and explanations strictly aligned with the standard syllabus for ${e.gradeLevel}.
`,t+=`---------------------------------------------------
`,t}async function y(a,e,t=!1){return k([{role:"user",parts:[{text:a}]}],e,t)}async function k(a,e,t=!1,n=!1){const s=await fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({history:a,systemInstruction:e,jsonMode:t})}),r=await s.json();return s.ok?(n||await new Promise(i=>setTimeout(i,3e3)),r.text):r.error||"Failed to communicate with AI server."}export{y as a,f as b,k as c,C as g};
