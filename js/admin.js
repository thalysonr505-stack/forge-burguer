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
const transitions={pending:["confirmed","cancelled"],confirmed:["preparing","cancelled"],preparing:["ready","cancelled"],ready:["out_for_delivery","delivered","cancelled"],out_for_delivery:["delivered","cancelled"]};
let staff=null;
let busy=false;
if(!client){loginMessage.textContent="Serviço de autenticação indisponível.";return;}

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
  const status=document.createElement("span");status.className="order-status";status.textContent=labels[order.status]||order.status.toUpperCase();
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
   const update=document.createElement("button");update.type="button";update.className="admin-btn";update.textContent="ATUALIZAR STATUS";
   update.addEventListener("click",()=>updateStatus(order.id,select.value,update));
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

async function updateStatus(id,status,button){
 button.disabled=true;
 try{
  const {error}=await client.rpc("staff_update_order_status",{p_order_id:id,p_new_status:status,p_estimated_minutes:null});
  if(error)throw error;
  await loadOrders();
 }catch(error){message(dashboardMessage,error.message||"Não foi possível atualizar o pedido.");button.disabled=false;}
};