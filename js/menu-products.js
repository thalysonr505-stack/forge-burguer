(async function () {
  "use strict";
  const client=window.forgeSupabase;
  const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
  const buttons=[...document.querySelectorAll(".menu-card [data-product]")];
  const localized={original:{name:"O ORIGINAL",description:"Pão brioche, hambúrguer de 100 g na chapa, queijo cheddar e molho da casa."},"double-forge":{name:"DUPLO FORGE",description:"Pão brioche, dois hambúrgueres na chapa, cheddar em dobro e molho da casa."},bacon:{name:"BACON DA CASA",description:"Pão brioche, hambúrguer na chapa, cheddar, bacon crocante e molho especial."},truffle:{name:"TRUFA",description:"Pão brioche, hambúrguer na chapa, queijo e molho cremoso com inspiração em trufas."}};
  if(!client){buttons.forEach(button=>{button.disabled=true;button.textContent="CARDÁPIO INDISPONÍVEL";});return;}
  const {data,error}=await client.from("products").select("slug,name,description,price_cents,is_available,sort_order").order("sort_order");
  if(error){console.error("FORGE menu sync:",error.message);buttons.forEach(button=>{button.disabled=true;button.textContent="INDISPONÍVEL NO MOMENTO";});return;}
  const cards=new Map((data||[]).map(p=>[p.slug,p]));
  document.querySelectorAll(".menu-card [data-product]").forEach(button=>{
    const card=button.closest(".menu-card");
    const p=cards.get(button.dataset.product);
    if(!p){button.disabled=true;button.textContent="INDISPONÍVEL";return;}
    const title=card.querySelector(".menu-info h2");
    const description=card.querySelector(".menu-info p");
    const price=card.querySelector(".product-price");
    const copy=localized[p.slug]||{name:p.name,description:p.description};
    if(title) title.textContent=copy.name;
    if(description) description.textContent=copy.description;
    if(price) price.textContent=money(p.price_cents);
    button.dataset.price=p.price_cents;
    button.disabled=!p.is_available;
    button.innerHTML=p.is_available?'ADICIONAR AO CARRINHO <span>+</span>':'INDISPONÍVEL NO MOMENTO';
  });
  window.forgeProducts=cards;
})();