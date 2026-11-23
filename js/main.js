(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    document.addEventListener("click", (event) => {
        const link = event.target.closest("a");
        if (!link) return;

        const href = link.getAttribute("href");
        if (!href || href.startsWith("#") || link.target === "_blank" ||
            event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

        const destination = new URL(link.href, window.location.href);
        if (destination.origin !== window.location.origin ||
            destination.pathname === window.location.pathname) return;

        event.preventDefault();
        document.body.classList.add("page-leaving");
        window.setTimeout(() => {
            window.location.href = destination.href;
        }, 220);
    });
})();