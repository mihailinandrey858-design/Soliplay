if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const shopsAccountName = document.querySelector("#shops-account-name");
    const shopList = document.querySelector("#shop-list");
    const shopCount = document.querySelector("#shop-count");
    const shopCountLabel = document.querySelector("#shop-count-label");
    const emptyState = document.querySelector("#shops-empty");
    const toast = document.querySelector("#shops-toast");
    const logoutButton = document.querySelector("#logout-button");
    const shopDialog = document.querySelector("#shop-dialog");
    const editForm = document.querySelector("#shop-edit-form");
    const editNameInput = document.querySelector("#edit-shop-name");
    const editAddressInput = document.querySelector("#edit-shop-address");
    const editFeedback = document.querySelector("#shop-edit-feedback");
    const deleteDialog = document.querySelector("#delete-dialog");
    const deleteShopName = document.querySelector("#delete-shop-name");
    let activeShopId = null;
    let toastTimer;

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
    shopsAccountName.textContent = nickname;

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function makeId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            const initialShop = [{
                id: makeId(),
                name: "Мой магазин",
                address: "play.example.net",
                payoutMethod: "RCON"
            }];
            window.sdonateShopStorage.save(initialShop);
            return initialShop;
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

        const previousDefaultName = `${nickname} — мой магазин`;
        const migrated = shops.some(shop => shop.name === previousDefaultName);
        if (migrated) {
            shops.forEach(shop => {
                if (shop.name === previousDefaultName) {
                    shop.name = "Мой магазин";
                }
            });
            window.sdonateShopStorage.save(shops);
        }
        return shops;
    }

    function makeShopCard(shop) {
        const card = document.createElement("article");
        card.className = "shop-card";

        const cover = document.createElement("div");
        cover.className = "shop-card-cover";

        const mark = document.createElement("span");
        mark.className = "shop-mark";
        mark.textContent = Array.from(shop.name.trim() || "М")[0].toUpperCase();

        const copy = document.createElement("div");
        copy.className = "shop-cover-copy";
        const type = document.createElement("small");
        type.textContent = "Магазин сервера";
        const title = document.createElement("b");
        title.textContent = shop.name;
        copy.append(type, title);

        const status = document.createElement("span");
        status.className = "shop-status";
        const statusDot = document.createElement("i");
        status.append(statusDot, document.createTextNode("Демо"));
        cover.append(mark, copy, status);

        const body = document.createElement("div");
        body.className = "shop-card-body";

        const nameRow = document.createElement("div");
        nameRow.className = "shop-name-row";
        const name = document.createElement("h3");
        name.textContent = shop.name;
        const demo = document.createElement("span");
        demo.className = "demo-label";
        demo.textContent = "ПРЕДПРОСМОТР";
        nameRow.append(name, demo);

        const address = document.createElement("p");
        address.className = "shop-address";
        const addressIcon = document.createElement("span");
        addressIcon.textContent = "⌁";
        const addressText = document.createElement("span");
        addressText.textContent = shop.address || "Поддомен не указан";
        address.append(addressIcon, addressText);

        const actions = document.createElement("div");
        actions.className = "shop-actions";

        const openButton = document.createElement("button");
        openButton.className = "shop-open-button";
        openButton.type = "button";
        const openLabel = document.createElement("span");
        openLabel.textContent = "↗";
        openButton.append(document.createTextNode("Открыть"), openLabel);
        openButton.addEventListener("click", () => {
            window.location.assign(`./shop-dashboard.html?id=${encodeURIComponent(shop.id)}`);
        });

        const settingsButton = document.createElement("button");
        settingsButton.className = "shop-edit-button";
        settingsButton.type = "button";
        const settingsLabel = document.createElement("span");
        settingsLabel.textContent = "⚙";
        settingsButton.append(document.createTextNode("Настроить"), settingsLabel);
        settingsButton.addEventListener("click", () => {
            openShopSettings(shop);
        });

        actions.append(openButton, settingsButton);
        body.append(nameRow, address, actions);
        card.append(cover, body);
        return card;
    }

    function renderShops() {
        const shops = readShops();
        shopList.replaceChildren(...shops.map(makeShopCard));
        shopCount.textContent = String(shops.length);
        const lastTwoDigits = shops.length % 100;
        const lastDigit = shops.length % 10;
        shopCountLabel.textContent = lastTwoDigits >= 11 && lastTwoDigits <= 14
            ? "МАГАЗИНОВ"
            : lastDigit === 1
                ? "МАГАЗИН"
                : lastDigit >= 2 && lastDigit <= 4
                    ? "МАГАЗИНА"
                    : "МАГАЗИНОВ";
        emptyState.hidden = shops.length !== 0;
        shopList.hidden = shops.length === 0;
    }

    function openShopSettings(shop) {
        activeShopId = shop.id;
        editNameInput.value = shop.name;
        editAddressInput.value = shop.address;
        editFeedback.hidden = true;
        shopDialog.showModal();
        editNameInput.focus();
    }

    function saveShopChanges(event) {
        event.preventDefault();
        editFeedback.hidden = true;

        if (!editForm.reportValidity()) {
            return;
        }

        try {
            const shops = readShops();
            const shop = shops.find(item => item.id === activeShopId);
            if (!shop) {
                editFeedback.textContent = "Не удалось найти этот магазин. Закрой окно и обнови список.";
                editFeedback.hidden = false;
                return;
            }

            const name = editNameInput.value.trim();
            if (name.length < 2) {
                editFeedback.textContent = "Название магазина должно содержать минимум два символа.";
                editFeedback.hidden = false;
                return;
            }

            shop.name = name;
            shop.address = editAddressInput.value.trim();
            window.sdonateShopStorage.save(shops);
            renderShops();
            shopDialog.close();
            showToast("Демо-магазин обновлён.");
        } catch (error) {
            editFeedback.textContent = `Не удалось сохранить изменения: ${error.message}`;
            editFeedback.hidden = false;
        }
    }

    function openDeleteConfirmation() {
        try {
            const shop = readShops().find(item => item.id === activeShopId);
            if (!shop) {
                editFeedback.textContent = "Не удалось найти этот магазин в списке.";
                editFeedback.hidden = false;
                return;
            }
            deleteShopName.textContent = shop.name;
            shopDialog.close();
            deleteDialog.showModal();
        } catch (error) {
            editFeedback.textContent = `Не удалось загрузить магазин: ${error.message}`;
            editFeedback.hidden = false;
        }
    }

    function deleteActiveShop() {
        try {
            const shops = readShops();
            const remainingShops = shops.filter(shop => shop.id !== activeShopId);
            if (remainingShops.length === shops.length) {
                deleteDialog.close();
                showToast("Магазин не найден: список мог измениться.");
                return;
            }

            window.sdonateShopStorage.save(remainingShops);
            renderShops();
            deleteDialog.close();
            activeShopId = null;
            showToast("Демо-магазин удалён.");
        } catch (error) {
            showToast(`Не удалось удалить магазин: ${error.message}`);
        }
    }

    editForm.addEventListener("submit", saveShopChanges);
    document.querySelector("#shop-dialog-close").addEventListener("click", () => shopDialog.close());
    document.querySelector("#shop-edit-cancel").addEventListener("click", () => shopDialog.close());
    document.querySelector("#delete-shop").addEventListener("click", openDeleteConfirmation);
    document.querySelector("#delete-cancel").addEventListener("click", () => {
        deleteDialog.close();
        shopDialog.showModal();
    });
    document.querySelector("#confirm-delete").addEventListener("click", deleteActiveShop);

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });

    try {
        renderShops();
    } catch (error) {
        shopList.hidden = true;
        emptyState.hidden = true;
        showToast(`Не удалось загрузить магазины: ${error.message}`);
    }
}
