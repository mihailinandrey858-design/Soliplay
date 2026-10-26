(() => {
    const authenticated = sessionStorage.getItem("sdonate-demo-authenticated") === "true";
    if (!authenticated) {
        window.location.replace("./reg.html?mode=login");
        return;
    }

    const storageKey = window.sdonateShopStorage.storageKey();
    const defaultCategories = ["Привилегии", "Валюта", "Кейсы", "Предметы", "Другое"];
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const shopName = document.querySelector("#products-shop-name");
    const backToShop = document.querySelector("#back-to-shop");
    const editor = document.querySelector("#product-editor");
    const form = document.querySelector("#product-form");
    const categoryTabs = document.querySelector("#category-tabs");
    const categoryInput = document.querySelector("#product-category");
    const serverOptions = document.querySelector("#server-options");
    const commandList = document.querySelector("#command-list");
    const imageInput = document.querySelector("#product-image-input");
    const imagePreview = document.querySelector("#product-image-preview");
    const imagePlaceholder = document.querySelector("#image-upload-placeholder");
    const removeImageButton = document.querySelector("#remove-product-image");
    const formMessage = document.querySelector("#product-form-message");
    const productsGrid = document.querySelector("#products-grid");
    const productsEmpty = document.querySelector("#products-empty");
    const productsCount = document.querySelector("#products-count");
    const searchInput = document.querySelector("#search-products");
    const deleteDialog = document.querySelector("#delete-product-dialog");
    const toast = document.querySelector("#products-toast");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
    backToShop.href = `./shop-dashboard.html?id=${encodeURIComponent(shopId || "")}`;

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

    let shops;
    let shop;
    try {
        shops = readShops();
        shop = shops.find(item => item.id === shopId);
        if (!shop) {
            throw new Error("Магазин не найден или уже удалён.");
        }
        if (shop.products !== undefined && (!Array.isArray(shop.products) || shop.products.some(product =>
            !product || typeof product.id !== "string" || typeof product.name !== "string"
        ))) {
            throw new Error("Список товаров магазина имеет неверный формат.");
        }
    } catch (error) {
        toast.textContent = `Не удалось открыть товары: ${error.message}`;
        toast.hidden = false;
        window.setTimeout(() => window.location.replace("./shops.html"), 2200);
        return;
    }

    shop.products = shop.products || [];
    shop.productCategories = Array.isArray(shop.productCategories) && shop.productCategories.every(category => typeof category === "string")
        ? [...new Set([...defaultCategories, ...shop.productCategories])]
        : [...defaultCategories];
    shopName.textContent = shop.name;
    document.title = `Товары — ${shop.name} — SDonate`;

    let selectedCategory = shop.productCategories[0];
    let editingProductId = null;
    let currentImage = "";
    let pendingDeleteId = null;
    let toastTimer;

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3200);
    }

    function saveShops() {
        try {
            window.sdonateShopStorage.save(shops);
        } catch (error) {
            throw new Error(`Не удалось сохранить изменения: ${error.message}`);
        }
    }

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function renderCategories() {
        categoryTabs.replaceChildren();
        shop.productCategories.forEach(category => {
            const button = document.createElement("button");
            button.className = `category-tab${category === selectedCategory ? " active" : ""}`;
            button.type = "button";
            button.textContent = category;
            button.setAttribute("aria-pressed", String(category === selectedCategory));
            button.addEventListener("click", () => {
                selectedCategory = category;
                categoryInput.value = category;
                renderCategories();
            });
            categoryTabs.append(button);
        });
        categoryInput.value = selectedCategory;
    }

    function getServers() {
        if (Array.isArray(shop.servers)) {
            const servers = shop.servers.map(server => typeof server === "string" ? server : server && server.name)
                .filter(server => typeof server === "string" && server.trim());
            if (servers.length) {
                return [...new Set(servers)];
            }
        }
        return ["Основной сервер"];
    }

    function renderServers(selected = []) {
        serverOptions.replaceChildren();
        getServers().forEach((server, index) => {
            const label = document.createElement("label");
            label.className = "server-option";
            const input = document.createElement("input");
            input.type = "checkbox";
            input.name = "servers";
            input.value = server;
            input.checked = selected.length ? selected.includes(server) : index === 0;
            const text = document.createElement("span");
            text.textContent = server;
            label.append(input, text);
            serverOptions.append(label);
        });
    }

    function addCommand(value = "") {
        const row = document.createElement("div");
        row.className = "command-row";
        const number = document.createElement("span");
        number.className = "command-number";
        number.textContent = `${commandList.children.length + 1}.`;
        const input = document.createElement("input");
        input.className = "command-input";
        input.type = "text";
        input.maxLength = 240;
        input.name = "commands";
        input.value = value;
        input.placeholder = "Например: give {user} diamond 1";
        input.setAttribute("aria-label", `Команда выдачи ${commandList.children.length + 1}`);
        const remove = document.createElement("button");
        remove.className = "remove-command-button";
        remove.type = "button";
        remove.textContent = "×";
        remove.setAttribute("aria-label", "Удалить команду");
        remove.addEventListener("click", () => {
            if (commandList.children.length <= 1) {
                input.value = "";
                return;
            }
            row.remove();
            renumberCommands();
        });
        row.append(number, input, remove);
        commandList.append(row);
    }

    function renumberCommands() {
        Array.from(commandList.children).forEach((row, index) => {
            row.querySelector(".command-number").textContent = `${index + 1}.`;
            row.querySelector(".command-input").setAttribute("aria-label", `Команда выдачи ${index + 1}`);
        });
    }

    function setImage(dataUrl) {
        currentImage = dataUrl;
        imagePreview.hidden = !dataUrl;
        imagePlaceholder.hidden = Boolean(dataUrl);
        removeImageButton.hidden = !dataUrl;
        if (dataUrl) {
            imagePreview.src = dataUrl;
        } else {
            imagePreview.removeAttribute("src");
            imageInput.value = "";
        }
    }

    function resetForm() {
        form.reset();
        editingProductId = null;
        selectedCategory = shop.productCategories[0];
        document.querySelector("#editor-eyebrow").textContent = "НОВЫЙ ТОВАР";
        document.querySelector("#editor-title").textContent = "Создание товара";
        document.querySelector("#save-product-button").textContent = "Создать товар";
        formMessage.hidden = true;
        formMessage.textContent = "";
        commandList.replaceChildren();
        addCommand("lp user {user} parent add vip");
        setImage("");
        renderCategories();
        renderServers();
    }

    function openEditor(product = null) {
        resetForm();
        editor.hidden = false;
        if (product) {
            editingProductId = product.id;
            selectedCategory = shop.productCategories.includes(product.category) ? product.category : shop.productCategories[0];
            document.querySelector("#editor-eyebrow").textContent = "РЕДАКТИРОВАНИЕ";
            document.querySelector("#editor-title").textContent = "Изменение товара";
            document.querySelector("#save-product-button").textContent = "Сохранить изменения";
            form.elements.name.value = product.name;
            form.elements.description.value = product.description || "";
            form.elements.extraDescription.value = product.extraDescription || "";
            form.elements.price.value = String(product.price);
            form.elements.quantity.value = String(product.quantity);
            const commands = Array.isArray(product.commands) ? product.commands : [];
            commandList.replaceChildren();
            (commands.length ? commands : [""]).forEach(addCommand);
            renderServers(Array.isArray(product.servers) ? product.servers : []);
            setImage(product.image || "");
            renderCategories();
        }
        editor.scrollIntoView({ behavior: "smooth", block: "start" });
        document.querySelector("#product-name").focus({ preventScroll: true });
    }

    function formatPrice(price) {
        return `${new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price)} ₽`;
    }

    function formatProductCount(count) {
        const tens = count % 100;
        const units = count % 10;
        const label = tens >= 11 && tens <= 14
            ? "товаров"
            : units === 1
                ? "товар"
                : units >= 2 && units <= 4
                    ? "товара"
                    : "товаров";
        return `${count} ${label}`;
    }

    function renderProducts() {
        const query = searchInput.value.trim().toLocaleLowerCase("ru");
        const filtered = shop.products.filter(product => {
            const text = `${product.name} ${product.description || ""} ${product.category || ""}`.toLocaleLowerCase("ru");
            return text.includes(query);
        });
        productsGrid.replaceChildren();
        productsCount.textContent = formatProductCount(shop.products.length);

        filtered.forEach(product => {
            const card = document.createElement("article");
            card.className = "product-card";
            const imageBox = document.createElement("div");
            imageBox.className = "product-card-image";
            imageBox.setAttribute("aria-label", product.image ? `Изображение товара ${product.name}` : "Изображение не добавлено");
            imageBox.textContent = "♜";
            if (product.image) {
                const image = document.createElement("img");
                image.src = product.image;
                image.alt = product.name;
                imageBox.append(image);
            }
            const category = document.createElement("span");
            category.className = "product-card-category";
            category.textContent = product.category || "Другое";
            imageBox.append(category);

            const body = document.createElement("div");
            body.className = "product-card-body";
            const titleRow = document.createElement("div");
            titleRow.className = "product-card-title-row";
            const title = document.createElement("h3");
            title.textContent = product.name;
            title.title = product.name;
            const actions = document.createElement("div");
            actions.className = "product-card-actions";
            const editButton = document.createElement("button");
            editButton.type = "button";
            editButton.textContent = "✎";
            editButton.setAttribute("aria-label", `Изменить товар ${product.name}`);
            editButton.addEventListener("click", () => openEditor(product));
            const deleteButton = document.createElement("button");
            deleteButton.className = "delete-product-card";
            deleteButton.type = "button";
            deleteButton.textContent = "⌫";
            deleteButton.setAttribute("aria-label", `Удалить товар ${product.name}`);
            deleteButton.addEventListener("click", () => {
                pendingDeleteId = product.id;
                document.querySelector("#delete-product-name").textContent = product.name;
                deleteDialog.showModal();
            });
            actions.append(editButton, deleteButton);
            titleRow.append(title, actions);

            const description = document.createElement("p");
            description.className = "product-card-description";
            description.textContent = product.description || "Описание не добавлено";
            const footer = document.createElement("div");
            footer.className = "product-card-footer";
            const price = document.createElement("span");
            price.className = "product-card-price";
            price.textContent = formatPrice(Number(product.price) || 0);
            const stock = document.createElement("span");
            stock.className = "product-card-stock";
            stock.textContent = `${Number(product.quantity) || 0} шт.`;
            footer.append(price, stock);
            body.append(titleRow, description, footer);
            card.append(imageBox, body);
            productsGrid.append(card);
        });

        const isEmpty = shop.products.length === 0;
        const noMatches = !isEmpty && filtered.length === 0;
        productsGrid.hidden = isEmpty || noMatches;
        productsEmpty.hidden = !isEmpty && !noMatches;
        productsEmpty.querySelector("h2").textContent = noMatches ? "Ничего не найдено" : "Товаров пока нет";
        productsEmpty.querySelector("p").textContent = noMatches
            ? "Попробуй изменить запрос поиска."
            : "Создай первый товар — он появится в списке демо-магазина.";
        productsEmpty.querySelector("[data-open-editor]").hidden = noMatches;
    }

    renderCategories();
    renderServers();
    addCommand("lp user {user} parent add vip");
    renderProducts();
    editor.hidden = true;

    document.querySelector("#new-product-button").addEventListener("click", () => openEditor());
    document.querySelectorAll("[data-open-editor]").forEach(button => button.addEventListener("click", () => openEditor()));
    document.querySelector("#close-editor").addEventListener("click", () => {
        editor.hidden = true;
        resetForm();
    });
    document.querySelector("#cancel-product-button").addEventListener("click", () => {
        editor.hidden = true;
        resetForm();
    });
    document.querySelector("#add-command-button").addEventListener("click", () => addCommand());
    searchInput.addEventListener("input", renderProducts);
    async function compressImage(file) {
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

        if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 36000000) {
            throw new Error("У изображения слишком большое разрешение.");
        }

        const maxDimension = 1400;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.naturalWidth * scale);
        canvas.height = Math.round(image.naturalHeight * scale);
        const context = canvas.getContext("2d");
        if (!context) {
            throw new Error("Не удалось обработать изображение.");
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        for (const quality of [0.84, 0.72, 0.6, 0.48, 0.36]) {
            const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/webp", quality));
            if (!blob || blob.type !== "image/webp") {
                throw new Error("Браузер не поддерживает сжатие изображения.");
            }
            if (blob.size <= 700 * 1024) {
                return await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.addEventListener("load", () => {
                        if (typeof reader.result === "string") {
                            resolve(reader.result);
                        } else {
                            reject(new Error("Не удалось прочитать обработанное изображение."));
                        }
                    }, { once: true });
                    reader.addEventListener("error", () => reject(new Error("Не удалось прочитать обработанное изображение.")), { once: true });
                    reader.readAsDataURL(blob);
                });
            }
        }
        throw new Error("Не удалось уменьшить изображение до размера 700 КБ.");
    }

    imageInput.addEventListener("change", async () => {
        const file = imageInput.files && imageInput.files[0];
        if (!file) {
            return;
        }
        formMessage.hidden = true;
        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            formMessage.textContent = "Выбери изображение PNG, JPG или WEBP.";
            formMessage.hidden = false;
            imageInput.value = "";
            return;
        }
        if (file.size > 10 * 1024 * 1024) {
            formMessage.textContent = "Исходное изображение не должно превышать 10 МБ.";
            formMessage.hidden = false;
            imageInput.value = "";
            return;
        }
        try {
            setImage(await compressImage(file));
        } catch (error) {
            formMessage.textContent = error.message;
            formMessage.hidden = false;
            imageInput.value = "";
        }
    });
    removeImageButton.addEventListener("click", () => setImage(""));

    document.querySelector("#add-category-button").addEventListener("click", () => {
        document.querySelector("#category-message").hidden = true;
        document.querySelector("#new-category-name").value = "";
        document.querySelector("#category-dialog").showModal();
        document.querySelector("#new-category-name").focus();
    });
    document.querySelector("#cancel-category").addEventListener("click", () => document.querySelector("#category-dialog").close());
    document.querySelector("#category-form").addEventListener("submit", event => {
        event.preventDefault();
        const input = document.querySelector("#new-category-name");
        const name = input.value.trim();
        if (name.length < 2) {
            input.setCustomValidity("Название должно содержать не менее 2 символов.");
            input.reportValidity();
            input.setCustomValidity("");
            return;
        }
        if (shop.productCategories.some(category => category.toLocaleLowerCase("ru") === name.toLocaleLowerCase("ru"))) {
            const message = document.querySelector("#category-message");
            message.textContent = "Такая категория уже есть.";
            message.hidden = false;
            return;
        }
        shop.productCategories.push(name);
        selectedCategory = name;
        try {
            saveShops();
        } catch (error) {
            shop.productCategories.pop();
            showToast(error.message);
            return;
        }
        renderCategories();
        document.querySelector("#category-dialog").close();
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        formMessage.hidden = true;
        if (!form.reportValidity()) {
            return;
        }

        const name = form.elements.name.value.trim();
        const price = Number(form.elements.price.value);
        const quantity = Number(form.elements.quantity.value);
        const servers = Array.from(form.querySelectorAll('input[name="servers"]:checked'), input => input.value);
        const commands = Array.from(form.querySelectorAll('input[name="commands"]'), input => input.value.trim()).filter(Boolean);
        if (name.length < 2 || !Number.isFinite(price) || price < 0 || price > 1000000 ||
            !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) {
            formMessage.textContent = "Проверь название, стоимость и количество товара.";
            formMessage.hidden = false;
            return;
        }
        if (servers.length === 0) {
            formMessage.textContent = "Выбери хотя бы один сервер.";
            formMessage.hidden = false;
            return;
        }

        const wasEditing = Boolean(editingProductId);
        const product = {
            id: editingProductId || createId(),
            category: selectedCategory,
            name,
            description: form.elements.description.value.trim(),
            extraDescription: form.elements.extraDescription.value.trim(),
            price,
            quantity,
            servers,
            commands,
            image: currentImage
        };
        const previousProducts = [...shop.products];
        if (editingProductId) {
            const index = shop.products.findIndex(item => item.id === editingProductId);
            if (index === -1) {
                formMessage.textContent = "Товар больше не найден. Обнови страницу и попробуй снова.";
                formMessage.hidden = false;
                return;
            }
            shop.products[index] = product;
        } else {
            shop.products.unshift(product);
        }
        try {
            saveShops();
        } catch (error) {
            shop.products = previousProducts;
            formMessage.textContent = error.message;
            formMessage.hidden = false;
            return;
        }
        editor.hidden = true;
        resetForm();
        renderProducts();
        showToast(wasEditing ? "Изменения сохранены." : "Товар создан.");
    });

    document.querySelector("#cancel-delete-product").addEventListener("click", () => {
        pendingDeleteId = null;
        deleteDialog.close();
    });
    document.querySelector("#confirm-delete-product").addEventListener("click", () => {
        const index = shop.products.findIndex(product => product.id === pendingDeleteId);
        if (index === -1) {
            deleteDialog.close();
            pendingDeleteId = null;
            showToast("Товар уже удалён.");
            return;
        }
        const [removed] = shop.products.splice(index, 1);
        try {
            saveShops();
        } catch (error) {
            shop.products.splice(index, 0, removed);
            showToast(error.message);
            return;
        }
        deleteDialog.close();
        pendingDeleteId = null;
        renderProducts();
        showToast("Товар удалён.");
    });

    document.querySelector("#logout-button").addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });
})();
