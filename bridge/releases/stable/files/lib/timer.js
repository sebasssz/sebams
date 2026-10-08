const duration=t=>(t.mode==='work'?t.workMinutes:t.breakMinutes)*60000;
export function remaining(timer,now=Date.now()){return timer.status==='running'?Math.max(0,timer.endsAt-now):timer.remainingMs;}
export function reconcileTimer(timer,now=Date.now()){const t={...timer};if(t.status==='running'&&remaining(t,now)===0){t.completedAt=t.endsAt;t.endsAt=null;t.status='complete';t.mode=t.mode==='work'?'break':'work';t.remainingMs=duration(t);}return t;}
export function startTimer(timer,now=Date.now()){const t=reconcileTimer(timer,now);if(t.status==='running')return t;t.remainingMs=t.status==='paused'?t.remainingMs:duration(t);t.endsAt=now+t.remainingMs;t.status='running';return t;}
export function pauseTimer(timer,now=Date.now()){const t=reconcileTimer(timer,now);if(t.status==='running'){t.remainingMs=remaining(t,now);t.endsAt=null;t.status='paused';}return t;}
export function resetTimer(timer){const t={...timer,status:'idle',endsAt:null,completedAt:null};t.remainingMs=duration(t);return t;}
export function advanceTimer(timer){return resetTimer({...timer,mode:timer.mode==='work'?'break':'work'});}
