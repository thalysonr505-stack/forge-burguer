(async function () {
  "use strict";
  const client=window.forgeSupabase;
  const grid=document.querySelector(".menu-grid");
  const money=value=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(value/100);
  if(!client||!grid)return;
  const {data,error}=await client.from("products").select("slug,name,description,price_cents,image_url,is_available,sort_order").order("sort_order").order("name");
  if(error){console.error("FORGE menu sync:",error.message);grid.textContent="Não foi possível carregar o cardápio. Atualize a página.";return;}
  const existing=new Map([...grid.querySelectorAll("[data-product]")].map(button=>[button.dataset.product,button.closest(".menu-card")]));
  const products=data||[];
  products.forEach((p,index)=>{
    let card=existing.get(p.slug);
    if(!card){
      card=document.createElement("article");card.className="menu-card";
      const img=document.createElement("img");img.src=p.image_url||"images/the-original.jpg";img.alt="Hambúrguer "+p.name;img.loading="lazy";
      const number=document.createElement("span");number.className="menu-number";number.textContent=String(index+1).padStart(2,"0");
      const info=document.createElement("div");info.className="menu-info";
      const title=document.createElement("h2");const desc=document.createElement("p");const price=document.createElement("strong");price.className="product-price";
      const button=document.createElement("button");button.className="add-to-cart";button.type="button";button.dataset.product=p.slug;
      info.append(title,desc,price,button);card.append(img,number,info);grid.appendChild(card);
    }
    const img=card.querySelector("img");if(img&&p.image_url){img.src=p.image_url;img.alt="Hambúrguer "+p.name;}
    const title=card.querySelector(".menu-info h2"),description=card.querySelector(".menu-info p"),price=card.querySelector(".product-price"),button=card.querySelector("[data-product]");
    if(title)title.textContent=p.name;
    if(description)description.textContent=p.description||"Uma criação especial da casa.";
    if(price)price.textContent=money(p.price_cents);
    if(button){button.disabled=!p.is_available;button.setAttribute("aria-disabled",String(!p.is_available));button.innerHTML=p.is_available?'ADICIONAR AO CARRINHO <span>+</span>':'INDISPONÍVEL NO MOMENTO';}
    card.style.display=p.is_available?"":"none";
    grid.appendChild(card);
    existing.delete(p.slug);
  });
  existing.forEach(card=>card.remove());
  window.forgeProducts=new Map(products.map(p=>[p.slug,p]));
})();