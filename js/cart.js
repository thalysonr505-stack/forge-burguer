(() => {
  "use strict";
  const products = {
    "original": {name:"THE ORIGINAL",price:2990},
    "double-forge": {name:"DOUBLE FORGE",price:3990},
    "bacon": {name:"THE BACON",price:3490},
    "truffle": {name:"THE TRUFFLE",price:4290}
  };
  const storageKey="forge-cart-v1";
  const panel=document.getElementById("cart-panel");
  if(!panel) return;
  const countEl=document.getElementById("cart-count");
  const itemsEl=document.getElementById("cart-items");
  const subtotalEl=document.getElementById("cart-subtotal");
  const toast=document.getElementById("cart-toast");
  let cart={};
  try {
    const saved=JSON.parse(localStorage.getItem(storageKey)||"{}");
    for(const [id,qty] of Object.entries(saved)) {
      if(products[id] && Number.isInteger(qty) && qty>0) cart[id]=Math.min(qty,99);
    }
  } catch (_) { cart={}; }
  const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
  const total=()=>Object.entries(cart).reduce((sum,[id,qty])=>sum+products[id].price*qty,0);
  const quantity=()=>Object.values(cart).reduce((sum,qty)=>sum+qty,0);
  const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify(cart));}catch(_){}};
  const showToast=message=>{
    toast.textContent=message;
    toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer=window.setTimeout(()=>toast.classList.remove("is-visible"),2200);
  };
  const render=()=>{
    countEl.textContent=quantity();
    countEl.hidden=quantity()===0;
    subtotalEl.textContent=money(total());
    const entries=Object.entries(cart);
    if(!entries.length){
      itemsEl.innerHTML='<p class="cart-empty">Your bag is waiting. Add a Forge creation to begin.</p>';
      return;
    }
    itemsEl.innerHTML=entries.map(([id,qty])=>{
      const p=products[id];
      return '<article class="cart-line"><div class="cart-line-copy"><strong>'+p.name+'</strong><span>'+money(p.price)+' each</span></div><div class="cart-controls"><button type="button" data-quantity="-1" data-id="'+id+'" aria-label="Remove one '+p.name+'">−</button><span>'+qty+'</span><button type="button" data-quantity="1" data-id="'+id+'" aria-label="Add one '+p.name+'">+</button></div><strong class="cart-line-total">'+money(p.price*qty)+'</strong></article>';
    }).join("");
  };
  const open=()=>{
    panel.classList.add("is-open");
    panel.setAttribute("aria-hidden","false");
    document.body.classList.add("cart-is-open");
    panel.querySelector(".cart-close").focus();
  };
  const close=()=>{
    panel.classList.remove("is-open");
    panel.setAttribute("aria-hidden","true");
    document.body.classList.remove("cart-is-open");
    document.querySelector(".cart-launcher").focus();
  };
  document.addEventListener("click",event=>{
    const add=event.target.closest("[data-product]");
    if(add){
      const id=add.dataset.product;
      if(products[id]){cart[id]=Math.min((cart[id]||0)+1,99);persist();render();showToast(products[id].name+" ADDED TO YOUR ORDER");}
    }
    const qty=event.target.closest("[data-quantity]");
    if(qty){
      const id=qty.dataset.id;
      cart[id]=Math.max(0,Math.min(99,(cart[id]||0)+Number(qty.dataset.quantity)));
      if(!cart[id]) delete cart[id];
      persist();render();
    }
    if(event.target.closest(".cart-launcher")) open();
    if(event.target.closest("[data-cart-close]")) close();
  });
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape" && panel.classList.contains("is-open")) close();
  });
  render();
})();