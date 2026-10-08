const ready = window.SUPABASE_URL && !window.SUPABASE_URL.includes("PASTE_") && window.SUPABASE_ANON_KEY && !window.SUPABASE_ANON_KEY.includes("PASTE_");
const $=id=>document.getElementById(id);
let sb=null, user=null, type="income", rows=[];

if(ready) sb=supabase.createClient(window.SUPABASE_URL,window.SUPABASE_ANON_KEY);

function eur(n){return new Intl.NumberFormat("de-DE",{style:"currency",currency:"EUR"}).format(Number(n)||0)}
function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function monthStart(){const d=new Date();return new Date(d.getFullYear(),d.getMonth(),1).toISOString().slice(0,10)}
function render(){
  const inc=rows.filter(x=>x.type==="income").reduce((a,x)=>a+Number(x.amount),0);
  const exp=rows.filter(x=>x.type==="expense").reduce((a,x)=>a+Number(x.amount),0);
  $("income").textContent=eur(inc); $("expense").textContent=eur(exp); $("balance").textContent=eur(inc-exp);
  $("monthLabel").textContent=new Date().toLocaleDateString("ru-RU",{month:"long",year:"numeric"});
  const days=new Date().getDate(), daily=inc/days, daysInMonth=new Date(new Date().getFullYear(),new Date().getMonth()+1,0).getDate();
  $("forecast").textContent=eur(daily*daysInMonth);
  const map={}; rows.forEach(x=>map[x.category]=(map[x.category]||0)+(x.type==="income"?Number(x.amount):-Number(x.amount)));
  const entries=Object.entries(map).sort((a,b)=>Math.abs(b[1])-Math.abs(a[1]));
  $("branchCount").textContent=entries.length+" веток";
  $("branches").innerHTML=entries.length?entries.map(([k,v])=>`<div class="branch"><div class="branch-top"><span class="branch-name">${esc(k)}</span><span class="${v>=0?"income-t":"expense-t"}">${v>=0?"+":""}${eur(v)}</span></div><div class="bar"><i style="width:${Math.min(100,Math.max(8,Math.abs(v)/(Math.max(...entries.map(e=>Math.abs(e[1])),1))*100))}%"></i></div></div>`).join(""):`<div class="muted">Пока пусто. Нажми ＋ и добавь первую запись.</div>`;
  $("transactions").innerHTML=rows.length?rows.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.created_at.localeCompare(a.created_at)).slice(0,12).map(x=>`<div class="transaction"><div class="tx-left"><div class="tx-icon">${x.type==="income"?"↗":"↘"}</div><div><div class="tx-name">${esc(x.category)}${x.note?" · "+esc(x.note):""}</div><div class="tx-date">${new Date(x.date+"T12:00").toLocaleDateString("ru-RU")}</div></div></div><b class="${x.type==="income"?"income-t":"expense-t"}">${x.type==="income"?"+":"−"}${eur(x.amount)}</b></div>`).join(""):`<div class="muted">Записей пока нет.</div>`;
  const sign=inc-exp;
  $("insight").textContent=rows.length<3?"Добавь ещё несколько записей, и прогноз станет полезнее.":`В этом месяце доход ${eur(inc)}, расходы ${eur(exp)}. При таком среднем темпе за месяц получится примерно ${eur(daily*daysInMonth)} дохода. ${sign>=0?"Сейчас ты в плюсе.":"Сейчас расходы выше доходов."}`;
}
async function load(){
  if(!sb)return;
  const {data,error}=await sb.from("transactions").select("*").eq("user_id",user.id).order("date",{ascending:false});
  if(error){console.error(error);return} rows=data||[]; render();
}
async function auth(){
  if(!sb){$("authMsg").textContent="Нужно один раз подключить бесплатный Supabase в config.js.";return}
  const email=$("email").value.trim(), password=$("password").value;
  if(!email||password.length<6){$("authMsg").textContent="Введи email и пароль минимум из 6 символов.";return}
  const {data,error}=await sb.auth.signInWithPassword({email,password});
  if(error)$("authMsg").textContent=error.message; else user=data.user;
}
async function signup(){
  if(!sb){$("authMsg").textContent="Нужно подключить Supabase в config.js.";return}
  const email=$("email").value.trim(), password=$("password").value;
  const {error}=await sb.auth.signUp({email,password});
  $("authMsg").textContent=error?error.message:"Аккаунт создан. Если включено подтверждение email — проверь почту.";
}
$("loginBtn").onclick=auth;$("signupBtn").onclick=signup;
$("logoutBtn").onclick=async()=>{await sb?.auth.signOut(); location.reload()};
$("addBtn").onclick=()=>{$("modal").classList.remove("hidden");$("date").value=new Date().toISOString().slice(0,10)};
$("closeModal").onclick=()=>$("modal").classList.add("hidden");
document.querySelectorAll(".seg button").forEach(b=>b.onclick=()=>{type=b.dataset.type;document.querySelectorAll(".seg button").forEach(x=>x.classList.remove("active"));b.classList.add("active")});
$("saveBtn").onclick=async()=>{
  const amount=Number($("amount").value.replace(",","."));
  if(!amount||amount<=0){$("saveMsg").textContent="Введи нормальную сумму.";return}
  if(!sb||!user){$("saveMsg").textContent="Нет подключения.";return}
  const {error}=await sb.from("transactions").insert({user_id:user.id,type,amount,category:$("category").value,note:$("note").value.trim(),date:$("date").value});
  if(error)$("saveMsg").textContent=error.message;else{$("modal").classList.add("hidden");$("amount").value="";$("note").value="";$("saveMsg").textContent="";await load()}
};
(async()=>{
  if(!sb){$("auth").classList.remove("hidden");return}
  const {data}=await sb.auth.getSession(); user=data.session?.user||null;
  if(user){$("auth").classList.add("hidden");$("app").classList.remove("hidden");await load()}
  sb.auth.onAuthStateChange((_e,s)=>{if(s&&!user){user=s.user;$("auth").classList.add("hidden");$("app").classList.remove("hidden");load()}});
})();
