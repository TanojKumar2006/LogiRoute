// ---------- v3: real generated dataset (seed 20261022) replaces the demo data ----------
const D=DATA,M=D.meta,RESOLVED=new Set(),SIDX={};
const hv=(a,b)=>{const p=Math.PI/180,x=Math.sin((b[0]-a[0])*p/2)**2+Math.cos(a[0]*p)*Math.cos(b[0]*p)*Math.sin((b[1]-a[1])*p/2)**2;return 12742*Math.asin(Math.sqrt(x))};
const dayOf=a=>Math.floor(a/1440),fmtT=m=>String(Math.floor(m/60)%24).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
const absDate=a=>new Date(Date.UTC(2026,9,1)+a*6e4-330*6e4);
const fmtClock=a=>absDate(a).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})+' IST';
const sp=i=>{const t=D.sites[D.deliveries[i][2]];return[t[2],t[3]]};
SH.length=0;VEH.length=0;DRVS.length=0;PART.length=0;EXC.length=0;EV.length=0;AUD.length=0;
D.partners.forEach(p=>PART.push({name:p[0],contact:p[1],phone:p[2],email:p[3],addr:p[4]}));
D.vehicles.forEach(v=>VEH.push({id:v[0],type:v[1],cap:v[2],vol:v[3],status:v[4],driver:v[5]>=0?D.drivers[v[5]][0]:'—',dname:v[5]>=0?D.drivers[v[5]][1]:'Unassigned',shift:'08:00–16:00 or 10:00–18:00',color:'#fff'}));
D.drivers.forEach(d=>DRVS.push({id:d[0],name:d[1],phone:d[2],email:d[3],addr:d[4],lic:d[5],veh:(VEH.find(v=>v.driver==d[0])||{id:'—'}).id}));
const ATT=D.deliveries.map(()=>[]);
D.routes.forEach((r,ri)=>r[8].forEach((s,k)=>ATT[s[0]].push({ri,k})));
ATT.forEach(a=>a.sort((x,y)=>D.routes[x.ri][4]-D.routes[y.ri][4]));
D.deliveries.forEach((d,i)=>{const st=D.sites[d[2]];SIDX[d[0]]=i;SH.push({i,id:d[0],ord:d[1],cat:d[6],carrier:D.partners[d[7]][0],dest:st[4],dist:Math.round(hv(M.depot,[st[2],st[3]])*1.35),w:d[3],val:Math.round(d[4]),st:'Pending',veh:null,eta:new Date(),prog:0,prio:d[5],win:fmtT(d[8])+'–'+fmtT(d[9]),reason:'',rec:{name:st[5],phone:st[6],email:st[7],addr:st[1]},site:d[2],cur:null})});
S.now=M.demo_day*1440+M.demo_min;S.auto=false;S.auto2=false;S.ef='Open';
function recompute(){const now=S.now;SH.forEach(s=>{if(s.manual)return;const a=ATT[s.i],d=D.deliveries[s.i];let cur=null;for(const x of a)if(D.routes[x.ri][4]<=now)cur=x;let st;
 if(!cur){if(a.length){cur=a[0];const r=D.routes[cur.ri];st=dayOf(r[4])<=dayOf(now)?'Assigned':'Planned'}else{s.st=d[10]>=0&&d[10]<=dayOf(now)?'Unserved':'Pending';s.veh=null;s.cur=null;s.reason=d[11];s.eta=absDate(Math.max(d[10],0)*1440+d[9]);s.prog=0;return}}
 else{const x=D.routes[cur.ri][8][cur.k];st=x[4]<=now?(x[5]?'Failed':'Delivered'):'In Transit'}
 const r=D.routes[cur.ri],x=r[8][cur.k];if(!s.cur||s.cur.ri!==cur.ri)s.veh=Object.assign({},VEH[r[2]],{driver:D.drivers[r[3]][0]});
 s.cur=cur;s.st=st;s.eta=absDate(st=='Delivered'||st=='Failed'?x[3]:x[1]);s.reason=st=='Failed'?x[6]:'';s.prog=st=='Delivered'||st=='Failed'?1:r[8].filter(y=>y[4]<=now).length/r[8].length})}
