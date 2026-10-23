import{a as l,b as p}from"./1A4Gz5Yb.js";import{S as m}from"./DmIfrDov.js";async function g(t){const a=(t.mistakes||[]).slice(-15).map(s=>`- [${m.find(r=>r.code===s.subject)?.name||s.subject}] ${s.errorType} Error: ${s.description} (Context: ${s.testName||"Practice"})`).join(`
`),o=t.gamification?.elo||{P:300,C:300,M:300},n=p(t),i=`
STUDENT DATA:
Elo Ratings: Physics (${Math.floor(o.P)}), Chemistry (${Math.floor(o.C)}), Math (${Math.floor(o.M)})
(Note: Base Elo is 300. Above 1200 is elite. Below 500 is weak.)
${n}
Recent Mistakes (Last 15):
${a||"No recent mistakes logged."}
`;return await l(i,`You are an elite, strict, highly analytical JEE Mentor AI. 
Analyze the student's Elo ratings and recent mistakes.
Format your output cleanly in markdown.
Do NOT use a generic intro. Dive straight in.

Structure your response exactly as follows:
### 🚨 Critical Weaknesses
(Identify 2 critical conceptual or behavioral weak points based on the mistakes and Elo. Be specific.)

### 🎯 Weekly Strategy
(Provide 1 highly actionable, concrete strategic adjustment they must implement this week to fix the weaknesses.)

### ⚡ Mentor's Note
(A 1-2 sentence tough-love, motivational closing based on their Elo performance.)`)}async function A(t,e,a,o="",n=[]){const i=`
STUDENT ELO: Physics (${Math.floor(a.P)}), Chemistry (${Math.floor(a.C)}), Math (${Math.floor(a.M)})
Lowest Elo = Weakest subject (needs more focus/earlier scheduling).
${o}
AVAILABLE DATES (Next ${e.length} days):
${e.join(", ")}

${n.length>0?`FIXED SCHEDULED CLASSES / TIMETABLE:
${JSON.stringify(n,null,2)}
`:""}

PENDING TASKS TO BALANCE:
${JSON.stringify(t,null,2)}
`,h=`You are an elite JEE study schedule optimizer. 
Assign a date to each task ID from the available dates list.

CRITICAL BALANCING RULES:
1. SAME-DAY / NEXT-DAY PRACTICE COUPLING RULE:
   If a chapter is being studied today (or has a scheduled class, theory reading, or lecture on date D), its corresponding practice questions, exercises (Ex 1, Ex 2, etc.), and problem solving MUST be scheduled on the SAME DAY (date D) or AT MOST the NEXT DAY (date D+1).
   NEVER schedule a chapter's practice questions more than 1 day after studying the chapter!
2. CHAPTER COHESION:
   Tasks belonging to the same chapter (e.g. Chapter Theory and Chapter Exercises) must be clustered tightly together: Theory on Day D, Questions on Day D or Day D+1.
3. SUBJECT BALANCE & ELO PRIORITIZATION:
   Distribute workload evenly across the available dates without overloading any single day.
   Prioritize weaker subjects (lowest Elo) earlier in the week.

OUTPUT STRICTLY A VALID JSON OBJECT mapping task IDs to date strings, e.g. {"task1": "${e[0]}", "task2": "${e[1]||e[0]}"}. 
Do not include Markdown fences like \`\`\`json. Return ONLY the raw JSON object.`,s=await l(i,h);try{const c=s.match(/\{[\s\S]*\}/);if(c)return JSON.parse(c[0]);const r=s.replace(/^```(?:json)?\n?/,"").replace(/\n?```$/,"").trim();return JSON.parse(r)}catch(c){console.warn("AI planner balance JSON parse failed, falling back to round-robin:",c);const r={};return t.forEach((u,d)=>{r[u.id]=e[d%e.length]}),r}}async function T(t,e,a,o=""){const n=`Chapter: ${t}
Subject: ${e}
Current Elo in Subject: ${Math.floor(a)}
${o}`,i=`You are a JEE expert tutor. The student needs a rapid 2-minute conceptual crash course on this chapter.
Their Elo is ${Math.floor(a)} (Base is 300, 1200+ is Elite, <500 is weak).
Adapt the explanation complexity to their Elo and academic grade level strictly.
Format cleanly in Markdown.
Structure exactly as follows:
### ⚡ The Core Idea
(1 paragraph summary)
### 🔑 Key Formulas & Concepts
(Bullet points)
### ⚠️ Common Traps
(1-2 classic mistakes students make)`;return await l(n,i)}export{A as a,T as b,g};
