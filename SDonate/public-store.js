(() => {
    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const shopOwner = params.get("owner");
    const shopName = document.querySelector("#store-brand-name");
    const brandMark = document.querySelector("#store-brand-mark");
    const hero = document.querySelector("#store-hero");
    const heroImage = document.querySelector("#store-hero-image");
    const additionalImage = document.querySelector("#additional-store-image");
    const additionalImageContent = document.querySelector("#additional-store-image-content");
    const title = document.querySelector("#store-title");
    const description = document.querySelector("#store-description");
    const address = document.querySelector("#server-address");
    const onlineIndicator = document.querySelector("#online-indicator");
    const publicServers = document.querySelector("#public-servers");
    const publicServersGrid = document.querySelector("#public-servers-grid");
    const grid = document.querySelector("#public-products-grid");
    const categories = document.querySelector("#category-list");
    const emptyState = document.querySelector("#store-empty-state");
    const search = document.querySelector("#product-search");
    const cartItems = document.querySelector("#cart-items");
    const cartEmpty = document.querySelector("#cart-empty");
    const cartCount = document.querySelector("#cart-count");
    const cartHeadingCount = document.querySelector("#cart-heading-count");
    const cartTotal = document.querySelector("#cart-total");
    const checkoutButton = document.querySelector("#checkout-button");
    const checkoutDialog = document.querySelector("#checkout-dialog");
    const toast = document.querySelector("#public-store-toast");
    const communityLink = document.querySelector("#community-link");
    const cart = new Map();
    let shop;
    let selectedCategory = "Все";
    let toastTimer;

    function loadShop() {
        if (!shopId || !shopOwner) {
            throw new Error("Для предпросмотра открой витрину из панели нужного магазина.");
        }
        const key = `sdonate-demo-shops:account:${encodeURIComponent(shopOwner)}`;
        const stored = sessionStorage.getItem(key);
        if (stored === null) {
            throw new Error("Демо-данные магазина отсутствуют в этой вкладке. Открой витрину из панели управления магазина.");
        }
        const shops = JSON.parse(stored);
        if (!Array.isArray(shops)) {
            throw new Error("Список магазинов имеет неверный формат.");
        }
        const current = shops.find(item => item && item.id === shopId && item.ownerId === shopOwner);
        if (!current) {
            throw new Error("Магазин не найден в этой демо-сессии.");
        }
        return current;
    }

    function showLoadError(error) {
        document.title = "Витрина недоступна — SDonate";
        shopName.textContent = "Витрина недоступна";
        title.textContent = "Не удалось открыть магазин";
        description.textContent = error.message;
        document.querySelector(".store-hero-kicker").textContent = "ПРЕДПРОСМОТР МАГАЗИНА";
        document.querySelector("#products").hidden = true;
        document.querySelector("#about").hidden = true;
        document.querySelector(".hero-shop-link").hidden = true;
    }

    function formatPrice(value) {
        const price = Number(value);
        if (!Number.isFinite(price) || price < 0) {
            return "—";
        }
        return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(price);
    }

    function getPublicServers() {
        if (!Array.isArray(shop.servers)) {
            return [];
        }
        return shop.servers.filter(server =>
            server &&
            typeof server.name === "string" &&
            typeof server.address === "string" &&
            server.address.trim() &&
            Number.isInteger(server.port) &&
            server.port >= 1 &&
            server.port <= 65535
        );
    }

    async function fetchServerStatus(server) {
        const endpoint = `https://api.mcsrvstat.us/3/${encodeURIComponent(`${server.address.trim()}:${server.port}`)}`;
        const controller = new AbortController();
        const timeout = window.setTimeout(() => controller.abort(), 7000);
        try {
            const response = await fetch(endpoint, {
                headers: { Accept: "application/json" },
                signal: controller.signal
            });
            if (!response.ok) {
                throw new Error(`Сервис статуса вернул HTTP ${response.status}.`);
            }
            const result = await response.json();
            if (!result || typeof result.online !== "boolean") {
                throw new Error("Сервис статуса прислал неожиданный ответ.");
            }
            return result;
        } finally {
            window.clearTimeout(timeout);
        }
    }

    function setServerStatusText(element, state, text) {
        element.className = `public-server-status ${state}`;
        element.textContent = text;
    }

    async function refreshPublicServers() {
        const servers = getPublicServers();
        if (!servers.length) {
            publicServers.hidden = true;
            return;
        }

        publicServers.hidden = false;
        publicServersGrid.replaceChildren();
        const onlineTotals = [];
        let offlineCount = 0;
        let unavailableCount = 0;
        let hiddenCount = 0;
        const statusTasks = servers.map(async server => {
            const card = document.createElement("article");
            card.className = "public-server-card";

            const heading = document.createElement("div");
            heading.className = "public-server-card-heading";
            const name = document.createElement("h3");
            name.textContent = server.name;
            const version = document.createElement("span");
            version.textContent = server.version || "Minecraft";
            heading.append(name, version);

            const addressRow = document.createElement("p");
            addressRow.className = "public-server-address";
            const addressLabel = document.createElement("span");
            addressLabel.textContent = "IP";
            const addressValue = document.createElement("b");
            addressValue.textContent = `${server.address}:${server.port}`;
            addressRow.append(addressLabel, addressValue);

            const status = document.createElement("p");
            status.setAttribute("aria-live", "polite");
            setServerStatusText(status, "checking", "Проверяем статус…");
            card.append(heading, addressRow, status);
            publicServersGrid.append(card);

            if (server.excludeOnline) {
                setServerStatusText(status, "hidden-status", "Онлайн скрыт владельцем");
                hiddenCount += 1;
                return;
            }

            try {
                const result = await fetchServerStatus(server);
                if (!result.online) {
                    setServerStatusText(status, "offline", "Сервер офлайн");
                    offlineCount += 1;
                    return;
                }

                const online = Number(result.players && result.players.online);
                const maximum = Number(result.players && result.players.max);
                const validOnline = Number.isFinite(online) && online >= 0;
                const validMaximum = Number.isFinite(maximum) && maximum >= 0;
                const onlineText = validOnline
                    ? `${online} онлайн${validMaximum ? ` из ${maximum}` : ""}`
                    : "Сервер онлайн";
                setServerStatusText(status, "online", onlineText);
                if (validOnline) {
                    onlineTotals.push({ online, maximum: validMaximum ? maximum : null });
                }
            } catch (error) {
                setServerStatusText(status, "unavailable", "Онлайн недоступен");
                unavailableCount += 1;
                console.warn(`Не удалось проверить Minecraft-сервер ${server.address}:${server.port}:`, error);
            }
        });

        await Promise.all(statusTasks);
        if (onlineTotals.length && !onlineIndicator.hidden) {
            const currentPlayers = onlineTotals.reduce((total, item) => total + item.online, 0);
            const maximumPlayers = onlineTotals.every(item => item.maximum !== null)
                ? onlineTotals.reduce((total, item) => total + item.maximum, 0)
                : null;
            onlineIndicator.replaceChildren(
                Object.assign(document.createElement("i"), { className: "online-dot" }),
                document.createTextNode(` ${currentPlayers} онлайн${maximumPlayers === null ? "" : ` из ${maximumPlayers}`}`)
            );
        } else if (!onlineTotals.length && !onlineIndicator.hidden) {
            onlineIndicator.textContent = offlineCount > 0 && unavailableCount === 0
                ? "Сервер офлайн"
                : hiddenCount === servers.length
                    ? "Онлайн скрыт владельцем"
                    : "Онлайн недоступен";
        }
    }

    function getProducts() {
        return Array.isArray(shop.products)
            ? shop.products.filter(product => product && typeof product.id === "string" && typeof product.name === "string")
            : [];
    }

    async function resolveImage(source) {
        const key = window.sdonateImageStorage.keyFromReference(source);
        if (key) {
            return window.sdonateImageStorage.get(key);
        }
        return typeof source === "string" ? source : null;
    }

    function productImage(source, target, alt) {
        if (typeof source !== "string" || !source) {
            return;
        }
        resolveImage(source).then(value => {
            if (!value || !target.isConnected) {
                return;
            }
            const image = document.createElement("img");
            image.src = value;
            image.alt = alt;
            target.querySelectorAll(":scope > :not(.public-product-category)").forEach(node => node.remove());
            target.insertBefore(image, target.firstChild);
        }).catch(error => {
            console.error(`Не удалось загрузить изображение товара «${alt}»: ${error.message}`);
        });
    }

    async function applyStoreImage(source, onLoaded, label) {
        if (typeof source !== "string" || !source) {
            return;
        }
        try {
            const image = await resolveImage(source);
            if (image) {
                onLoaded(image);
            } else {
                console.warn(`Изображение «${label}» не найдено в хранилище.`);
            }
        } catch (error) {
            console.error(`Не удалось загрузить изображение «${label}»: ${error.message}`);
        }
    }

    function renderCategories(products) {
        const names = ["Все", ...new Set(products.map(product => product.category || "Другое"))]
            .slice(1)
            .sort((left, right) => {
                const priorityDifference = getCategoryGroup(left).order - getCategoryGroup(right).order;
                return priorityDifference || left.localeCompare(right, "ru");
            });
        names.unshift("Все");
        if (!names.includes(selectedCategory)) {
            selectedCategory = "Все";
        }
        categories.replaceChildren(...names.map(name => {
            const button = document.createElement("button");
            button.className = `category-button${selectedCategory === name ? " active" : ""}`;
            button.type = "button";
            button.textContent = name;
            button.setAttribute("aria-pressed", String(selectedCategory === name));
            button.addEventListener("click", () => {
                selectedCategory = name;
                renderProducts();
            });
            return button;
        }));
    }

    function getCategoryGroup(category) {
        const normalized = String(category || "").trim().toLocaleLowerCase("ru");
        if (/кейс/.test(normalized)) {
            return { id: "cases", title: "Кейсы", order: 0 };
        }
        if (/привилег|донат|ранг|vip|premium/.test(normalized)) {
            return { id: "donate", title: "Привилегии и донат", order: 1 };
        }
        if (/валют|монет|кристалл|coin/.test(normalized)) {
            return { id: "currency", title: "Валюта", order: 2 };
        }
        if (/предмет|item/.test(normalized)) {
            return { id: "items", title: "Предметы", order: 3 };
        }
        return { id: `other-${normalized || "other"}`, title: category || "Другое", order: 4 };
    }

    function addToCart(product) {
        const existing = cart.get(product.id);
        const stock = Number(product.quantity);
        const quantity = existing ? existing.quantity : 0;
        if (!Number.isFinite(stock) || stock <= quantity) {
            showToast("Больше товара нет в демо-остатке.");
            return;
        }
        cart.set(product.id, { product, quantity: quantity + 1 });
        renderCart();
        showToast(`«${product.name}» добавлен в корзину.`);
    }

    function renderProducts() {
        const products = getProducts();
        renderCategories(products);
        const query = search.value.trim().toLocaleLowerCase("ru");
        const visibleProducts = products.filter(product =>
            (selectedCategory === "Все" || (product.category || "Другое") === selectedCategory) &&
            `${product.name} ${product.description || ""}`.toLocaleLowerCase("ru").includes(query)
        );
        grid.replaceChildren();

        function makeProductCard(product) {
            const card = document.createElement("article");
            card.className = "public-product-card";
            const image = document.createElement("div");
            image.className = "public-product-image";
            image.textContent = "◇";
            const category = document.createElement("span");
            category.className = "public-product-category";
            category.textContent = product.category || "Другое";
            image.append(category);
            productImage(product.image, image, product.name);

            const body = document.createElement("div");
            body.className = "public-product-body";
            const name = document.createElement("h3");
            name.textContent = product.name;
            const productDescription = document.createElement("p");
            productDescription.textContent = product.description || "Поддержи сервер и получи товар в игре.";
            const footer = document.createElement("div");
            footer.className = "public-product-footer";
            const price = document.createElement("span");
            price.className = "public-product-price";
            price.append(document.createTextNode(`${formatPrice(product.price)} `));
            const currency = document.createElement("small");
            currency.textContent = "₽";
            price.append(currency);
            const button = document.createElement("button");
            button.className = "add-to-cart";
            button.type = "button";
            button.textContent = Number(product.quantity) > 0 ? "+ В корзину" : "Нет в наличии";
            button.disabled = !Number.isFinite(Number(product.quantity)) || Number(product.quantity) <= 0;
            button.addEventListener("click", () => addToCart(product));
            footer.append(price, button);
            body.append(name, productDescription, footer);
            card.append(image, body);
            return card;
        }

        const productGroups = new Map();
        visibleProducts.forEach(product => {
            const group = getCategoryGroup(product.category || "Другое");
            if (!productGroups.has(group.id)) {
                productGroups.set(group.id, { ...group, products: [] });
            }
            productGroups.get(group.id).products.push(product);
        });
        Array.from(productGroups.values())
            .sort((left, right) => left.order - right.order || left.title.localeCompare(right.title, "ru"))
            .forEach(group => {
                const section = document.createElement("section");
                section.className = "public-product-group";
                const heading = document.createElement("h3");
                heading.className = "public-product-group-heading";
                heading.textContent = group.title;
                const groupGrid = document.createElement("div");
                groupGrid.className = "public-product-group-grid";
                group.products.forEach(product => groupGrid.append(makeProductCard(product)));
                section.append(heading, groupGrid);
                grid.append(section);
            });

        const noProducts = products.length === 0;
        const noMatches = products.length > 0 && visibleProducts.length === 0;
        emptyState.hidden = !noProducts && !noMatches;
        emptyState.querySelector("h3").textContent = noMatches ? "Ничего не найдено" : "Здесь пока тихо";
        emptyState.querySelector("p").textContent = noMatches
            ? "Попробуй изменить поиск или выбрать другую категорию."
            : "Владелец магазина ещё не добавил товары.";
        grid.hidden = noProducts || noMatches;
        categories.hidden = noProducts;
    }

    function renderCart() {
        const items = Array.from(cart.values());
        const count = items.reduce((total, item) => total + item.quantity, 0);
        const total = items.reduce((sum, item) => sum + (Number(item.product.price) || 0) * item.quantity, 0);
        cartCount.textContent = String(count);
        cartHeadingCount.textContent = String(count);
        cartTotal.textContent = `${formatPrice(total)} ₽`;
        cartEmpty.hidden = items.length > 0;
        checkoutButton.disabled = items.length === 0;
        cartItems.replaceChildren();

        items.forEach(({ product, quantity }) => {
            const row = document.createElement("article");
            row.className = "cart-item";
            const name = document.createElement("span");
            name.className = "cart-item-name";
            name.textContent = product.name;
            const price = document.createElement("span");
            price.className = "cart-item-price";
            price.textContent = `${formatPrice((Number(product.price) || 0) * quantity)} ₽`;
            const controls = document.createElement("div");
            controls.className = "cart-item-controls";
            const decrease = document.createElement("button");
            decrease.type = "button";
            decrease.textContent = "−";
            decrease.setAttribute("aria-label", `Уменьшить количество: ${product.name}`);
            decrease.addEventListener("click", () => {
                if (quantity <= 1) {
                    cart.delete(product.id);
                } else {
                    cart.set(product.id, { product, quantity: quantity - 1 });
                }
                renderCart();
            });
            const amount = document.createElement("span");
            amount.textContent = String(quantity);
            const increase = document.createElement("button");
            increase.type = "button";
            increase.textContent = "+";
            increase.setAttribute("aria-label", `Увеличить количество: ${product.name}`);
            increase.addEventListener("click", () => addToCart(product));
            const remove = document.createElement("button");
            remove.className = "cart-remove";
            remove.type = "button";
            remove.textContent = "×";
            remove.setAttribute("aria-label", `Удалить: ${product.name}`);
            remove.addEventListener("click", () => {
                cart.delete(product.id);
                renderCart();
            });
            controls.append(decrease, amount, increase, remove);
            row.append(name, price, controls);
            cartItems.append(row);
        });
    }

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 2800);
    }

    function renderPageLinks() {
        const navigation = document.querySelector(".store-nav");
        const pages = shop.tools && Array.isArray(shop.tools.pages) ? shop.tools.pages : [];
        pages.forEach(page => {
            if (!page || typeof page.title !== "string" || typeof page.address !== "string") {
                return;
            }
            let href;
            let external = false;
            if (/^https?:\/\//i.test(page.address)) {
                try {
                    const url = new URL(page.address);
                    if (!["http:", "https:"].includes(url.protocol)) {
                        return;
                    }
                    href = url.href;
                    external = true;
                } catch {
                    return;
                }
            } else {
                href = `./public-page.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(shop.ownerId || shopOwner)}&slug=${encodeURIComponent(page.address)}`;
            }
            const link = document.createElement("a");
            link.href = href;
            link.textContent = page.title;
            if (external) {
                link.target = "_blank";
                link.rel = "noopener noreferrer";
            }
            navigation.append(link);
        });
    }

    async function renderStore() {
        shopName.textContent = shop.name;
        brandMark.textContent = Array.from(shop.name.trim() || "S")[0].toUpperCase();
        document.title = `${shop.name} — Магазин сервера`;
        renderPageLinks();

        const customization = shop.customization && typeof shop.customization === "object"
            ? shop.customization
            : {};
        const storeImages = shop.images && typeof shop.images === "object" ? shop.images : {};
        const templateFamilies = {
            "nexium-light": "nexium",
            "nexium-dark": "nexium",
            "orvion-light": "orvion",
            "orvion-dark": "orvion",
            "lumix-light": "lumix",
            "lumix-dark": "lumix",
            "arcane-light": "arcane",
            "arcane-dark": "arcane",
            "ender-rift": "ender",
            "nether-forge": "nether",
            "deep-ocean": "ocean",
            "emerald-grove": "forest"
        };
        document.body.dataset.template = templateFamilies[shop.templateId] || "";
        const accentColor = /^#[0-9a-f]{6}$/i.test(customization.accentColor || "")
            ? customization.accentColor
            : "#7866ff";
        document.documentElement.style.setProperty("--store-accent", accentColor);
        document.documentElement.style.setProperty("--store-accent-soft", `${accentColor}24`);
        title.textContent = customization.title || shop.name;
        description.textContent = customization.description || "Выбирай привилегии и предметы для игры.";
        address.textContent = customization.address || shop.address || "Сервер скоро появится";

        if (customization.hideOverallOnline) {
            onlineIndicator.hidden = true;
        }
        if (!customization.address && Array.isArray(shop.servers)) {
            const firstServer = shop.servers.find(server =>
                server && typeof server.address === "string" && Number.isInteger(server.port)
            );
            if (firstServer) {
                address.textContent = `${firstServer.address}:${firstServer.port}`;
            }
        }
        await applyStoreImage(customization.backgroundImage || storeImages.background, image => {
            heroImage.src = image;
            heroImage.hidden = false;
        }, "фоновое изображение");

        await applyStoreImage(storeImages.logo, image => {
            const logo = document.createElement("img");
            logo.src = image;
            logo.alt = "";
            brandMark.replaceChildren(logo);
        }, "логотип магазина");

        await applyStoreImage(storeImages.icon, image => {
            let icon = document.querySelector('link[rel="icon"]');
            if (!icon) {
                icon = document.createElement("link");
                icon.rel = "icon";
                document.head.append(icon);
            }
            icon.href = image;
        }, "иконка магазина");

        await applyStoreImage(storeImages.additional, image => {
            additionalImageContent.src = image;
            additionalImageContent.alt = `Изображение магазина ${shop.name}`;
            additionalImage.hidden = false;
        }, "дополнительное изображение");

        const aboutText = customization.aboutDescription || customization.description ||
            `Присоединяйся к ${shop.name} и играй вместе с нами.`;
        document.querySelector("#about-title").textContent =
            customization.aboutTitle || `Добро пожаловать на ${shop.name}`;
        document.querySelector("#about-description").textContent = aboutText;
        if (shop.socialLinks && typeof shop.socialLinks === "object") {
            const community = Object.values(shop.socialLinks).find(value => {
                try {
                    return ["http:", "https:"].includes(new URL(value).protocol);
                } catch {
                    return false;
                }
            });
            if (community) {
                communityLink.href = community;
                communityLink.target = "_blank";
                communityLink.rel = "noopener noreferrer";
                communityLink.hidden = false;
            }
        }

        renderProducts();
        renderCart();
        await refreshPublicServers();
    }

    try {
        shop = loadShop();
        renderStore().catch(error => {
            console.error("Не удалось подготовить витрину:", error);
            showLoadError(new Error(`Не удалось загрузить оформление: ${error.message}`));
        });
    } catch (error) {
        showLoadError(error);
    }

    search.addEventListener("input", renderProducts);
    document.querySelector("#cart-open").addEventListener("click", () => {
        document.querySelector("#cart-panel").scrollIntoView({ behavior: "smooth", block: "center" });
    });
    document.querySelector("#checkout-button").addEventListener("click", () => checkoutDialog.showModal());
    document.querySelector("#checkout-close").addEventListener("click", () => checkoutDialog.close());
    document.querySelector("#checkout-ok").addEventListener("click", () => checkoutDialog.close());
    window.setInterval(() => {
        if (shop) {
            refreshPublicServers().catch(error => {
                console.error("Не удалось обновить статус Minecraft-серверов:", error);
            });
        }
    }, 60_000);
})();
