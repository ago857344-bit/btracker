import{a as i}from"./1A4Gz5Yb.js";async function l(a,t,r=""){const n=`
You are an elite JEE Mentor AI. The student has requested an "AI Smart Triage" of their To-Do list based on game theory and their current Elo ratings.
${r}
Current Elo Ratings (Baseline is 1200, >1600 is strong, <1000 is weak):
Physics: ${t.P||1200}
Chemistry: ${t.C||1200}
Maths: ${t.M||1200}

Here are their pending tasks (ID and Title):
${a.map(e=>`- [${e.id}] ${e.title}`).join(`
`)}

For each task, categorize it into exactly ONE of the following:
1. "High ROI": Task involves a weak subject/topic or tickmarked active chapter where they can gain a lot of marks quickly.
2. "Time Trap": Task involves a topic they are already very strong in (high Elo) but might be wasting time over-practicing.
3. "Core": Essential maintenance tasks or highly important fundamentals within their active grade level.
4. "Normal": Standard tasks that don't fit the extremes.

Respond ONLY with a valid JSON object mapping the Task ID to the category string. No markdown, no explanation.
Example:
{
  "task-123": "High ROI",
  "task-456": "Time Trap"
}
`;try{const o=(await i(n)).replace(/```json/g,"").replace(/```/g,"").trim();return JSON.parse(o)}catch(e){return console.error("AI Triage failed:",e),{}}}async function h(a,t,r=""){const n=`
Generate a single, one-sentence "micro-challenge" question for a JEE student about the chapter "${t}" in "${a}".
${r}
The question must test a core formula, property, or concept strictly aligned with their academic grade level. 
DO NOT include the answer. 
DO NOT use markdown formatting, just plain text or standard math notation.
Keep it under 15 words.
Example: What is the condition for resonance in an LCR circuit?
`;try{return(await i(n)).trim()}catch{return"Failed to load challenge."}}export{h as g,l as t};
