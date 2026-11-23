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
    const checkoutButton=document.getElementById("checkout-submit");
    if(checkoutButton&&!checkoutButton.dataset.submitting)checkoutButton.disabled=quantity()===0;
    const entries=Object.entries(cart).filter(([slug,qty])=>products[slug]&&Number.isInteger(qty)&&qty>0);
    itemsEl.replaceChildren();
    if(!entries.length){
      const empty=document.createElement("p");
      empty.className="cart-empty";
      empty.textContent="Your bag is waiting. Add a Forge creation to begin.";
      itemsEl.appendChild(empty);
      return;
    }
    entries.forEach(([slug,qty])=>{
      const p=products[slug];
      const line=document.createElement("article");line.className="cart-line";
      const copy=document.createElement("div");copy.className="cart-line-copy";
      const name=document.createElement("strong");name.textContent=p.name;
      const unit=document.createElement("span");unit.textContent=money(p.price_cents)+" each";
      copy.append(name,unit);
      const controls=document.createElement("div");controls.className="cart-controls";
      const remove=document.createElement("button");remove.type="button";remove.dataset.quantity="-1";remove.dataset.id=slug;remove.setAttribute("aria-label","Remove one "+p.name);remove.textContent="−";
      const amount=document.createElement("span");amount.textContent=String(qty);
      const add=document.createElement("button");add.type="button";add.dataset.quantity="1";add.dataset.id=slug;add.setAttribute("aria-label","Add one "+p.name);add.textContent="+";
      controls.append(remove,amount,add);
      const lineTotal=document.createElement("strong");lineTotal.className="cart-line-total";lineTotal.textContent=money(p.price_cents*qty);
      line.append(copy,controls,lineTotal);itemsEl.appendChild(line);
    });
  };
  const focusableSelector='a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const open=()=>{if(panel.classList.contains("is-open"))return;panel.classList.add("is-open");panel.setAttribute("aria-hidden","false");document.body.classList.add("cart-is-open");panel.querySelector(".cart-close").focus();};
  const close=()=>{if(!panel.classList.contains("is-open"))return;panel.classList.remove("is-open");panel.setAttribute("aria-hidden","true");document.body.classList.remove("cart-is-open");document.querySelector(".cart-launcher").focus();};
  if(client){
    const {data,error}=await client.from("products").select("slug,name,price_cents,is_available");
    if(!error) for(const p of data||[]) products[p.slug]=p;
    else {
      console.error("FORGE cart catalog:",error.message);
      document.querySelectorAll("[data-product]").forEach(button=>{button.disabled=true;});
      showToast("MENU TEMPORARILY UNAVAILABLE");
    }
  }
  if(!client){
    products={
      original:{name:"THE ORIGINAL",price_cents:2990,is_available:true},
      "double-forge":{name:"DOUBLE FORGE",price_cents:3990,is_available:true},
      bacon:{name:"THE BACON",price_cents:3490,is_available:true},
      truffle:{name:"THE TRUFFLE",price_cents:4290,is_available:true}
    };
  }
  for(const slug of Object.keys(cart)) {
    const qty=cart[slug];
    if(!Object.prototype.hasOwnProperty.call(products,slug)||!products[slug].is_available||!Number.isInteger(qty)||qty<1) delete cart[slug];
    else cart[slug]=Math.min(qty,30);
  }
  persist();render();
  const checkoutForm=document.getElementById("checkout-form");
  const fulfillmentSelect=document.getElementById("fulfillment");
  const syncFulfillment=()=>{
    const mode=fulfillmentSelect.value;
    document.getElementById("delivery-address-field").hidden=mode!=="delivery";
    document.getElementById("delivery-reference-field").hidden=mode!=="delivery";
    document.getElementById("table-code-field").hidden=mode!=="dine_in";
    checkoutForm.elements.delivery_address.required=mode==="delivery";
    checkoutForm.elements.table_code.required=mode==="dine_in";
  };
  fulfillmentSelect.addEventListener("change",syncFulfillment);syncFulfillment();
  checkoutForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const message=document.getElementById("checkout-message");
    const submit=document.getElementById("checkout-submit");
    if(!client){message.textContent="Order service unavailable. Please try again shortly.";return;}
    const items=Object.entries(cart).filter(([slug,qty])=>products[slug]&&qty>0).map(([slug,quantity])=>({slug,quantity}));
    if(!items.length){message.textContent="Add an item before placing your order.";return;}
    submit.disabled=true;submit.dataset.submitting="true";submit.textContent="SENDING ORDER...";message.textContent="";
    const f=new FormData(checkoutForm);
    const payload={p_customer_name:f.get("customer_name"),p_customer_phone:f.get("customer_phone"),p_fulfillment:f.get("fulfillment"),p_payment_method:f.get("payment_method"),p_items:items,p_delivery_address:f.get("delivery_address")||null,p_delivery_reference:f.get("delivery_reference")||null,p_table_code:f.get("table_code")||null,p_notes:f.get("notes")||null};
    try{
      const {data,error}=await client.rpc("create_guest_order",payload);
      if(error) throw error;
      const result=data;
      cart={};persist();render();
      const url=new URL("track.html",window.location.href);
      url.searchParams.set("order",result.order_number);url.searchParams.set("token",result.tracking_token);
      message.textContent="Order #"+result.order_number+" placed. Opening tracking...";
      window.location.href=url.toString();
    }catch(error){message.textContent=error.message||"Could not place order. Please try again.";delete submit.dataset.submitting;submit.disabled=quantity()===0;submit.textContent="PLACE ORDER";}
  });
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
  document.addEventListener("keydown",event=>{
    if(!panel.classList.contains("is-open"))return;
    if(event.key==="Escape"){close();return;}
    if(event.key!=="Tab")return;
    const focusable=[...panel.querySelectorAll(focusableSelector)].filter(el=>el.getClientRects().length>0);
    if(!focusable.length){event.preventDefault();return;}
    const first=focusable[0],last=focusable[focusable.length-1];
    if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
    else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
  });
})();