function rebuildExc(){EXC.length=0;D.exceptions.forEach(e=>{if(e[7]>dayOf(S.now))return;EXC.push({id:e[0],type:e[2]=='UNSERVED_DELIVERY'?'Unserved delivery':'Failed delivery',sev:e[3],ent:D.deliveries[e[1]][0],txt:e[4],act:e[5],res:RESOLVED.has(e[0])?'Resolved':e[6]=='OPEN'?'Open':'Rescheduled'})})}
recompute();rebuildExc();
S.sel=(SH.find(s=>s.st=='In Transit')||SH[0]).id;
AUD.push({t:new Date(),a:'system',x:`Dataset loaded: ${M.counts.deliveries} deliveries, ${M.counts.routes} routes (seed ${M.seed}, synthetic)`,e:'dataset'});
const drvOf=s=>s.veh?(DRVS.find(d=>d.id==s.veh.driver)||{name:'Unassigned',phone:'',email:'',addr:''}):null;
function evFor(s){const o=[],a=ATT[s.i];o.push('Created (synthetic order '+s.ord+')');a.forEach((x,n)=>{const r=D.routes[x.ri],y=r[8][x.k];o.push(`Attempt ${n+1}: planned on ${r[0]}, ETA ${fmtDT(y[1])}`);if(y[4]<=S.now)o.push(`Attempt ${n+1}: ${y[5]?'FAILED ('+y[6]+')':'DELIVERED'} at ${fmtDT(y[4])} (simulated)`)});const d=D.deliveries[s.i];if(!a.length&&d[10]>=0)o.push('Unserved: '+d[11]);return o.map(t=>({t})).concat(EV.filter(e=>e.id==s.id))}
const fmtDT=a=>absDate(a).toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
function truckPos(ri,now){const r=D.routes[ri],dp=M.depot,st=r[8];let t=r[4],p=dp;const segs=[];
 st.forEach((s,k)=>{const q=sp(s[0]);segs.push({a:t,b:s[3],p,q,k,ty:'leg'});segs.push({a:s[3],b:s[4],p:q,q,k,ty:'stop'});t=s[4];p=q});
 segs.push({a:t,b:t+Math.max(r[5]-st[st.length-1][2],1),p,q:dp,k:st.length,ty:'back'});
 if(now<r[4])return{pos:dp,state:'Waiting at depot',k:-1,head:1,kmh:0};
 for(const g of segs){const last=g===segs[segs.length-1];if(now<g.b||last){const f=g.b>g.a?Math.min(1,Math.max(0,(now-g.a)/(g.b-g.a))):1;
  return{pos:[g.p[0]+(g.q[0]-g.p[0])*f,g.p[1]+(g.q[1]-g.p[1])*f],k:g.k,head:g.q[1]>=g.p[1]?1:-1,kmh:g.ty=='stop'||now>=g.b?0:Math.round(hv(g.p,g.q)*1.35/((g.b-g.a)/60)),
  state:last&&now>=g.b?'Back at depot':g.ty=='leg'?`Driving to stop ${g.k+1} of ${st.length}`:g.ty=='stop'?`At stop ${g.k+1} of ${st.length}`:'Returning to depot'}}}}
