(async () => {
"use strict";
const client=window.forgeSupabase;
const loginSection=document.getElementById("login-section");
const dashboard=document.getElementById("dashboard-section");
const loginForm=document.getElementById("login-form");
const loginMessage=document.getElementById("login-message");
const dashboardMessage=document.getElementById("dashboard-message");
const ordersGrid=document.getElementById("orders-grid");
const logoutButton=document.getElementById("logout-button");
const statusFilter=document.getElementById("status-filter");
const refreshButton=document.getElementById("refresh-button");
const money=v=>new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v/100);
const labels={pending:"RECEBIDO",confirmed:"CONFIRMADO",preparing:"EM PREPARO",ready:"PRONTO",out_for_delivery:"SAIU PARA ENTREGA",delivered:"ENTREGUE",cancelled:"CANCELADO"};
const roleLabels={owner:"PROPRIETÁRIO",manager:"GERÊNCIA",kitchen:"COZINHA",attendant:"ATENDIMENTO"};
const transitions={pending:["confirmed","cancelled"],confirmed:["preparing","cancelled"],preparing:["ready","cancelled"],ready:["out_for_delivery","delivered","cancelled"],out_for_delivery:["delivered","cancelled"]};
let staff=null;
let busy=false;
let refreshTimer=null;


function message(el,text){el.textContent=text||"";}
function showDashboard(){loginSection.classList.add("admin-hidden");dashboard.classList.remove("admin-hidden");logoutButton.classList.remove("admin-hidden");}
function showLogin(){dashboard.classList.add("admin-hidden");loginSection.classList.remove("admin-hidden");logoutButton.classList.add("admin-hidden");}

async function verifyStaff(){
 const {data:{user},error}=await client.auth.getUser();
 if(error||!user){staff=null;showLogin();return false;}
 const {data,error:staffError}=await client.from("staff_members").select("display_name,role,is_active").eq("user_id",user.id).maybeSingle();
 if(staffError||!data||!data.is_active||!["owner","manager","kitchen","attendant"].includes(data.role)){
  await client.auth.signOut();staff=null;showLogin();
  message(loginMessage,"Esta conta não possui autorização ativa para acessar o painel.");
  return false;
 }
 staff={...data,user};showDashboard();
 productsTab.classList.toggle("admin-hidden",!["owner","manager"].includes(data.role));
 if(!["owner","manager"].includes(data.role)){productsSection.classList.add("admin-hidden");}else{showAdminTab("orders");}
 document.getElementById("staff-greeting").textContent="Olá, "+data.display_name+" · Perfil: "+data.role.toUpperCase();
 return true;
}

function renderOrders(orders){
 ordersGrid.replaceChildren();
 if(!orders.length){const p=document.createElement("p");p.className="admin-sub";p.textContent="Nenhum pedido encontrado neste filtro.";ordersGrid.appendChild(p);return;}
 for(const order of orders){
  const card=document.createElement("article");card.className="order-card";
  const head=document.createElement("div");head.className="order-head";
  const number=document.createElement("strong");number.className="order-number";number.textContent="PEDIDO #"+order.order_number;
  const status=document.createElement("span");status.className="order-status status-"+order.status;status.textContent=labels[order.status]||order.status.toUpperCase();
  head.append(number,status);card.appendChild(head);
  const meta=document.createElement("div");meta.className="order-meta";
  const date=new Date(order.created_at).toLocaleString("pt-BR");
  meta.textContent=order.customer_name+" · "+order.customer_phone+"\n"+date+"\n"+({delivery:"Entrega",pickup:"Retirada",dine_in:"Mesa"}[order.fulfillment]||order.fulfillment)+" · "+({pix:"PIX",cash:"Dinheiro",card_on_delivery:"Cartão na entrega",online:"Online"}[order.payment_method]||order.payment_method)+"\n"+(order.delivery_address||("Mesa: "+(order.table_code||"—")));
  card.appendChild(meta);
  const itemList=document.createElement("div");itemList.className="order-items";
  (order.order_items||[]).forEach(item=>{const line=document.createElement("div");line.textContent=item.quantity+" × "+item.product_name+" — "+money(item.line_total_cents);itemList.appendChild(line);});
  card.appendChild(itemList);
  const total=document.createElement("div");total.className="order-total";total.textContent="TOTAL "+money(order.total_cents);card.appendChild(total);
  if(order.notes){const note=document.createElement("p");note.className="order-meta";note.textContent="OBS: "+order.notes;card.appendChild(note);}
  const next=(transitions[order.status]||[]).filter(value=> staff.role==="owner"||staff.role==="manager" ? true : staff.role==="kitchen" ? ((order.status==="confirmed"&&value==="preparing")||(order.status==="preparing"&&value==="ready")) : ((order.status==="pending"&&["confirmed","cancelled"].includes(value))||(order.status==="ready"&&["out_for_delivery","delivered"].includes(value))||(order.status==="out_for_delivery"&&value==="delivered")));
  if(next.length){
   const actions=document.createElement("div");actions.className="order-actions";
   const select=document.createElement("select");select.setAttribute("aria-label","Novo status do pedido "+order.order_number);
   next.forEach(value=>{const option=document.createElement("option");option.value=value;option.textContent=labels[value];select.appendChild(option);});
   const update=document.createElement("button");update.type="button";update.className="admin-btn";update.textContent="SALVAR STATUS";
   update.addEventListener("click",()=>updateStatus(order.id,select.value,update));
   select.addEventListener("change",()=>{update.textContent="SALVAR "+(labels[select.value]||"STATUS");});
   actions.append(select,update);card.appendChild(actions);
  }
  ordersGrid.appendChild(card);
 }
}

async function loadOrders(){
 if(busy||!staff)return;busy=true;refreshButton.disabled=true;message(dashboardMessage,"Carregando pedidos...");
 try{
  let query=client.from("orders").select("id,order_number,customer_name,customer_phone,fulfillment,status,payment_method,delivery_address,table_code,notes,total_cents,created_at,order_items(product_name,quantity,line_total_cents)").order("created_at",{ascending:false}).limit(100);
  const filter=statusFilter.value;
  if(filter==="active")query=query.not("status","in",'("delivered","cancelled")');
  else if(filter!=="all")query=query.eq("status",filter);
  const {data,error}=await query;
  if(error)throw error;
  renderOrders(data||[]);message(dashboardMessage,(data||[]).length+" pedido(s) carregado(s).");
 }catch(error){message(dashboardMessage,error.message||"Não foi possível carregar os pedidos.");}
 finally{busy=false;refreshButton.disabled=false;}
}

function startAutoRefresh(){
 if(refreshTimer)window.clearInterval(refreshTimer);
 refreshTimer=window.setInterval(()=>{if(!document.hidden&&staff&&!busy)loadOrders();},20000);
}

async function updateStatus(id,status,button){
 button.disabled=true;
 try{
  const {error}=await client.rpc("staff_update_order_status",{p_order_id:id,p_new_status:status,p_estimated_minutes:null});
  if(error)throw error;
  await loadOrders();
 }catch(error){message(dashboardMessage,error.message||"Não foi possível atualizar o pedido.");button.disabled=false;}
};


const productsTab=document.getElementById("products-tab");
const productsSection=document.getElementById("products-section");
const productsList=document.getElementById("products-list");
const createProductForm=document.getElementById("product-create-form");
const createProductMessage=document.getElementById("product-create-message");
const adminTabs=[...document.querySelectorAll("[data-admin-tab]")];
function showAdminTab(tab){
 const isProducts=tab==="products";
 document.querySelector(".admin-toolbar").classList.toggle("admin-hidden",isProducts);
 document.getElementById("dashboard-message").classList.toggle("admin-hidden",isProducts);
 ordersGrid.classList.toggle("admin-hidden",isProducts);
 productsSection.classList.toggle("admin-hidden",!isProducts);
 adminTabs.forEach(b=>b.classList.toggle("is-active",b.dataset.adminTab===tab));
 if(isProducts)loadProducts();
}
adminTabs.forEach(b=>b.addEventListener("click",()=>showAdminTab(b.dataset.adminTab)));
function productField(label,value,type="text"){
 const wrap=document.createElement("label");wrap.textContent=label;
 const input=document.createElement(type==="textarea"?"textarea":"input");
 if(type!=="textarea")input.type=type;
 if(type==="textarea")input.rows=2;
 input.value=value??"";wrap.appendChild(input);return {wrap,input};
}
async function loadProducts(){
 if(!staff||!["owner","manager"].includes(staff.role)){productsList.textContent="Seu perfil não tem permissão para gerenciar o cardápio.";return;}
 productsList.textContent="Carregando produtos...";
 const {data,error}=await client.from("products").select("id,slug,name,description,price_cents,image_url,is_available,sort_order").order("sort_order").order("name");
 if(error){productsList.textContent=error.message;return;}
 productsList.replaceChildren();
 if(!data.length){productsList.textContent="Nenhum produto cadastrado.";return;}
 data.forEach(product=>{
  const row=document.createElement("form");row.className="product-row";
  const name=productField("NOME",product.name);
  const price=productField("PREÇO EM REAIS",(product.price_cents/100).toFixed(2),"number");price.input.min="0.01";price.input.max="9999";price.input.step="0.01";price.input.required=true;
  const desc=productField("DESCRIÇÃO",product.description,"textarea");desc.wrap.classList.add("wide");
  const image=productField("URL DA IMAGEM",product.image_url||"","url");image.wrap.classList.add("wide");
  const slug=document.createElement("p");slug.className="admin-sub wide";slug.textContent="ID: "+product.slug;
  const actions=document.createElement("div");actions.className="product-row-actions wide";
  const availableLabel=document.createElement("label");availableLabel.className="availability-label";
  const available=document.createElement("input");available.type="checkbox";available.checked=product.is_available;
  availableLabel.append(available,document.createTextNode("Produto disponível no cardápio"));
  const save=document.createElement("button");save.type="submit";save.className="admin-btn";save.textContent="SALVAR ALTERAÇÕES";
  const feedback=document.createElement("p");feedback.className="admin-message wide";feedback.setAttribute("role","status");
  actions.append(availableLabel,save);row.append(name.wrap,price.wrap,desc.wrap,image.wrap,slug,actions,feedback);
  row.addEventListener("submit",async event=>{
   event.preventDefault();save.disabled=true;feedback.textContent="Salvando...";
   const parsed=Math.round(Number(price.input.value)*100);
   if(!Number.isSafeInteger(parsed)||parsed<1){feedback.textContent="Informe um preço válido.";save.disabled=false;return;}
   const {error}=await client.from("products").update({name:name.input.value.trim(),description:desc.input.value.trim(),price_cents:parsed,image_url:image.input.value.trim()||null,is_available:available.checked,updated_at:new Date().toISOString()}).eq("id",product.id);
   if(error){feedback.textContent=error.message;save.disabled=false;return;}
   feedback.textContent="Alterações salvas. O cardápio público já pode refletir os novos dados.";
   save.disabled=false;
  });
  productsList.appendChild(row);
 });
}
createProductForm.addEventListener("submit",async event=>{
 event.preventDefault();if(!staff||!["owner","manager"].includes(staff.role))return;
 const button=createProductForm.querySelector('button[type="submit"]');button.disabled=true;message(createProductMessage,"Cadastrando produto...");
 const form=new FormData(createProductForm);const price=Math.round(Number(form.get("price"))*100);
 if(!Number.isSafeInteger(price)||price<1){message(createProductMessage,"Informe um preço válido.");button.disabled=false;return;}
 const {error}=await client.from("products").insert({slug:String(form.get("slug")).trim(),name:String(form.get("name")).trim(),description:String(form.get("description")||"").trim(),price_cents:price,image_url:String(form.get("image_url")||"").trim()||null,is_available:true,sort_order:100});
 if(error){message(createProductMessage,error.message);button.disabled=false;return;}
 createProductForm.reset();message(createProductMessage,"Produto cadastrado com sucesso.");button.disabled=false;loadProducts();
});

loginForm.addEventListener("submit", async event => {
 event.preventDefault();
 if(!client){message(loginMessage,"A biblioteca de autenticação não carregou. Verifique a conexão e atualize a página.");return;}
 if (busy) return;
 const submitButton=loginForm.querySelector('button[type="submit"]');
 const email=document.getElementById("staff-email").value.trim();
 const password=document.getElementById("staff-password").value;
 if(!email||!password){message(loginMessage,"Informe e-mail e senha.");return;}
 busy=true;submitButton.disabled=true;message(loginMessage,"Verificando acesso...");
 try{
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error)throw error;
  if(!data.user)throw new Error("Não foi possível confirmar o usuário.");
  const allowed=await verifyStaff();
  if(!allowed)throw new Error(loginMessage.textContent||"Acesso não autorizado.");
  loginForm.reset();
  message(loginMessage,"");
  busy=false;
  await loadOrders();
  startAutoRefresh();
 }catch(error){
  message(loginMessage,error.message||"Falha ao entrar. Confira suas credenciais.");
 }finally{
  busy=false;submitButton.disabled=false;
 }
});

logoutButton.addEventListener("click",async()=>{
 if(refreshTimer){window.clearInterval(refreshTimer);refreshTimer=null;}
 logoutButton.disabled=true;
 try{await client.auth.signOut();staff=null;showLogin();message(loginMessage,"Sessão encerrada.");}
 catch(error){message(dashboardMessage,error.message||"Não foi possível sair.");}
 finally{logoutButton.disabled=false;}
});

refreshButton.addEventListener("click",loadOrders);
statusFilter.addEventListener("change",loadOrders);

(async()=>{
 try{
  const allowed=await verifyStaff();
  if(allowed){
   await loadOrders();
   startAutoRefresh();
  }
 }catch(error){
  showLogin();
  message(loginMessage,error.message||"Não foi possível verificar a sessão.");
 }
})();
window.addEventListener("pagehide",()=>{if(refreshTimer)window.clearInterval(refreshTimer);},{once:true});
})();