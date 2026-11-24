(async () => {
  "use strict";

  const client = window.forgeSupabase;
  const params = new URLSearchParams(window.location.search);
  const order = params.get("order");
  const token = params.get("token");
  const card = document.getElementById("track-card");

  const steps = [
    ["pending", "PEDIDO RECEBIDO"],
    ["confirmed", "CONFIRMADO"],
    ["preparing", "EM PREPARO"],
    ["ready", "PRONTO"],
    ["out_for_delivery", "SAIU PARA ENTREGA"],
    ["delivered", "ENTREGUE"]
  ];
  const money = value => new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value / 100);

  if (!card) return;

  const showMessage = (message, isError = false) => {
    card.replaceChildren();
    const paragraph = document.createElement("p");
    paragraph.className = isError ? "track-error" : "track-estimate";
    paragraph.textContent = message;
    card.appendChild(paragraph);
  };

  if (!client || !order || !/^\d+$/.test(order) || !token || !/^[a-f0-9]{48}$/i.test(token)) {
    showMessage("Link de acompanhamento inválido. Utilize o link privado recebido após realizar o pedido.", true);
    return;
  }

  let refreshTimer = null;
  let stopped = false;
  let loading = false;

  function stopPolling() {
    stopped = true;
    if (refreshTimer) window.clearInterval(refreshTimer);
    refreshTimer = null;
  }

  function appendText(parent, tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    parent.appendChild(element);
    return element;
  }

  function render(data) {
    card.replaceChildren();

    appendText(card, "div", "track-number", "ORDER #" + data.order_number);

    if (data.status === "cancelled") {
      appendText(card, "div", "track-status", "PEDIDO CANCELADO");
      appendText(card, "p", "track-error", "Este pedido foi cancelado. Entre em contato com a equipe da FORGE para obter mais informações.");
    } else {
      const current = steps.findIndex(([key]) => key === data.status);
      const label = current >= 0 ? steps[current][1] : "ATUALIZAÇÃO DO PEDIDO";
      appendText(card, "div", "track-status", label);

      const estimate = data.estimated_minutes
        ? "Previsão: " + data.estimated_minutes + " minutos"
        : "Atualizaremos a previsão assim que possível.";
      appendText(card, "p", "track-estimate", estimate);

      const progress = document.createElement("div");
      progress.className = "track-steps";
      steps.forEach(([key, stepLabel], index) => {
        const step = document.createElement("div");
        step.className = "track-step" + (current >= 0 && index <= current ? " done" : "");
        step.textContent = stepLabel;
        progress.appendChild(step);
      });
      card.appendChild(progress);
    }

    const items = document.createElement("div");
    items.className = "track-items";
    (Array.isArray(data.items) ? data.items : []).forEach(item => {
      appendText(items, "div", "", item.quantity + " × " + item.name + " — " + money(item.line_total_cents));
    });
    card.appendChild(items);

    const total = document.createElement("div");
    total.className = "track-total";
    appendText(total, "span", "", "TOTAL");
    appendText(total, "span", "", money(data.total_cents));
    card.appendChild(total);
  }

  async function load() {
    if (loading || stopped) return;
    loading = true;
    try {
      const { data, error } = await client.rpc("get_order_tracking", {
        p_order_number: Number(order),
        p_tracking_token: token
      });

      if (error || !data || typeof data !== "object") {
        showMessage("Pedido não encontrado ou código de acompanhamento inválido. Mantenha seu link privado.", true);
        stopPolling();
        return;
      }

      render(data);
      if (["delivered", "cancelled"].includes(data.status)) stopPolling();
    } catch (_) {
      showMessage("Não foi possível atualizar o pedido. Verifique sua conexão e tente novamente.", true);
    } finally {
      loading = false;
    }
  }

  await load();
  if (!stopped) refreshTimer = window.setInterval(load, 12000);
  window.addEventListener("pagehide", stopPolling, { once: true });
})();