const P=(la,lo)=>[20+(lo-78.25)/.45*360,280-(la-17.2)/.4*260];
function routeMap(s){const dp=P(M.depot[0],M.depot[1]);let o='<svg viewBox="0 0 400 300" role="img" aria-label="Route map with synthetic coordinates">';
 for(let i=0;i<=5;i++){const x=20+i*72,y=20+i*52;o+=`<path d="M${x} 20V280M20 ${y}H380" stroke="var(--bd)" stroke-width=".6"/>`}
 D.sites.forEach(t=>{const p=P(t[2],t[3]);o+=`<circle cx="${p[0].toFixed(1)}" cy="${p[1].toFixed(1)}" r="1.2" fill="var(--mu)" opacity=".5"/>`});
 if(s.cur){const r=D.routes[s.cur.ri];let path=`M${dp[0]} ${dp[1]}`;r[8].forEach(x=>{const q=P(...sp(x[0]));path+=`L${q[0].toFixed(1)} ${q[1].toFixed(1)}`});path+=`L${dp[0]} ${dp[1]}`;
  o+=`<path d="${path}" fill="none" stroke="var(--ac)" stroke-width="2" stroke-linejoin="round"/>`;
  r[8].forEach((x,k)=>{const q=P(...sp(x[0])),done=x[4]<=S.now,me=x[0]==s.i;o+=`<circle cx="${q[0]}" cy="${q[1]}" r="${me?8:6}" fill="${done?(x[5]?'#dc2626':'#16a34a'):'var(--sf)'}" stroke="${me?'#f59e0b':'var(--ac)'}" stroke-width="${me?3:1.5}"/><text x="${q[0]}" y="${q[1]+3}" text-anchor="middle" font-size="8" font-weight="700" fill="${done?'#fff':'var(--tx)'}">${k+1}</text>`});
  const tp=truckPos(s.cur.ri,S.now),q=P(tp.pos[0],tp.pos[1]);o+=`<g transform="translate(${q[0]},${q[1]-9}) scale(${tp.head*.17},.17) translate(-120,-40)">${TRK}</g>`}
 return o+`<rect x="${dp[0]-6}" y="${dp[1]-6}" width="12" height="12" fill="#16a34a" stroke="#fff"/><text x="${dp[0]+9}" y="${dp[1]+4}" font-size="9" font-weight="700" fill="var(--tx)">Depot</text></svg>`}
function mapSvg(list,selId){if(selId)return routeMap(SH[SIDX[selId]]);const dp=P(M.depot[0],M.depot[1]);let o='<svg viewBox="0 0 400 300" role="img" aria-label="Planned stops (synthetic)">';
 list.forEach(s=>{const t=D.sites[s.site],p=P(t[2],t[3]);o+=`<path d="M${dp[0]} ${dp[1]}L${p[0]} ${p[1]}" stroke="var(--bd)"/><circle cx="${p[0]}" cy="${p[1]}" r="3" fill="var(--ac)"/>`});return o+`<rect x="${dp[0]-6}" y="${dp[1]-6}" width="12" height="12" fill="#16a34a"/></svg>`}
function detail(s){const d=drvOf(s);return `<div class="det"><div><small>Driver</small>${d?esc(d.name)+'<br>'+tel(d.phone):'—'}</div><div><small>Deliver to</small>${esc(s.rec.name)}<br>${esc(s.dest)}</div><div><small>Weight</small>${s.w} kg</div><div><small>Window</small>${s.win}</div></div>`}
const clockBar=()=>`<div class="row"><span class="pill">Simulation clock: ${fmtClock(S.now)}</span><span class="note">Synthetic dataset: ${M.counts.deliveries} deliveries, 1–30 Oct 2026, seed ${M.seed}. Tracking is simulated.</span></div>`;
function dash(){const on=SH.filter(x=>x.st=='In Transit').concat(SH.filter(x=>x.st=='Assigned')).slice(0,8),s=sel();
 return clockBar()+kpis()+`<div class="card pad" style="margin-bottom:12px"><h2>Ongoing deliveries</h2><div class="two"><div style="max-height:480px;overflow:auto">${on.map(shipCard).join('')||'<p>No ongoing deliveries at this simulated time.</p>'}</div><div><div class="mapbox">${routeMap(s)}${detail(s)}</div><p class="note">Selected ${s.id} · ${s.st}. Green = delivered, red = failed, white = upcoming.</p></div></div></div><div class="card pad"><h2>Track orders</h2>${table(filtered())}</div>`}
