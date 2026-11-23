(async()=>{
const client=window.forgeSupabase,params=new URLSearchParams(location.search),order=params.get("order"),token=params.get("token"),card=document.getElementById("track-card");
const steps=["pending","confirmed","preparing","ready","out_for_delivery","delivered"];
const labels=["ORDER RECEIVED","CONFIRMED","IN PREPARATION","READY","OUT FOR DELIVERY","DELIVERED"];
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
if(!client||!order||!token){card.innerHTML='<p class="track-error">Invalid tracking link. Use the private link provided after checkout.</p>';return;}
let refreshTimer=null;
async function load(){
const {data,error}=await client.rpc("get_order_tracking",{p_order_number:Number(order),p_tracking_token:token});
if(error){card.innerHTML='<p class="track-error">Order not found or tracking code invalid. Keep your private tracking link safe.</p>';return;}
const current=steps.indexOf(data.status),status=labels[Math.max(0,current)]||data.status.toUpperCase();
card.innerHTML='<div class="track-number">ORDER #'+data.order_number+'</div><div class="track-status">'+status+'</div><p class="track-estimate">'+(data.estimated_minutes?'Estimated time: '+data.estimated_minutes+' minutes':'We will update your estimated time soon.')+'</p><div class="track-steps">'+steps.map((s,i)=>'<div class="track-step '+(i<=current?'done':'')+'">'+labels[i]+'</div>').join('')+'</div><div class="track-items">'+data.items.map(i=>'<div>'+i.quantity+' × '+i.name+' — '+money(i.line_total_cents)+'</div>').join('')+'</div><div class="track-total"><span>TOTAL</span><span>'+money(data.total_cents)+'</span></div>';
if(data.status==="cancelled") card.insertAdjacentHTML("beforeend",'<p class="track-error">Please contact the restaurant about this order.</p>');
}
await load();
refreshTimer=window.setInterval(load,12000);
window.addEventListener("beforeunload",()=>{if(refreshTimer)window.clearInterval(refreshTimer);});
})();