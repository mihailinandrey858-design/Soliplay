if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const form = document.querySelector("#create-shop-form");
    const nameInput = document.querySelector("#shop-name");
    const subdomainInput = document.querySelector("#shop-subdomain");
    const payoutMethod = document.querySelector("#payout-method");
    const message = document.querySelector("#form-message");
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const logoutButton = document.querySelector("#logout-button");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const storageKey = window.sdonateShopStorage.storageKey();

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();

    subdomainInput.addEventListener("input", () => {
        subdomainInput.value = subdomainInput.value
            .toLowerCase()
            .replace(/\s+/g, "-")
            .replace(/[^a-z0-9-]/g, "");
        message.hidden = true;
    });

    nameInput.addEventListener("input", () => {
        message.hidden = true;
    });

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            return [];
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

    function makeId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function makePluginToken(shops) {
        if (!window.crypto || typeof window.crypto.getRandomValues !== "function") {
            throw new Error("Браузер не поддерживает безопасное создание токена.");
        }

        for (let attempt = 0; attempt < 5; attempt += 1) {
            const bytes = new Uint8Array(32);
            window.crypto.getRandomValues(bytes);
            const token = `sd_demo_${Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("")}`;
            if (!shops.some(shop => shop.pluginToken === token)) {
                return token;
            }
        }

        throw new Error("Не удалось создать уникальный токен. Попробуй снова.");
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        message.hidden = true;

        if (!form.reportValidity()) {
            return;
        }

        const name = nameInput.value.trim();
        const subdomain = subdomainInput.value.trim();
        const address = `${subdomain}.sdonate.store`;

        if (name.length < 2 || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(subdomain)) {
            message.textContent = "Проверь название и поддомен. Поддомен должен содержать 3–30 латинских символов, цифр или дефисов.";
            message.hidden = false;
            return;
        }

        let shops;
        try {
            shops = readShops();
        } catch (error) {
            message.textContent = `Не удалось загрузить список магазинов: ${error.message}`;
            message.hidden = false;
            return;
        }

        const duplicate = shops.some(shop =>
            shop.address.toLocaleLowerCase() === address.toLocaleLowerCase()
        );
        if (duplicate) {
            message.textContent = "Этот поддомен уже используется. Выбери другой.";
            message.hidden = false;
            subdomainInput.focus();
            return;
        }

        try {
            shops.unshift({
                id: makeId(),
                name,
                address,
                payoutMethod: payoutMethod.value,
                pluginToken: makePluginToken(shops)
            });
            window.sdonateShopStorage.save(shops);
        } catch (error) {
            message.textContent = `Не удалось сохранить демо-магазин: ${error.message}`;
            message.hidden = false;
            return;
        }

        window.location.assign(`./shop-dashboard.html?id=${encodeURIComponent(shops[0].id)}`);
    });

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });
}
