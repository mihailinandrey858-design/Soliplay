if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const shopsKey = window.sdonateShopStorage.storageKey();
    const shopNameElement = document.querySelector("#servers-shop-name");
    const serverList = document.querySelector("#server-list");
    const serverCount = document.querySelector("#server-count");
    const emptyState = document.querySelector("#servers-empty");
    const form = document.querySelector("#server-form");
    const formTitle = document.querySelector("#form-title");
    const formMessage = document.querySelector("#server-form-message");
    const toast = document.querySelector("#servers-toast");
    const addButtons = [document.querySelector("#add-server"), document.querySelector("#empty-add-server")];
    const cancelButton = document.querySelector("#cancel-edit");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    let activeShop;
    let toastTimer;

    document.querySelector("#account-name").textContent = nickname;
    document.querySelector("#account-avatar").textContent = Array.from(nickname)[0].toUpperCase();
    document.querySelector("#logout-button").addEventListener("click", () => window.sdonateEndSession());

    function readShops() {
        const raw = sessionStorage.getItem(shopsKey);
        if (raw === null) {
            throw new Error("Список магазинов не найден.");
        }
        const shops = JSON.parse(raw);
        if (!Array.isArray(shops) || shops.some(shop =>
            !shop || typeof shop.id !== "string" || typeof shop.name !== "string"
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

    function readServers() {
        if (!Array.isArray(activeShop.servers)) {
            activeShop.servers = [];
        }
        if (activeShop.servers.some(server =>
            !server || typeof server.id !== "string" || typeof server.name !== "string" ||
            typeof server.address !== "string" || typeof server.port !== "number"
        )) {
            throw new Error("Список серверов имеет неверный формат.");
        }
        return activeShop.servers;
    }

    function saveShop(shops) {
        window.sdonateShopStorage.save(shops);
    }

    function makeServerCard(server) {
        const card = document.createElement("article");
        card.className = "server-card";

        const icon = document.createElement("span");
        icon.className = "server-card-icon";
        icon.textContent = Array.from(server.name.trim() || "S")[0].toUpperCase();

        const details = document.createElement("div");
        details.className = "server-card-details";
        const title = document.createElement("h3");
        title.textContent = server.name;
        const address = document.createElement("p");
        address.textContent = `${server.address}:${server.port}`;
        const version = document.createElement("small");
        version.textContent = server.version || "Версия не указана";
        details.append(title, address, version);

        const status = document.createElement("span");
        status.className = "server-demo-status";
        status.textContent = "ДЕМО";

        const actions = document.createElement("div");
        actions.className = "server-card-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Настроить";
        edit.addEventListener("click", () => editServer(server));
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "server-remove-button";
        remove.textContent = "Удалить";
        remove.addEventListener("click", () => deleteServer(server));
        actions.append(edit, remove);
        card.append(icon, details, status, actions);
        return card;
    }

    function renderServers() {
        const servers = readServers();
        serverList.replaceChildren(...servers.map(makeServerCard));
        serverCount.textContent = String(servers.length);
        emptyState.hidden = servers.length > 0;
    }

    function resetForm() {
        form.reset();
        document.querySelector("#server-id").value = "";
        document.querySelector("#server-port").value = "25565";
        formTitle.textContent = "Новый сервер";
        formMessage.hidden = true;
        cancelButton.hidden = true;
    }

    function editServer(server) {
        form.elements.id.value = server.id;
        form.elements.name.value = server.name;
        form.elements.version.value = server.version || "";
        form.elements.address.value = server.address;
        form.elements.port.value = String(server.port);
        form.elements.rconAddress.value = server.rconAddress || "";
        form.elements.rconPort.value = server.rconPort ? String(server.rconPort) : "";
        form.elements.excludeOnline.checked = Boolean(server.excludeOnline);
        formTitle.textContent = "Редактирование сервера";
        cancelButton.hidden = false;
        formMessage.hidden = true;
        document.querySelector("#server-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
        form.elements.name.focus({ preventScroll: true });
    }

    function deleteServer(server) {
        if (!window.confirm(`Удалить сервер «${server.name}» из демо-магазина?`)) {
            return;
        }
        try {
            const shops = readShops();
            const currentShop = shops.find(shop => shop.id === shopId);
            if (!currentShop) {
                throw new Error("Магазин больше не найден.");
            }
            currentShop.servers = (currentShop.servers || []).filter(item => item.id !== server.id);
            saveShop(shops);
            activeShop = currentShop;
            if (form.elements.id.value === server.id) {
                resetForm();
            }
            renderServers();
            showToast("Сервер удалён из демо-списка.");
        } catch (error) {
            showToast(`Не удалось удалить сервер: ${error.message}`);
        }
    }

    function makeId() {
        if (!window.crypto || typeof window.crypto.randomUUID !== "function") {
            throw new Error("Браузер не поддерживает безопасное создание ID.");
        }
        return window.crypto.randomUUID();
    }

    form.addEventListener("submit", event => {
        event.preventDefault();
        formMessage.hidden = true;
        if (!form.reportValidity()) {
            return;
        }

        const address = form.elements.address.value.trim().toLowerCase();
        const hostPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)(?:\.(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?))*$/i;
        if (!hostPattern.test(address)) {
            formMessage.textContent = "Укажи IP-адрес или доменное имя без протокола и порта.";
            formMessage.hidden = false;
            form.elements.address.focus();
            return;
        }
        const rconAddress = form.elements.rconAddress.value.trim().toLowerCase();
        if (rconAddress && !hostPattern.test(rconAddress)) {
            formMessage.textContent = "Проверь RCON-адрес: укажи IP или домен без протокола и порта.";
            formMessage.hidden = false;
            form.elements.rconAddress.focus();
            return;
        }

        try {
            const shops = readShops();
            const currentShop = shops.find(shop => shop.id === shopId);
            if (!currentShop) {
                throw new Error("Магазин больше не найден.");
            }
            if (!Array.isArray(currentShop.servers)) {
                currentShop.servers = [];
            }
            const id = form.elements.id.value || makeId();
            const server = {
                id,
                name: form.elements.name.value.trim(),
                version: form.elements.version.value.trim(),
                address,
                port: Number(form.elements.port.value),
                rconAddress,
                rconPort: form.elements.rconPort.value ? Number(form.elements.rconPort.value) : null,
                excludeOnline: form.elements.excludeOnline.checked
            };
            if (!Number.isInteger(server.port) || server.port < 1 || server.port > 65535 ||
                (server.rconPort !== null && (!Number.isInteger(server.rconPort) || server.rconPort < 1 || server.rconPort > 65535))) {
                throw new Error("Порт должен быть целым числом от 1 до 65535.");
            }
            const index = currentShop.servers.findIndex(item => item.id === id);
            if (index === -1) {
                currentShop.servers.unshift(server);
            } else {
                currentShop.servers[index] = server;
            }
            saveShop(shops);
            activeShop = currentShop;
            renderServers();
            resetForm();
            showToast(index === -1 ? "Сервер добавлен в демо-список." : "Настройки демо-сервера сохранены.");
        } catch (error) {
            formMessage.textContent = `Не удалось сохранить сервер: ${error.message}`;
            formMessage.hidden = false;
        }
    });

    addButtons.forEach(button => button.addEventListener("click", () => {
        resetForm();
        document.querySelector("#server-form-panel").scrollIntoView({ behavior: "smooth", block: "start" });
        form.elements.name.focus({ preventScroll: true });
    }));
    cancelButton.addEventListener("click", resetForm);

    try {
        const shops = readShops();
        activeShop = shops.find(shop => shop.id === shopId);
        if (!activeShop) {
            throw new Error("Магазин не найден или уже удалён.");
        }
        shopNameElement.textContent = activeShop.name;
        document.title = `Серверы — ${activeShop.name} — SDonate`;
        document.querySelector("#back-to-shop").href = `./store-tools.html?id=${encodeURIComponent(activeShop.id)}&tool=plugins`;
        renderServers();
    } catch (error) {
        showToast(`Не удалось открыть серверы: ${error.message}`);
        addButtons.forEach(button => { button.disabled = true; });
        form.querySelectorAll("input, button").forEach(control => { control.disabled = true; });
    }
}