function adv(m){S.now=Math.min(S.now+m,29*1440+1439);recompute();rebuildExc();R()}
function resetClock(){S.now=M.demo_day*1440+M.demo_min;SH.forEach(s=>{delete s.manual});recompute();rebuildExc();R()}
function live(){const s=sel(),cur=s.cur,r=cur?D.routes[cur.ri]:null,x=r?r[8][cur.k]:null,tp=cur?truckPos(cur.ri,S.now):null,drv=drvOf(s),pt=PART.find(p=>p.name==s.carrier);
 const opts=SH.filter(y=>y.st=='In Transit').slice(0,80);if(!opts.includes(s))opts.unshift(s);
 const left=x&&x[4]>S.now&&tp?Math.round(hv(tp.pos,sp(s.i))*1.35):0,fin=x&&x[4]<=S.now;
 const track=x?`<div class="kpis" style="margin:8px 0"><div class="card kpi"><span>Speed</span><b>${tp.kmh} km/h</b></div><div class="card kpi"><span>To destination</span><b>${left} km</b></div><div class="card kpi"><span>State</span><b style="font-size:12px">${tp.state}</b></div><div class="card kpi"><span>GPS</span><b style="font-size:12px">${tp.pos[0].toFixed(4)}, ${tp.pos[1].toFixed(4)}</b></div></div>
 <div class="tw"><table style="min-width:0"><tbody><tr><td>Delivery window</td><td>${s.win} IST</td></tr><tr><td>Planned ETA</td><td>${fmtDT(x[1])}</td></tr><tr><td>Planned departure</td><td>${fmtDT(x[2])}</td></tr><tr><td>Simulated arrival</td><td>${x[3]<=S.now?fmtDT(x[3]):'—'}</td></tr><tr><td>Actual departure</td><td>${fin?fmtDT(x[4]):'—'}</td></tr><tr><td>Recorded outcome</td><td>${fin?(x[5]?'Failed — '+x[6]:'Delivered'):'Not yet'}</td></tr></tbody></table></div>`:`<p>No route: ${esc(s.reason||'not yet planned')}. See Exceptions or re-plan in the Route Planner.</p>`;
 return `<div class="card pad"><h2>Live tracking <span class="tag">Simulated from dataset</span></h2><div class="row"><select aria-label="Shipment" onchange="S.sel=this.value;R()">${opts.map(y=>`<option value="${y.id}" ${y.id==S.sel?'selected':''}>${y.id} · ${y.st}</option>`).join('')}</select><span class="pill">${fmtClock(S.now)}</span><label><input type="checkbox" ${S.auto2?'checked':''} onchange="S.auto2=this.checked"> Run clock</label><button class="btn" onclick="adv(10)">+10 min</button><button class="btn" onclick="adv(60)">+1 hour</button><button class="btn" onclick="resetClock()">Reset</button></div>
 <div class="two"><div><div class="mapbox">${routeMap(s)}</div><div class="card pad" style="margin-top:8px">${truck('',240)}<div class="row">${badge(s.st)}<b>${s.id}</b><span class="tag">${s.veh?s.veh.id:'No truck'}</span><span class="tag">${r?r[0]:'No route'}</span></div>${track}</div></div>
 <div>${r?`<div class="card pad" style="margin-bottom:8px"><h3>Route stops (${r[8].length}) · ${r[6]} km · ${Math.round(r[7])} kg</h3>${r[8].map((y,k)=>`<div class="note">${k+1}. ${D.deliveries[y[0]][0]} ${y[4]<=S.now?(y[5]?'✗ failed':'✓ delivered'):'· ETA '+fmtT(y[1]%1440)}${y[0]==s.i?' ← selected':''}</div>`).join('')}</div>`:''}
 ${person('Driver',drv?drv.name:'Not assigned',drv?.phone,drv?.email,drv?drv.addr:'—')}${person('Delivery partner',pt.name+' ('+pt.contact+')',pt.phone,pt.email,pt.addr)}${person('Shipping to',s.rec.name,s.rec.phone,s.rec.email,s.rec.addr)}</div></div></div>`}
