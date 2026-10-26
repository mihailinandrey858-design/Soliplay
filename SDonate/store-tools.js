if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const parameters = new URLSearchParams(window.location.search);
    const shopId = parameters.get("id");
    const tool = parameters.get("tool");
    if (tool === "coupons") {
        window.location.replace(`./coupons.html?id=${encodeURIComponent(shopId || "")}`);
    }
    if (tool === "pages") {
        window.location.replace(`./store-pages.html?id=${encodeURIComponent(shopId || "")}`);
    }
    const configurations = {
        servers: {
            title: "Серверы",
            description: "Добавляй игровые серверы в список своего магазина.",
            first: { label: "Название сервера", placeholder: "Например, Survival" },
            second: { label: "Адрес сервера", placeholder: "play.example.com" }
        },
        coupons: {
            title: "Купоны",
            description: "Создавай демонстрационные промокоды и скидки.",
            first: { label: "Промокод", placeholder: "WELCOME" },
            second: { label: "Скидка (%)", placeholder: "10", type: "number", min: "1", max: "100" }
        },
        partners: {
            title: "Партнёры",
            description: "Сохраняй контакты и ссылки партнёров магазина.",
            first: { label: "Имя партнёра", placeholder: "Например, Minecraft блогер" },
            second: { label: "Ссылка или контакт", placeholder: "https://example.com" }
        },
        waits: {
            title: "Массовые ожидания",
            description: "Веди локальные черновые заметки о выдаче заказов.",
            first: { label: "Ник игрока", placeholder: "Player123" },
            second: { label: "Заметка о заказе", placeholder: "VIP на 30 дней" }
        },
        collections: {
            title: "Подборки",
            description: "Группируй товары в демонстрационные подборки.",
            first: { label: "Название подборки", placeholder: "Популярное" },
            second: { label: "Описание", placeholder: "Краткое описание подборки" }
        },
        pages: {
            title: "Страницы",
            description: "Создавай черновые информационные страницы магазина.",
            first: { label: "Заголовок страницы", placeholder: "О сервере" },
            second: { label: "Текст страницы", placeholder: "Добавь описание сервера", multiline: true }
        },
        links: {
            title: "Ссылки",
            description: "Управляй ссылками на социальные сети в своём магазине.",
            links: true
        },
        plugins: {
            title: "Плагины",
            description: "Управляй настройками и демо-плагинами своего магазина.",
            plugins: true
        },
        customization: {
            title: "Кастомизация",
            description: "Настрой заголовок, цветовую палитру и элементы будущей витрины магазина.",
            customization: true
        },
        analytics: {
            title: "Аналитика",
            description: "Просматривай демонстрационные показатели магазина. Реальные посещения пока не собираются.",
            analytics: true
        }
    };
    const config = configurations[tool];
    const title = document.querySelector("#tool-title");
    const description = document.querySelector("#tool-description");
    const form = document.querySelector("#tool-form");
    const fields = document.querySelector("#tool-fields");
    const feedback = document.querySelector("#tool-feedback");
    const list = document.querySelector("#tool-record-list");
    const empty = document.querySelector("#tool-empty");
    const count = document.querySelector("#tool-record-count");
    const toast = document.querySelector("#tool-toast");
    const accountName = document.querySelector("#account-name");
    const logoutButton = document.querySelector("#logout-button");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    let shops;
    let shop;
    let toastTimer;

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            throw new Error("Список магазинов не найден.");
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.some(item =>
            !item || typeof item.id !== "string" || typeof item.name !== "string"
        )) {
            throw new Error("Список магазинов имеет неверный формат.");
        }
        return parsed;
    }

    function persistShop() {
        shops = readShops();
        const currentShop = shops.find(item => item.id === shopId);
        if (!currentShop) {
            throw new Error("Магазин не найден.");
        }
        currentShop.tools = shop.tools || {};
        currentShop.customization = shop.customization || {};
        currentShop.socialLinks = shop.socialLinks || {};
        currentShop.pluginSettings = shop.pluginSettings || {};
        shops[shops.findIndex(item => item.id === shopId)] = currentShop;
        shop = currentShop;
        window.sdonateShopStorage.save(shops);
    }

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3200);
    }

    function makeField(field, index) {
        const label = document.createElement("label");
        label.className = "tool-field";
        label.textContent = field.label;
        const input = document.createElement(field.multiline ? "textarea" : "input");
        input.name = index === 0 ? "name" : "detail";
        input.placeholder = field.placeholder;
        input.required = true;
        if (field.type) {
            input.type = field.type;
        }
        if (field.min) {
            input.min = field.min;
        }
        if (field.max) {
            input.max = field.max;
        }
        label.append(input);
        fields.append(label);
    }

    function renderRecords() {
        list.replaceChildren();
        const records = Array.isArray(shop.tools && shop.tools[tool]) ? shop.tools[tool] : [];
        records.forEach(record => {
            const row = document.createElement("article");
            row.className = "tool-record";
            const copy = document.createElement("div");
            copy.className = "tool-record-copy";
            const name = document.createElement("b");
            name.textContent = record.name;
            const detail = document.createElement("span");
            detail.textContent = record.detail;
            copy.append(name, detail);

            const remove = document.createElement("button");
            remove.className = "tool-remove-button";
            remove.type = "button";
            remove.textContent = "Удалить";
            remove.setAttribute("aria-label", `Удалить: ${record.name}`);
            remove.addEventListener("click", () => {
                try {
                    shop.tools[tool] = shop.tools[tool].filter(item => item.id !== record.id);
                    persistShop();
                    renderRecords();
                } catch (error) {
                    showToast(`Не удалось удалить запись: ${error.message}`);
                }
            });
            row.append(copy, remove);
            list.append(row);
        });
        count.textContent = String(records.length);
        empty.hidden = records.length !== 0;
    }

    accountName.textContent = nickname;
    document.querySelector("#account-avatar").textContent = Array.from(nickname)[0].toUpperCase();

    try {
        shops = readShops();
        shop = shops.find(item => item.id === shopId);
        if (!shop) {
            throw new Error("Магазин не найден.");
        }
        if (!config) {
            throw new Error("Неизвестный раздел управления.");
        }
        shop.tools = shop.tools && typeof shop.tools === "object" ? shop.tools : {};
        title.textContent = config.title;
        description.textContent = config.description;
        document.title = `${config.title}: ${shop.name} — SDonate`;
        document.querySelector("#back-to-shop").href = `./shop-dashboard.html?id=${encodeURIComponent(shop.id)}`;
        document.querySelector("#back-to-settings").href = `./store-settings.html?id=${encodeURIComponent(shop.id)}`;
        if (tool === "plugins") {
            const serverEntry = document.querySelector("#plugin-server-entry");
            serverEntry.hidden = false;
            document.querySelector("#open-servers").href = `./servers.html?id=${encodeURIComponent(shop.id)}`;
            document.querySelector("#plugin-servers-link").href = `./servers.html?id=${encodeURIComponent(shop.id)}`;
            document.querySelector("#plugin-payout-link").href = `./store-settings.html?id=${encodeURIComponent(shop.id)}`;
            document.querySelector("#tool-editor-panel").hidden = true;
            document.querySelector("#tool-records-panel").hidden = true;
            const pluginDashboard = document.querySelector("#plugin-dashboard");
            pluginDashboard.hidden = false;
            description.textContent = "Управляй настройками и демо-плагинами своего магазина.";

            const defaultPluginSettings = {
                weather: "autumn",
                recentPurchases: true,
                translations: true,
                pageEditor: false,
                cart: true,
                gifts: true,
                currencySlider: false
            };
            shop.pluginSettings = shop.pluginSettings && typeof shop.pluginSettings === "object"
                ? { ...defaultPluginSettings, ...shop.pluginSettings }
                : { ...defaultPluginSettings };

            const updatePluginStatus = (setting, value) => {
                const status = pluginDashboard.querySelector(`[data-plugin-status="${setting}"]`);
                if (status) {
                    status.textContent = value ? "Включено в демо-режиме" : "Выключено";
                }
            };

            pluginDashboard.querySelectorAll("[data-plugin-setting]").forEach(control => {
                const setting = control.dataset.pluginSetting;
                if (control instanceof HTMLSelectElement) {
                    const weatherOptions = ["none", "spring", "summer", "autumn", "winter"];
                    const selectedWeather = shop.pluginSettings[setting];
                    control.value = weatherOptions.includes(selectedWeather)
                        ? selectedWeather
                        : defaultPluginSettings[setting];
                    shop.pluginSettings[setting] = control.value;
                } else if (control instanceof HTMLInputElement) {
                    control.checked = shop.pluginSettings[setting] === true;
                    updatePluginStatus(setting, control.checked);
                }

                control.addEventListener("change", () => {
                    const previousValue = shop.pluginSettings[setting];
                    const value = control instanceof HTMLSelectElement ? control.value : control.checked;
                    shop.pluginSettings[setting] = value;
                    try {
                        persistShop();
                        updatePluginStatus(setting, Boolean(value));
                        showToast("Демо-настройка сохранена для этого магазина.");
                    } catch (error) {
                        shop.pluginSettings[setting] = previousValue;
                        if (control instanceof HTMLSelectElement) {
                            control.value = previousValue;
                        } else {
                            control.checked = previousValue === true;
                            updatePluginStatus(setting, control.checked);
                        }
                        showToast(`Не удалось сохранить настройку: ${error.message}`);
                    }
                });
            });

            const pluginActionMessages = {
                weather: "Дополнительные настройки погоды пока недоступны в демо-режиме.",
                notification: "Создание уведомлений пока недоступно в демо-режиме.",
                "gift-rewards": "Настройка наград пока не подключена.",
                "gift-log": "Журнал подарков пока не подключён."
            };
            pluginDashboard.querySelectorAll("[data-plugin-action]").forEach(button => {
                button.addEventListener("click", () => {
                    showToast(pluginActionMessages[button.dataset.pluginAction]);
                });
            });
        }
        document.querySelector("#tool-form-title").textContent = config.analytics ? "Демо-показатели" : "Добавить запись";
        document.querySelector("#tool-list-title").textContent = config.analytics ? "Пример статистики" : "Сохранённые записи";
        document.querySelector("#tool-list-description").textContent = config.analytics
            ? "Эти значения приведены только для демонстрации интерфейса."
            : `Записи для магазина «${shop.name}».`;

        if (config.links) {
            document.querySelector("#tool-editor-panel").hidden = true;
            document.querySelector("#tool-records-panel").hidden = true;
            const linksPanel = document.querySelector("#social-links-panel");
            const linksForm = document.querySelector("#social-links-form");
            const linksFeedback = document.querySelector("#social-links-feedback");
            const fieldsByName = new Map(Array.from(linksForm.querySelectorAll("input[name]"), input => [input.name, input]));
            const storedLinks = shop.socialLinks && typeof shop.socialLinks === "object"
                ? shop.socialLinks
                : {};

            if (!Object.keys(storedLinks).length && Array.isArray(shop.tools.links)) {
                const aliases = new Map([
                    ["telegram", "telegram"], ["телеграм", "telegram"],
                    ["youtube", "youtube"], ["ютуб", "youtube"],
                    ["vk", "vk"], ["вк", "vk"],
                    ["twitch", "twitch"], ["discord", "discord"],
                    ["tiktok", "tiktok"], ["тикток", "tiktok"]
                ]);
                shop.tools.links.forEach(record => {
                    const name = typeof record.name === "string" ? aliases.get(record.name.trim().toLowerCase()) : null;
                    if (name && typeof record.detail === "string" && !storedLinks[name]) {
                        storedLinks[name] = record.detail;
                    }
                });
            }

            Object.entries(storedLinks).forEach(([name, value]) => {
                const field = fieldsByName.get(name);
                if (field && typeof value === "string") {
                    field.value = value;
                }
            });
            linksPanel.hidden = false;
            linksForm.addEventListener("submit", event => {
                event.preventDefault();
                linksFeedback.hidden = true;
                if (!linksForm.reportValidity()) {
                    return;
                }

                const links = {};
                for (const [name, field] of fieldsByName) {
                    const value = field.value.trim();
                    if (!value) {
                        continue;
                    }
                    try {
                        const url = new URL(value);
                        if (!["http:", "https:"].includes(url.protocol)) {
                            throw new Error();
                        }
                        links[name] = url.href;
                    } catch {
                        linksFeedback.textContent = `Проверь ссылку для поля «${field.closest(".social-link-field").firstElementChild.textContent}».`;
                        linksFeedback.hidden = false;
                        field.focus();
                        return;
                    }
                }

                try {
                    shop.socialLinks = links;
                    persistShop();
                    showToast("Ссылки сохранены в настройках демо-магазина.");
                } catch (error) {
                    linksFeedback.textContent = `Не удалось сохранить ссылки: ${error.message}`;
                    linksFeedback.hidden = false;
                }
            });
        } else if (config.customization) {
            const editorPanel = document.querySelector("#tool-editor-panel");
            const recordsPanel = document.querySelector("#tool-records-panel");
            const customizationPanel = document.querySelector("#customization-panel");
            const customizationForm = document.querySelector("#customization-form");
            const customizationFeedback = document.querySelector("#customization-feedback");
            const colorSwatches = document.querySelector("#color-swatches");
            const preview = document.querySelector("#customization-preview");
            const previewTitle = document.querySelector("#preview-title");
            const previewDescription = document.querySelector("#preview-description");
            const previewAboutTitle = document.querySelector("#preview-about-title");
            const previewAboutDescription = document.querySelector("#preview-about-description");
            const previewAddress = document.querySelector("#preview-address");
            const previewOnline = document.querySelector("#preview-online");
            const imageInput = document.querySelector("#customization-image-input");
            const imageRemoveButton = document.querySelector("#customization-image-remove");
            const imageFilename = document.querySelector("#customization-image-filename");
            const imageFeedback = document.querySelector("#customization-image-feedback");
            const previewBackgroundImage = document.querySelector("#preview-background-image");
            const presetColors = [
                "#ff3b4e", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
                "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
                "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#64748b",
                "#475569", "#71717a", "#52525b", "#78716c"
            ];
            const stored = shop.customization && typeof shop.customization === "object"
                ? shop.customization
                : {};
            const initialColor = /^#[0-9a-f]{6}$/i.test(stored.accentColor || "")
                ? stored.accentColor
                : "#625be2";
            const controls = customizationForm.elements;
            let backgroundImage = typeof stored.backgroundImage === "string" &&
                stored.backgroundImage.startsWith("data:image/webp;base64,")
                ? stored.backgroundImage
                : "";
            const savedBackgroundKey = window.sdonateImageStorage.keyFromReference(stored.backgroundImage);

            async function compressBackgroundImage(file) {
                const imageUrl = URL.createObjectURL(file);
                const image = new Image();
                try {
                    await new Promise((resolve, reject) => {
                        image.addEventListener("load", resolve, { once: true });
                        image.addEventListener("error", () => reject(new Error("Не удалось открыть изображение.")), { once: true });
                        image.src = imageUrl;
                    });
                } finally {
                    URL.revokeObjectURL(imageUrl);
                }
                if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 40_000_000) {
                    throw new Error("У изображения слишком большое разрешение.");
                }

                const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
                const canvas = document.createElement("canvas");
                canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
                canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
                const context = canvas.getContext("2d");
                if (!context) {
                    throw new Error("Не удалось обработать изображение.");
                }
                context.drawImage(image, 0, 0, canvas.width, canvas.height);

                for (const quality of [0.84, 0.72, 0.6, 0.48, 0.36]) {
                    const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
                    if (!blob || blob.type !== "image/webp") {
                        throw new Error("Браузер не поддерживает сжатие изображения в WEBP.");
                    }
                    if (blob.size <= 900 * 1024) {
                        return await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.addEventListener("load", () => {
                                if (typeof reader.result === "string") {
                                    resolve(reader.result);
                                } else {
                                    reject(new Error("Не удалось сохранить обработанное изображение."));
                                }
                            }, { once: true });
                            reader.addEventListener("error", () => reject(new Error("Не удалось прочитать обработанное изображение.")), { once: true });
                            reader.readAsDataURL(blob);
                        });
                    }
                }
                throw new Error("Не удалось сжать фото до допустимого размера.");
            }

            editorPanel.hidden = true;
            recordsPanel.hidden = true;
            customizationPanel.hidden = false;
            const bannerCopy = document.querySelector(".demo-banner span:nth-child(2)");
            const bannerLabel = document.createElement("b");
            bannerLabel.textContent = "Демо-оформление";
            bannerCopy.replaceChildren(
                bannerLabel,
                document.createTextNode(" — настройки сохраняются в этом браузере и пока не публикуются на сайте магазина.")
            );
            document.querySelector("#tool-form-title").textContent = "Оформление витрины";

            controls.title.value = typeof stored.title === "string" ? stored.title : "Мы победители!";
            controls.description.value = typeof stored.description === "string" ? stored.description : "";
            controls.aboutTitle.value = typeof stored.aboutTitle === "string" ? stored.aboutTitle : "";
            controls.aboutDescription.value = typeof stored.aboutDescription === "string" ? stored.aboutDescription : "";
            controls.address.value = typeof stored.address === "string" ? stored.address : shop.address || "";
            controls.accentColor.value = initialColor;
            controls.accentHex.value = initialColor;
            controls.hideServers.checked = stored.hideServers === true;
            controls.hideOverallOnline.checked = stored.hideOverallOnline === true;
            controls.tintBackgrounds.checked = stored.tintBackgrounds === true;

            if (savedBackgroundKey) {
                window.sdonateImageStorage.get(savedBackgroundKey).then(image => {
                    if (!image) {
                        throw new Error("Фоновое изображение не найдено в хранилище.");
                    }
                    backgroundImage = image;
                    updatePreview();
                }).catch(error => {
                    imageFeedback.textContent = `Не удалось загрузить фоновое фото: ${error.message}`;
                    imageFeedback.hidden = false;
                });
            }

            presetColors.forEach(color => {
                const button = document.createElement("button");
                button.type = "button";
                button.className = "color-swatch";
                button.style.setProperty("--swatch-color", color);
                button.setAttribute("aria-label", `Выбрать цвет ${color}`);
                button.setAttribute("aria-pressed", String(color.toLowerCase() === initialColor.toLowerCase()));
                button.addEventListener("click", () => {
                    controls.accentColor.value = color;
                    controls.accentHex.value = color;
                    updatePreview();
                });
                colorSwatches.append(button);
            });

            function updatePreview() {
                const color = controls.accentColor.value;
                const titleText = controls.title.value.trim();
                const descriptionText = controls.description.value.trim();
                const aboutTitleText = controls.aboutTitle.value.trim();
                const aboutDescriptionText = controls.aboutDescription.value.trim();
                const addressText = controls.address.value.trim();
                const isHidden = controls.hideServers.checked;
                const tintBackgrounds = controls.tintBackgrounds.checked;

                controls.accentHex.value = color;
                preview.style.setProperty("--preview-accent", color);
                preview.classList.toggle("preview-tinted", tintBackgrounds);
                previewBackgroundImage.src = backgroundImage;
                previewBackgroundImage.hidden = !backgroundImage;
                imageRemoveButton.hidden = !backgroundImage;
                if (!backgroundImage) {
                    imageFilename.textContent = "Файл не выбран";
                } else if (!imageFilename.dataset.filename) {
                    imageFilename.textContent = "Фотография загружена";
                }
                previewTitle.textContent = titleText;
                previewTitle.hidden = !titleText;
                previewDescription.textContent = descriptionText;
                previewDescription.hidden = !descriptionText;
                previewAboutTitle.textContent = aboutTitleText || `Добро пожаловать на ${shop.name}`;
                previewAboutDescription.textContent = aboutDescriptionText || descriptionText || "Расскажи игрокам о своём сервере.";
                previewAddress.textContent = isHidden ? "" : addressText;
                previewAddress.hidden = isHidden || !addressText;
                previewOnline.hidden = controls.hideOverallOnline.checked;
                colorSwatches.querySelectorAll(".color-swatch").forEach(button => {
                    button.setAttribute(
                        "aria-pressed",
                        String(button.style.getPropertyValue("--swatch-color").toLowerCase() === color.toLowerCase())
                    );
                });
            }

            controls.accentColor.addEventListener("input", updatePreview);
            controls.accentHex.addEventListener("input", () => {
                const color = controls.accentHex.value.trim();
                if (/^#[0-9a-f]{6}$/i.test(color)) {
                    controls.accentColor.value = color;
                    updatePreview();
                }
            });
            customizationForm.addEventListener("input", updatePreview);
            customizationForm.addEventListener("change", updatePreview);
            imageInput.addEventListener("change", async () => {
                imageFeedback.hidden = true;
                const [file] = imageInput.files || [];
                if (!file) {
                    return;
                }
                if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                    imageFeedback.textContent = "Выбери изображение PNG, JPG или WEBP.";
                    imageFeedback.hidden = false;
                    imageInput.value = "";
                    return;
                }
                if (file.size > 10 * 1024 * 1024) {
                    imageFeedback.textContent = "Размер исходного изображения не должен превышать 10 МБ.";
                    imageFeedback.hidden = false;
                    imageInput.value = "";
                    return;
                }
                try {
                    backgroundImage = await compressBackgroundImage(file);
                    imageFilename.textContent = file.name;
                    imageFilename.dataset.filename = file.name;
                    imageInput.value = "";
                    updatePreview();
                } catch (error) {
                    imageFeedback.textContent = `Не удалось добавить фото: ${error.message}`;
                    imageFeedback.hidden = false;
                    imageInput.value = "";
                }
            });
            imageRemoveButton.addEventListener("click", () => {
                backgroundImage = "";
                imageInput.value = "";
                delete imageFilename.dataset.filename;
                imageFilename.textContent = "Файл не выбран";
                imageFeedback.hidden = true;
                updatePreview();
            });
            updatePreview();

            customizationForm.addEventListener("submit", async event => {
                event.preventDefault();
                customizationFeedback.hidden = true;
                if (!customizationForm.reportValidity()) {
                    return;
                }
                const color = controls.accentHex.value.trim();
                if (!/^#[0-9a-f]{6}$/i.test(color)) {
                    customizationFeedback.textContent = "Укажи цвет в формате HEX, например #625be2.";
                    customizationFeedback.hidden = false;
                    controls.accentHex.focus();
                    return;
                }
                let backgroundReference = "";
                let newBackgroundKey = null;
                try {
                    if (backgroundImage) {
                        if (window.sdonateImageStorage.keyFromReference(stored.backgroundImage) &&
                            backgroundImage === "") {
                            backgroundReference = stored.backgroundImage;
                        } else {
                            newBackgroundKey = window.sdonateImageStorage.createKey(shopId, "customization-background");
                            await window.sdonateImageStorage.set(newBackgroundKey, backgroundImage);
                            backgroundReference = window.sdonateImageStorage.reference(newBackgroundKey);
                        }
                    }
                    shop.customization = {
                        title: controls.title.value.trim(),
                        description: controls.description.value.trim(),
                        aboutTitle: controls.aboutTitle.value.trim(),
                        aboutDescription: controls.aboutDescription.value.trim(),
                        address: controls.address.value.trim(),
                        backgroundImage: backgroundReference,
                        accentColor: color,
                        hideServers: controls.hideServers.checked,
                        hideOverallOnline: controls.hideOverallOnline.checked,
                        tintBackgrounds: controls.tintBackgrounds.checked
                    };
                    persistShop();
                    const oldBackgroundKey = window.sdonateImageStorage.keyFromReference(stored.backgroundImage);
                    if (oldBackgroundKey && oldBackgroundKey !== newBackgroundKey) {
                        await window.sdonateImageStorage.delete([oldBackgroundKey]);
                    }
                    showToast("Оформление магазина сохранено в этом браузере.");
                } catch (error) {
                    let message = error.message;
                    if (newBackgroundKey) {
                        try {
                            await window.sdonateImageStorage.delete([newBackgroundKey]);
                        } catch (cleanupError) {
                            message += ` Не удалось очистить временное фото: ${cleanupError.message}`;
                        }
                    }
                    customizationFeedback.textContent = `Не удалось сохранить оформление: ${message}`;
                    customizationFeedback.hidden = false;
                }
            });
        } else if (config.analytics) {
            form.hidden = true;
            document.querySelector("#tool-editor-panel").hidden = true;
            document.querySelector("#tool-records-panel").hidden = true;
            document.querySelector("#analytics-dashboard").hidden = false;
            document.querySelector("#tool-description").textContent =
                "Пример недельной статистики магазина в виде столбчатых графиков.";
        } else if (!config.plugins) {
            makeField(config.first, 0);
            makeField(config.second, 1);
            renderRecords();
            form.addEventListener("submit", event => {
                event.preventDefault();
                feedback.hidden = true;
                if (!form.reportValidity()) {
                    return;
                }

                const name = form.elements.name.value.trim();
                const detail = form.elements.detail.value.trim();
                if (tool === "links") {
                    try {
                        const url = new URL(detail);
                        if (!["http:", "https:"].includes(url.protocol)) {
                            throw new Error("Используй ссылку, начинающуюся с http:// или https://.");
                        }
                    } catch (error) {
                        feedback.textContent = error.message || "Введи корректный адрес ссылки.";
                        feedback.hidden = false;
                        return;
                    }
                }

                try {
                    const records = Array.isArray(shop.tools[tool]) ? shop.tools[tool] : [];
                    shop.tools[tool] = [...records, {
                        id: globalThis.crypto && typeof globalThis.crypto.randomUUID === "function"
                            ? globalThis.crypto.randomUUID()
                            : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                        name,
                        detail
                    }];
                    persistShop();
                    form.reset();
                    renderRecords();
                    showToast("Демо-запись сохранена в этом магазине.");
                } catch (error) {
                    feedback.textContent = `Не удалось сохранить запись: ${error.message}`;
                    feedback.hidden = false;
                }
            });
        }
    } catch (error) {
        showToast(`Не удалось открыть раздел: ${error.message}`);
        window.setTimeout(() => window.location.replace("./shops.html"), 1800);
    }

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });
}
