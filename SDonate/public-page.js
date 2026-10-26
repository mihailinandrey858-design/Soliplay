(() => {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const ownerId = params.get("owner");
    const slug = params.get("slug");

    try {
        if (!shopId || !ownerId || !slug) {
            throw new Error("В ссылке не указан магазин или адрес страницы.");
        }
        const stored = sessionStorage.getItem(`sdonate-demo-shops:account:${encodeURIComponent(ownerId)}`);
        if (stored === null) {
            throw new Error("Страница доступна только в браузере, где сохранены демо-данные магазина.");
        }
        const shops = JSON.parse(stored);
        if (!Array.isArray(shops)) {
            throw new Error("Список магазинов имеет неверный формат.");
        }
        const shop = shops.find(item => item && item.id === shopId && item.ownerId === ownerId);
        const page = shop && shop.tools && Array.isArray(shop.tools.pages)
            ? shop.tools.pages.find(item => item && item.address === slug)
            : null;
        if (!shop || !page) {
            throw new Error("Страница не найдена или уже удалена.");
        }

        const pageUrl = `./public-page.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(ownerId)}&slug=${encodeURIComponent(page.address)}`;
        document.title = `${page.title} — ${shop.name}`;
        document.querySelector("#page-store-brand").href = `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(ownerId)}`;
        document.querySelector("#page-home-link").href = `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(ownerId)}`;
        document.querySelector("#page-shop-link").href = `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(ownerId)}`;
        document.querySelector("#standalone-back-link").href = `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(ownerId)}`;
        document.querySelector("#page-store-name").textContent = shop.name;
        document.querySelector("#page-brand-mark").textContent = Array.from(shop.name.trim() || "S")[0].toUpperCase();
        document.querySelector("#standalone-page-title").textContent = page.title;
        document.querySelector("#standalone-page-description").textContent = page.description || "ИНФОРМАЦИЯ";
        window.sdonateMarkdown.render(page.content || "", document.querySelector("#standalone-page-content"));
    } catch (error) {
        document.title = "Страница недоступна — SDonate";
        document.querySelector("#standalone-page-title").textContent = "Страница недоступна";
        document.querySelector("#standalone-page-description").textContent = "ПРЕДПРОСМОТР";
        window.sdonateMarkdown.render(error.message, document.querySelector("#standalone-page-content"));
    }
})();