setInterval(()=>{if(!S.user||S.page!='live'||!S.auto2||['SELECT','INPUT'].includes(document.activeElement?.tagName))return;S.now=Math.min(S.now+3,29*1440+1439);recompute();rebuildExc();R()},2000);
function resolveE(id){const e=EXC.find(x=>x.id==id);e.res='Resolved';RESOLVED.add(id);log('Exception resolved',id);R()}
function exc(){const f=S.ef,l=EXC.filter(e=>f=='All'||e.res==f);return `<div class="card pad"><h2>Exceptions (${l.length})</h2><div class="row"><select aria-label="Status" onchange="S.ef=this.value;R()">${['Open','Rescheduled','Resolved','All'].map(x=>`<option ${x==f?'selected':''}>${x}</option>`).join('')}</select><span class="note">Showing the first 40. Operational exceptions come from the dataset rules (failed or unserved deliveries).</span></div>
 ${l.slice(0,40).map(e=>`<div class="ship" style="cursor:default"><div style="flex:1"><b>${e.type}</b> <span class="tag">${e.sev}</span> <span class="tag">${e.res}</span><div class="note">${e.ent}: ${esc(e.txt)}<br>Recommended: ${esc(e.act)}</div></div>${e.res=='Open'&&can('resolve')?`<button class="btn" onclick="resolveE('${e.id}')">Resolve</button>`:''}</div>`).join('')||'<p>No exceptions match.</p>'}</div>`}
function cust(){return gen(`Customer sites (${D.sites.length}; first 100 shown)`,['Site','Area','Lat','Lon','Contact','Phone','Max vehicle'],D.sites.slice(0,100).map(t=>[esc(t[0]),t[4],t[2],t[3],esc(t[5]),tel(t[6]),t[8]]))}
function orders(){return gen(`Orders & deliveries (${SH.length}; first 150 shown)`,['Order','Delivery','Category','Weight','Value','Status'],SH.slice(0,150).map(s=>[s.ord,s.id,s.cat,s.w+' kg','₹'+s.val.toLocaleString('en-IN'),s.st]))}
function evalPage(){const e=M.evaluation,o=e.overall,pc=x=>(x*100).toFixed(1)+'%';
 return `<div class="card pad"><h2>Dataset & evaluation</h2><div class="kpis"><div class="card kpi"><span>Precision</span><b>${pc(o.precision)}</b></div><div class="card kpi"><span>Recall</span><b>${pc(o.recall)}</b></div><div class="card kpi"><span>F1</span><b>${pc(o.f1)}</b></div><div class="card kpi"><span>Injected anomalies</span><b>${o.injected}</b></div></div>
 <p class="note">The rules and the injected anomalies were written together, so this shows rule coverage on a labelled fixture, not independent accuracy. Valid baseline: ${M.validation.rule_issues} rule issues, ${M.validation.integrity} structural violations; SQL seed loads with foreign keys enforced: ${M.validation.sqlite_fk_ok?'yes':'no'}; regenerated with the same seed gives identical files: ${M.reproducible?'yes':'no'}.</p>
 <h3>Per anomaly type</h3>${gen('',['Type','Injected','TP','FP','FN','Precision','Recall','F1'],e.per_type.map(t=>[t.type,t.injected,t.true_positive,t.false_positive,t.false_negative,pc(t.precision),pc(t.recall),pc(t.f1)]))}
 <h3>Tables, row counts and checksums (sha256, first 12)</h3>${gen('',['Table','Rows','Checksum'],Object.keys(M.counts).map(k=>[k,M.counts[k],M.checksums[k]]))}</div>`}
Object.assign(NAV,{eval:['🧪','Data & Evaluation']});PERM.admin.push('eval');PERM.analyst.push('eval');PAGES.eval=evalPage;
