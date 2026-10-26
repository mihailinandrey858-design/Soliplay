if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const shopName = document.querySelector("#shop-name");
    const shopAddress = document.querySelector("#shop-address");
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const toast = document.querySelector("#store-toast");
    const tokenDisplay = document.querySelector("#plugin-token");
    const toggleTokenButton = document.querySelector("#toggle-token");
    const copyTokenButton = document.querySelector("#copy-token");
    const regenerateTokenButton = document.querySelector("#regenerate-token");
    const deleteDialog = document.querySelector("#store-delete-dialog");
    const confirmShopName = document.querySelector("#confirm-shop-name");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    let toastTimer;

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            throw new Error("Список магазинов не найден.");
        }

        const shops = JSON.parse(stored);
        if (!Array.isArray(shops) || shops.some(shop =>
            !shop ||
            typeof shop.id !== "string" ||
            typeof shop.name !== "string" ||
            typeof shop.address !== "string"
        )) {
            throw new Error("Сохранённый список магазинов имеет неверный формат.");
        }
        return shops;
    }

    function showToast(text) {
        window.clearTimeout(toastTimer);
        toast.textContent = text;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function createPluginToken(shops, currentShopId) {
        if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
            throw new Error("Браузер не поддерживает безопасное создание токена.");
        }

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const bytes = new Uint8Array(32);
            window.crypto.getRandomValues(bytes);
            const token = `sd_demo_${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
            if (!shops.some(item => item.id !== currentShopId && item.pluginToken === token)) {
                return token;
            }
        }

        throw new Error("Не удалось создать уникальный токен. Попробуй снова.");
    }

    let isTokenVisible = false;
    function renderToken() {
        tokenDisplay.textContent = isTokenVisible
            ? shop.pluginToken
            : `••••••••••••••••${shop.pluginToken.slice(-6)}`;
        toggleTokenButton.setAttribute("aria-pressed", String(isTokenVisible));
        toggleTokenButton.setAttribute("aria-label", isTokenVisible ? "Скрыть токен" : "Показать токен");
    }

    let shop;
    let shops;
    try {
        shops = readShops();
        shop = shops.find(item => item.id === shopId);
    } catch (error) {
        showToast(`Не удалось загрузить магазин: ${error.message}`);
    }

    if (!shop) {
        if (!toast.textContent) {
            showToast("Магазин не найден или уже удалён.");
        }
        window.setTimeout(() => window.location.replace("./shops.html"), 1800);
    } else {
        try {
            if (typeof shop.pluginToken !== "string" || !shop.pluginToken.startsWith("sd_demo_")) {
                shop.pluginToken = createPluginToken(shops, shop.id);
                window.sdonateShopStorage.save(shops);
            }
            renderToken();
        } catch (error) {
            tokenDisplay.textContent = "Токен недоступен";
            toggleTokenButton.disabled = true;
            copyTokenButton.disabled = true;
            regenerateTokenButton.disabled = true;
            showToast(`Не удалось подготовить токен: ${error.message}`);
        }

        shopName.textContent = shop.name;
        shopAddress.textContent = shop.address || "Поддомен не указан";
        document.title = `${shop.name} — SDonate`;
        confirmShopName.textContent = shop.name;
        document.querySelector("#storefront-preview-button").href =
            `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(sessionStorage.getItem("sdonate-demo-user-id") || "")}`;

        document.querySelector("#rename-store").addEventListener("click", () => {
            window.location.assign(`./store-settings.html?id=${encodeURIComponent(shop.id)}`);
        });

        document.querySelectorAll(".management-card[data-tool]").forEach(button => {
            button.addEventListener("click", () => {
                if (button.dataset.tool === "Настройки") {
                    window.location.assign(`./store-settings.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.tool === "Товары") {
                    window.location.assign(`./store-products.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.tool === "Купоны") {
                    window.location.assign(`./coupons.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.tool === "Страницы") {
                    window.location.assign(`./store-pages.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.tool === "Серверы") {
                    window.location.assign(`./servers.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.tool === "API-интеграции") {
                    document.querySelector(".plugin-token-card").scrollIntoView({ behavior: "smooth", block: "center" });
                    showToast("Здесь находится демонстрационный токен интеграции.");
                    return;
                }
                const toolRoutes = {
                    "Серверы": "servers",
                    "Купоны": "coupons",
                    "Партнёры": "partners",
                    "Массовые ожидания": "waits",
                    "Подборки": "collections",
                    "Страницы": "pages",
                    "Аналитика": "analytics",
                    "Плагины": "plugins"
                };
                const route = toolRoutes[button.dataset.tool];
                if (route) {
                    window.location.assign(`./store-tools.html?id=${encodeURIComponent(shop.id)}&tool=${encodeURIComponent(route)}`);
                } else {
                    showToast(`Раздел «${button.dataset.tool}» недоступен.`);
                }
            });
        });

        document.querySelector(".view-orders").addEventListener("click", event => {
            event.preventDefault();
            showToast("История покупок появится после подключения магазина.");
        });

        toggleTokenButton.addEventListener("click", () => {
            isTokenVisible = !isTokenVisible;
            renderToken();
        });

        copyTokenButton.addEventListener("click", async () => {
            try {
                if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
                    throw new Error("Копирование недоступно в этом браузере. Покажи токен и скопируй его вручную.");
                }
                await navigator.clipboard.writeText(shop.pluginToken);
                showToast("Демо-токен скопирован.");
            } catch (error) {
                showToast(`Не удалось скопировать токен: ${error.message}`);
            }
        });

        regenerateTokenButton.addEventListener("click", () => {
            if (!window.confirm("Создать новый токен? Старый токен сразу перестанет отображаться в этом демо-магазине.")) {
                return;
            }
            try {
                shops = readShops();
                shop = shops.find(item => item.id === shopId);
                if (!shop) {
                    throw new Error("Магазин не найден.");
                }
                shop.pluginToken = createPluginToken(shops, shop.id);
                window.sdonateShopStorage.save(shops);
                isTokenVisible = false;
                renderToken();
                showToast("Создан новый уникальный демо-токен.");
            } catch (error) {
                showToast(`Не удалось обновить токен: ${error.message}`);
            }
        });

        document.querySelector("#delete-shop").addEventListener("click", () => {
            deleteDialog.showModal();
        });

        document.querySelector("#cancel-delete").addEventListener("click", () => {
            deleteDialog.close();
        });

        document.querySelector("#confirm-delete").addEventListener("click", () => {
            try {
                const shops = readShops();
                const remainingShops = shops.filter(item => item.id !== shopId);
                if (remainingShops.length === shops.length) {
                    throw new Error("Магазин не найден в списке.");
                }
                window.sdonateShopStorage.save(remainingShops);
                window.location.assign("./shops.html");
            } catch (error) {
                showToast(`Не удалось удалить магазин: ${error.message}`);
                deleteDialog.close();
            }
        });

        document.querySelector("#logout-button").addEventListener("click", () => {
            sessionStorage.removeItem("sdonate-demo-authenticated");
            window.location.assign("./reg.html?mode=login");
        });
    }
}
