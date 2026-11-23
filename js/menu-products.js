(async function () {
  "use strict";
  const client=window.forgeSupabase;
  const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
  if(!client) return;
  const {data,error}=await client.from("products").select("slug,name,description,price_cents,is_available,sort_order").order("sort_order");
  if(error){console.error("FORGE menu sync:",error.message);return;}
  const cards=new Map((data||[]).map(p=>[p.slug,p]));
  document.querySelectorAll(".menu-card [data-product]").forEach(button=>{
    const card=button.closest(".menu-card");
    const p=cards.get(button.dataset.product);
    if(!p){button.disabled=true;button.textContent="UNAVAILABLE";return;}
    const title=card.querySelector(".menu-info h2");
    const description=card.querySelector(".menu-info p");
    const price=card.querySelector(".product-price");
    if(title) title.textContent=p.name;
    if(description) description.textContent=p.description;
    if(price) price.textContent=money(p.price_cents);
    button.dataset.price=p.price_cents;
    button.disabled=!p.is_available;
    button.textContent=p.is_available?'ADD TO ORDER +':'CURRENTLY UNAVAILABLE';
  });
  window.forgeProducts=cards;
})();