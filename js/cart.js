(async () => {
  "use strict";
  const panel=document.getElementById("cart-panel");
  if(!panel) return;
  const client=window.forgeSupabase;
  const countEl=document.getElementById("cart-count");
  const itemsEl=document.getElementById("cart-items");
  const subtotalEl=document.getElementById("cart-subtotal");
  const toast=document.getElementById("cart-toast");
  const storageKey="forge-cart-v1";
  let products={};
  let cart={};
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||"{}");
    if(saved && typeof saved==="object") cart=saved;
  } catch (_) { cart={}; }
  const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
  const quantity=()=>Object.values(cart).reduce((sum,qty)=>sum+(Number.isInteger(qty)&&qty>0?qty:0),0);
  const total=()=>Object.entries(cart).reduce((sum,[slug,qty])=>sum+(products[slug]?products[slug].price_cents*qty:0),0);
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(cart));}catch(_){}};
  const showToast=message=>{
    toast.textContent=message;toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer=window.setTimeout(()=>toast.classList.remove("is-visible"),2200);
  };
  const render=()=>{
    countEl.textContent=quantity();countEl.hidden=quantity()===0;
    subtotalEl.textContent=money(total());
    const entries=Object.entries(cart).filter(([slug,qty])=>products[slug]&&Number.isInteger(qty)&&qty>0);
    if(!entries.length){itemsEl.innerHTML='<p class="cart-empty">Your bag is waiting. Add a Forge creation to begin.</p>';return;}
    itemsEl.innerHTML=entries.map(([slug,qty])=>{
      const p=products[slug];
      return '<article class="cart-line"><div class="cart-line-copy"><strong>'+p.name+'</strong><span>'+money(p.price_cents)+' each</span></div><div class="cart-controls"><button type="button" data-quantity="-1" data-id="'+slug+'" aria-label="Remove one '+p.name+'">−</button><span>'+qty+'</span><button type="button" data-quantity="1" data-id="'+slug+'" aria-label="Add one '+p.name+'">+</button></div><strong class="cart-line-total">'+money(p.price_cents*qty)+'</strong></article>';
    }).join("");
  };
  const open=()=>{panel.classList.add("is-open");panel.setAttribute("aria-hidden","false");document.body.classList.add("cart-is-open");panel.querySelector(".cart-close").focus();};
  const close=()=>{panel.classList.remove("is-open");panel.setAttribute("aria-hidden","true");document.body.classList.remove("cart-is-open");document.querySelector(".cart-launcher").focus();};
  if(client){
    const {data,error}=await client.from("products").select("slug,name,price_cents,is_available");
    if(!error) for(const p of data||[]) products[p.slug]=p;
    else console.error("FORGE cart catalog:",error.message);
  }
  if(!Object.keys(products).length){
    products={
      original:{name:"THE ORIGINAL",price_cents:2990,is_available:true},
      "double-forge":{name:"DOUBLE FORGE",price_cents:3990,is_available:true},
      bacon:{name:"THE BACON",price_cents:3490,is_available:true},
      truffle:{name:"THE TRUFFLE",price_cents:4290,is_available:true}
    };
  }
  for(const slug of Object.keys(cart)) if(!products[slug]||!products[slug].is_available||!Number.isInteger(cart[slug])||cart[slug]<1) delete cart[slug];
  persist();render();
  document.addEventListener("click",event=>{
    const add=event.target.closest("[data-product]");
    if(add){
      const slug=add.dataset.product,p=products[slug];
      if(p&&p.is_available){cart[slug]=Math.min((cart[slug]||0)+1,30);persist();render();showToast(p.name+" ADDED TO YOUR ORDER");}
    }
    const qty=event.target.closest("[data-quantity]");
    if(qty){const slug=qty.dataset.id;cart[slug]=Math.max(0,Math.min(30,(cart[slug]||0)+Number(qty.dataset.quantity)));if(!cart[slug])delete cart[slug];persist();render();}
    if(event.target.closest(".cart-launcher"))open();
    if(event.target.closest("[data-cart-close]"))close();
  });
  document.addEventListener("keydown",event=>{if(event.key==="Escape"&&panel.classList.contains("is-open"))close();});
})();