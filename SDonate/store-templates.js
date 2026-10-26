if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const shopId = new URLSearchParams(window.location.search).get("id");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const templateGrid = document.querySelector("#templates-grid");
    const toast = document.querySelector("#templates-toast");
    const message = document.querySelector("#templates-message");
    const previewDialog = document.querySelector("#template-preview-dialog");
    const purchaseDialog = document.querySelector("#template-purchase-dialog");
    const previewLarge = document.querySelector("#preview-large");
    const previewTitle = document.querySelector("#preview-title");
    const previewDescription = document.querySelector("#preview-description");
    const previewApply = document.querySelector("#preview-apply");
    const purchaseTitle = document.querySelector("#purchase-title");
    const purchaseDescription = document.querySelector("#purchase-description");
    const logoutButton = document.querySelector("#logout-button");
    const templates = [
        { id: "nexium-light", title: "Nexium Light", family: "nexium", theme: "light", paid: false, description: "Минималистичный и светлый дизайн с акцентом на простоту и удобство." },
        { id: "nexium-dark", title: "Nexium Dark", family: "nexium", theme: "dark", paid: false, description: "Стильный тёмный вариант для современных и технологичных проектов." },
        { id: "orvion-light", title: "Orvion Light", family: "orvion", theme: "light", paid: true, price: "399 ₽", description: "Яркий и чистый макет с просторной компоновкой и лёгкой атмосферой." },
        { id: "orvion-dark", title: "Orvion Dark", family: "orvion", theme: "dark", paid: true, price: "399 ₽", description: "Элегантный тёмный стиль с акцентом на визуальный контент." },
        { id: "lumix-light", title: "Lumix Light", family: "lumix", theme: "light", paid: false, description: "Воздушный и лёгкий дизайн с мягкими переходами и нежными акцентами." },
        { id: "lumix-dark", title: "Lumix Dark", family: "lumix", theme: "dark", paid: false, description: "Уютный тёмный стиль с плавными градиентами и мягким освещением." },
        { id: "arcane-light", title: "Arcane Light", family: "arcane", theme: "light", paid: false, description: "Светлый премиальный дизайн с магической атмосферой и аккуратной компоновкой." },
        { id: "arcane-dark", title: "Arcane Dark", family: "arcane", theme: "dark", paid: false, description: "Тёмный выразительный дизайн с глубокими оттенками и атмосферными деталями." },
        { id: "ender-rift", title: "Разлом Эндера", family: "ender", theme: "dark", paid: false, description: "Космический фиолетовый стиль с порталом и свечением Энда." },
        { id: "nether-forge", title: "Кузня Незера", family: "nether", theme: "dark", paid: false, description: "Тёплые оттенки лавы и золота для сурового игрового мира." },
        { id: "deep-ocean", title: "Глубины океана", family: "ocean", theme: "dark", paid: false, description: "Холодная морская палитра, мягкое сияние и волны." },
        { id: "emerald-grove", title: "Изумрудный лес", family: "forest", theme: "dark", paid: false, description: "Спокойный природный дизайн с зелёным свечением и текстурой листвы." }
    ];
    let shop;
    let toastTimer;
    let selectedTemplate;

    document.querySelector("#account-name").textContent = nickname;
    document.querySelector("#account-avatar").textContent = Array.from(nickname)[0].toUpperCase();

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            throw new Error("Список магазинов не найден.");
        }
        const shops = JSON.parse(stored);
        if (!Array.isArray(shops) || shops.some(item =>
            !item ||
            typeof item.id !== "string" ||
            typeof item.name !== "string" ||
            typeof item.address !== "string"
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

    function createPreviewArt(template) {
        const art = document.createElement("div");
        art.className = `template-art ${template.family}`;
        const overlay = document.createElement("div");
        overlay.className = "template-overlay";
        art.append(overlay);
        return art;
    }

    function applyTemplate(template) {
        if (template.paid) {
            purchaseTitle.textContent = `Шаблон ${template.title} · ${template.price}`;
            purchaseDescription.textContent = "Этот шаблон платный. В демо-режиме оплата не подключена, поэтому купить и применить его нельзя.";
            purchaseDialog.showModal();
            return;
        }

        try {
            const shops = readShops();
            const currentShop = shops.find(item => item.id === shopId);
            if (!currentShop) {
                throw new Error("Магазин не найден.");
            }
            currentShop.templateId = template.id;
            currentShop.templateName = template.title;
            window.sdonateShopStorage.save(shops);
            shop = currentShop;
            renderTemplates();
            message.textContent = `Шаблон «${template.title}» выбран для демо-магазина. Опубликованный сайт не изменён.`;
            message.hidden = false;
        } catch (error) {
            showToast(`Не удалось применить шаблон: ${error.message}`);
        }
    }

    function openPreview(template) {
        selectedTemplate = template;
        previewLarge.replaceChildren(createPreviewArt(template));
        previewLarge.className = `preview-large theme-${template.theme}`;
        previewTitle.textContent = template.title;
        previewDescription.textContent = template.description;
        previewApply.textContent = template.paid ? `Купить · ${template.price}` : "Применить шаблон";
        previewDialog.showModal();
    }

    function makeTemplateCard(template) {
        const card = document.createElement("article");
        card.className = `template-card theme-${template.theme}${shop.templateId === template.id ? " is-active" : ""}`;
        card.append(createPreviewArt(template));

        const content = document.createElement("div");
        content.className = "template-content";
        const titleRow = document.createElement("div");
        titleRow.className = "template-title-row";
        const title = document.createElement("h2");
        title.textContent = template.title;
        titleRow.append(title);

        if (template.paid) {
            const price = document.createElement("span");
            price.className = "template-price";
            price.textContent = template.price;
            titleRow.append(price);
        } else if (shop.templateId === template.id) {
            const active = document.createElement("span");
            active.className = "template-free-badge";
            active.textContent = "ВЫБРАН";
            titleRow.append(active);
        }

        const description = document.createElement("p");
        description.textContent = template.description;
        const actions = document.createElement("div");
        actions.className = "template-actions";

        const applyButton = document.createElement("button");
        applyButton.className = "template-action-button";
        applyButton.type = "button";
        applyButton.disabled = !template.paid && shop.templateId === template.id;
        applyButton.textContent = template.paid
            ? `₽ ${template.price}`
            : shop.templateId === template.id
                ? "✓ Применено"
                : "→ Применить";
        applyButton.addEventListener("click", () => applyTemplate(template));

        const previewButton = document.createElement("button");
        previewButton.className = "template-secondary-button";
        previewButton.type = "button";
        previewButton.textContent = "◉ Превью";
        previewButton.addEventListener("click", () => openPreview(template));

        actions.append(applyButton, previewButton);
        content.append(titleRow, description, actions);
        card.append(content);
        return card;
    }

    function renderTemplates() {
        templateGrid.replaceChildren(...templates.map(makeTemplateCard));
    }

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
        const settingsUrl = `./store-settings.html?id=${encodeURIComponent(shop.id)}`;
        document.querySelector("#back-to-settings").href = settingsUrl;
        document.querySelector("#templates-back-button").href = settingsUrl;
        document.title = `Шаблоны: ${shop.name} — SDonate`;
        renderTemplates();

        previewApply.addEventListener("click", () => {
            if (selectedTemplate) {
                previewDialog.close();
                applyTemplate(selectedTemplate);
            }
        });

        document.querySelector("#preview-close").addEventListener("click", () => previewDialog.close());
        document.querySelector("#purchase-cancel").addEventListener("click", () => purchaseDialog.close());
        document.querySelector("#purchase-confirm").addEventListener("click", () => {
            purchaseDialog.close();
            showToast("Оплата недоступна в демо-режиме.");
        });

        logoutButton.addEventListener("click", () => {
            sessionStorage.removeItem("sdonate-demo-authenticated");
            window.location.assign("./reg.html?mode=login");
        });
    }
}
