if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const shopId = new URLSearchParams(window.location.search).get("id");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const headingName = document.querySelector("#settings-shop-name-heading");
    const nameInput = document.querySelector("#store-name-input");
    const payoutSelect = document.querySelector("#payout-method");
    const domainsList = document.querySelector("#domains-list");
    const commissionSlider = document.querySelector("#commission-slider");
    const userCommission = document.querySelector("#user-commission");
    const storeCommission = document.querySelector("#store-commission");
    const form = document.querySelector("#store-settings-form");
    const message = document.querySelector("#settings-message");
    const toast = document.querySelector("#settings-toast");
    const addDomainDialog = document.querySelector("#add-domain-dialog");
    const addDomainForm = document.querySelector("#add-domain-form");
    const newDomainInput = document.querySelector("#new-domain");
    const domainConnectionType = document.querySelector("#domain-connection-type");
    const domainDnsTable = document.querySelector("#domain-dns-table");
    const domainDnsNote = document.querySelector("#domain-dns-note");
    const domainInputLabel = document.querySelector("#domain-input-label");
    const domainFeedback = document.querySelector("#domain-dialog-feedback");
    const domainDialogTitle = document.querySelector("#domain-dialog-title");
    const domainDialogDescription = document.querySelector("#domain-dialog-description");
    const domainDialogSubmit = document.querySelector("#domain-dialog-submit");
    const deleteDialog = document.querySelector("#delete-store-dialog");
    const confirmStoreName = document.querySelector("#confirm-store-name");
    const logoutButton = document.querySelector("#logout-button");
    let domains = [];
    let editingDomainIndex = null;
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

    function showMessage(text, isError) {
        message.textContent = text;
        message.classList.toggle("error-message", isError);
        message.hidden = false;
    }

    function normalizeDomain(value) {
        return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    }

    function isValidDomain(value) {
        if (value.length > 253 || value.includes("..")) {
            return false;
        }
        const labels = value.split(".");
        return labels.length >= 2 && labels.every(label =>
            label.length >= 1 &&
            label.length <= 63 &&
            /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
        );
    }

    function renderDomains() {
        domainsList.replaceChildren();
        domains.forEach((domain, index) => {
            const row = document.createElement("div");
            row.className = "domain-row";
            const value = document.createElement("span");
            value.className = "domain-value";
            value.textContent = domain;
            row.append(value);

            const editButton = document.createElement("button");
            editButton.className = "domain-edit-button";
            editButton.type = "button";
            editButton.setAttribute("aria-label", `Изменить домен ${domain}`);
            editButton.textContent = "✎";
            editButton.addEventListener("click", () => openDomainDialog(index));
            row.append(editButton);

            if (index === 0) {
                const primaryBadge = document.createElement("span");
                primaryBadge.className = "domain-primary-badge";
                primaryBadge.textContent = "ОСНОВНОЙ";
                row.append(primaryBadge);
            } else {
                const removeButton = document.createElement("button");
                removeButton.className = "domain-remove-button";
                removeButton.type = "button";
                removeButton.setAttribute("aria-label", `Удалить домен ${domain}`);
                removeButton.textContent = "×";
                removeButton.addEventListener("click", () => {
                    domains = domains.filter((_, domainIndex) => domainIndex !== index);
                    renderDomains();
                    showToast("Домен удалён из черновика. Нажми «Сохранить», чтобы применить изменения.");
                });
                row.append(removeButton);
            }

            domainsList.append(row);
        });
    }

    function updateCommissionLabels() {
        const share = Number(commissionSlider.value);
        storeCommission.textContent = String(share);
        userCommission.textContent = String(100 - share);
    }

    function openDomainDialog(index) {
        editingDomainIndex = Number.isInteger(index) ? index : null;
        domainDialogTitle.textContent = editingDomainIndex === null ? "Добавить домен" : "Изменить домен";
        domainDialogDescription.textContent = editingDomainIndex === null
            ? "Подключи собственный адрес к магазину. Настрой DNS у регистратора домена."
            : "Измени адрес магазина. Настройка DNS и проверка подключения доступны только после запуска сервиса.";
        domainDialogSubmit.textContent = editingDomainIndex === null ? "Добавить домен" : "Сохранить домен";
        newDomainInput.value = editingDomainIndex === null ? "" : domains[editingDomainIndex];
        domainConnectionType.value = "domain";
        updateDomainDnsGuide();
        domainFeedback.hidden = true;
        addDomainDialog.showModal();
        newDomainInput.focus();
    }

    function updateDomainDnsGuide() {
        const isSubdomain = domainConnectionType.value === "subdomain";
        const records = isSubdomain
            ? [
                { type: "CNAME", name: "shop", value: "your-store.sdonate.store" }
            ]
            : [
                { type: "CNAME", name: "www", value: "your-store.sdonate.store" },
                { type: "A", name: "@", value: "203.0.113.10" }
            ];
        domainInputLabel.textContent = isSubdomain ? "Поддомен" : "Домен";
        newDomainInput.placeholder = isSubdomain ? "shop.domain.com" : "domain.com";
        domainDnsTable.replaceChildren();
        records.forEach(record => {
            const row = document.createElement("div");
            row.className = "domain-dns-row";
            [record.type, record.name, record.value, "DNS only"].forEach((text, index) => {
                const cell = document.createElement("span");
                cell.className = index === 0 ? "domain-dns-type" : "";
                cell.textContent = text;
                row.append(cell);
            });
            domainDnsTable.append(row);
        });
        domainDnsNote.textContent = isSubdomain
            ? "Если провайдер не поддерживает CNAME для выбранного имени, проверьте его инструкцию."
            : "Если домен не поддерживает CNAME для корня, используйте A-запись.";
    }

    let shops;
    let shop;
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
        domains = Array.isArray(shop.domains) && shop.domains.length
            ? shop.domains.filter(domain => typeof domain === "string")
            : shop.address
                ? [shop.address]
                : [];

        nameInput.value = shop.name;
        const payoutMethod = shop.payoutMethod === "Плагин MyPayments"
            ? "Плагин SdPlayments"
            : shop.payoutMethod;
        payoutSelect.value = ["RCON", "Webhook", "Вручную", "Плагин SdPlayments"].includes(payoutMethod)
            ? payoutMethod
            : "RCON";
        commissionSlider.value = String(Number.isInteger(shop.commissionShare)
            ? Math.max(0, Math.min(100, shop.commissionShare))
            : 5);
        headingName.textContent = shop.name;
        confirmStoreName.textContent = shop.name;
        renderDomains();
        updateCommissionLabels();
        document.title = `Настройки: ${shop.name} — SDonate`;

        document.querySelector("#back-to-store").href = `./shop-dashboard.html?id=${encodeURIComponent(shop.id)}`;
        document.querySelector("#settings-back-button").href = `./shop-dashboard.html?id=${encodeURIComponent(shop.id)}`;

        commissionSlider.addEventListener("input", updateCommissionLabels);

        document.querySelector("#add-domain").addEventListener("click", () => {
            openDomainDialog(null);
        });

        document.querySelector("#cancel-add-domain").addEventListener("click", () => addDomainDialog.close());
        domainConnectionType.addEventListener("change", updateDomainDnsGuide);

        addDomainForm.addEventListener("submit", event => {
            event.preventDefault();
            const domain = normalizeDomain(newDomainInput.value);
            if (!isValidDomain(domain)) {
                domainFeedback.textContent = "Введи корректный домен, например shop.example.com.";
                domainFeedback.hidden = false;
                newDomainInput.focus();
                return;
            }
            if (domains.some((item, index) =>
                index !== editingDomainIndex && item.toLowerCase() === domain
            )) {
                domainFeedback.textContent = "Этот домен уже есть в списке.";
                domainFeedback.hidden = false;
                newDomainInput.focus();
                return;
            }

            if (editingDomainIndex === null) {
                domains.push(domain);
            } else {
                domains[editingDomainIndex] = domain;
            }
            editingDomainIndex = null;
            renderDomains();
            addDomainDialog.close();
            showToast("Домен обновлён в черновике. Нажми «Сохранить», чтобы применить изменения.");
        });

        form.addEventListener("submit", event => {
            event.preventDefault();
            message.hidden = true;
            if (!form.reportValidity()) {
                return;
            }

            const name = nameInput.value.trim();
            if (name.length < 2) {
                showMessage("Название магазина должно содержать минимум два символа.", true);
                nameInput.focus();
                return;
            }

            try {
                shops = readShops();
                const currentShop = shops.find(item => item.id === shopId);
                if (!currentShop) {
                    throw new Error("Магазин не найден.");
                }
                currentShop.name = name;
                currentShop.address = domains[0] || "";
                currentShop.domains = [...domains];
                currentShop.payoutMethod = payoutSelect.value;
                currentShop.commissionShare = Number(commissionSlider.value);
                window.sdonateShopStorage.save(shops);

                shop = currentShop;
                headingName.textContent = name;
                confirmStoreName.textContent = name;
                document.title = `Настройки: ${name} — SDonate`;
                showMessage("Настройки демо-магазина сохранены в этой вкладке.", false);
            } catch (error) {
                showMessage(`Не удалось сохранить настройки: ${error.message}`, true);
            }
        });

        document.querySelectorAll("[data-demo-tool]").forEach(button => {
            button.addEventListener("click", () => {
                if (button.dataset.demoTool === "Картинки") {
                    window.location.assign(`./store-images.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.demoTool === "Шаблон") {
                    window.location.assign(`./store-templates.html?id=${encodeURIComponent(shop.id)}`);
                    return;
                }
                if (button.dataset.demoTool === "Ссылки" || button.dataset.demoTool === "Кастомизация") {
                    const tool = button.dataset.demoTool === "Ссылки" ? "links" : "customization";
                    window.location.assign(`./store-tools.html?id=${encodeURIComponent(shop.id)}&tool=${tool}`);
                    return;
                }
                showToast(`«${button.dataset.demoTool}» пока доступно только как демонстрация.`);
            });
        });

        document.querySelector("#delete-store").addEventListener("click", () => {
            confirmStoreName.textContent = shop.name;
            deleteDialog.showModal();
        });

        document.querySelector("#cancel-delete").addEventListener("click", () => deleteDialog.close());

        document.querySelector("#confirm-delete").addEventListener("click", () => {
            try {
                shops = readShops();
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

        logoutButton.addEventListener("click", () => {
            sessionStorage.removeItem("sdonate-demo-authenticated");
            window.location.assign("./reg.html?mode=login");
        });
    }
}
