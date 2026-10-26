(() => {
    if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
        window.location.replace("./reg.html?mode=login");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const storageKey = window.sdonateShopStorage.storageKey();
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const backToShop = document.querySelector("#back-to-shop");
    const couponGrid = document.querySelector("#coupon-grid");
    const couponEmpty = document.querySelector("#coupon-empty");
    const couponCount = document.querySelector("#coupon-count");
    const dialog = document.querySelector("#coupon-dialog");
    const form = document.querySelector("#coupon-form");
    const formFeedback = document.querySelector("#coupon-form-feedback");
    const productList = document.querySelector("#coupon-product-list");
    const partnerList = document.querySelector("#coupon-partner-list");
    const deleteDialog = document.querySelector("#coupon-delete-dialog");
    const toast = document.querySelector("#coupon-toast");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    let shops;
    let shop;
    let pendingDeleteId = null;
    let toastTimer;

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
    backToShop.href = `./shop-dashboard.html?id=${encodeURIComponent(shopId || "")}`;

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

    function saveShop() {
        const currentShops = readShops();
        const currentIndex = currentShops.findIndex(item => item.id === shopId);
        if (currentIndex < 0) {
            throw new Error("Магазин не найден.");
        }
        currentShops[currentIndex] = shop;
        window.sdonateShopStorage.save(currentShops);
        shops = currentShops;
    }

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3200);
    }

    function allCoupons() {
        if (Array.isArray(shop.coupons)) {
            return shop.coupons;
        }
        const oldCoupons = shop.tools && Array.isArray(shop.tools.coupons) ? shop.tools.coupons : [];
        return oldCoupons.map(record => {
            const code = String(record.name || "").trim().toUpperCase();
            const discount = Number(record.detail);
            return {
                id: record.id || createId(),
                name: code ? `Купон ${code}` : "Старый купон",
                code,
                discount: Number.isFinite(discount) && discount > 0 && discount <= 100 ? discount : 10,
                maxUses: null,
                uses: 0,
                startAt: "",
                endAt: "",
                productIds: [],
                partners: [],
                active: true
            };
        });
    }

    function getCouponStatus(coupon) {
        if (coupon.active === false) {
            return { label: "Выключен", className: "is-paused" };
        }
        const now = Date.now();
        const start = coupon.startAt ? new Date(coupon.startAt).getTime() : NaN;
        const end = coupon.endAt ? new Date(coupon.endAt).getTime() : NaN;
        if (Number.isFinite(start) && start > now) {
            return { label: "Запланирован", className: "is-paused" };
        }
        if (Number.isFinite(end) && end < now) {
            return { label: "Завершён", className: "is-expired" };
        }
        if (Number.isFinite(Number(coupon.maxUses)) && Number(coupon.maxUses) > 0 &&
            Number(coupon.uses || 0) >= Number(coupon.maxUses)) {
            return { label: "Лимит исчерпан", className: "is-exhausted" };
        }
        return { label: "Активен", className: "" };
    }

    function formatDate(value) {
        if (!value) {
            return "Без срока";
        }
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return "Дата не задана";
        }
        return new Intl.DateTimeFormat("ru-RU", { dateStyle: "short" }).format(date);
    }

    function makeIconButton(label, symbol, action, couponId) {
        const button = document.createElement("button");
        button.className = "coupon-icon-button";
        button.type = "button";
        button.dataset.action = action;
        button.dataset.couponId = couponId;
        button.setAttribute("aria-label", `${label}: ${couponId}`);
        button.title = label;
        button.textContent = symbol;
        return button;
    }

    function renderCoupons() {
        const coupons = allCoupons();
        couponGrid.replaceChildren();
        coupons.forEach(coupon => {
            const card = document.createElement("article");
            card.className = "coupon-card";

            const top = document.createElement("div");
            top.className = "coupon-card-top";
            const status = document.createElement("span");
            const statusInfo = getCouponStatus(coupon);
            status.className = `coupon-status ${statusInfo.className}`;
            status.textContent = statusInfo.label;
            const actions = document.createElement("div");
            actions.className = "coupon-card-actions";
            actions.append(
                makeIconButton("Скопировать код", "⧉", "copy", coupon.id),
                makeIconButton("Изменить купон", "✎", "edit", coupon.id),
                makeIconButton(coupon.active === false ? "Включить купон" : "Выключить купон", coupon.active === false ? "▶" : "Ⅱ", "toggle", coupon.id),
                makeIconButton("Удалить купон", "×", "delete", coupon.id)
            );
            top.append(status, actions);

            const titleRow = document.createElement("div");
            titleRow.className = "coupon-card-title-row";
            const name = document.createElement("h3");
            name.textContent = coupon.name || "Купон без названия";
            const discount = document.createElement("span");
            discount.className = "coupon-discount";
            discount.textContent = `−${Number(coupon.discount) || 0}%`;
            titleRow.append(name, discount);

            const codeRow = document.createElement("div");
            codeRow.className = "coupon-card-code-row";
            const code = document.createElement("span");
            code.className = "coupon-code-chip";
            code.textContent = coupon.code || "БЕЗ КОДА";
            const scope = document.createElement("span");
            scope.className = "coupon-card-scope";
            const productIds = Array.isArray(coupon.productIds) ? coupon.productIds : [];
            const productNames = productIds
                .map(id => (shop.products || []).find(product => product.id === id))
                .filter(Boolean)
                .map(product => product.name);
            scope.textContent = productNames.length ? productNames.join(", ") : "Все товары";
            codeRow.append(code, scope);

            const usage = document.createElement("div");
            usage.className = "coupon-usage";
            const usageTop = document.createElement("div");
            usageTop.className = "coupon-usage-top";
            const usageLabel = document.createElement("span");
            usageLabel.textContent = "Использования";
            const usageValue = document.createElement("b");
            const uses = Math.max(0, Number(coupon.uses) || 0);
            const maxUses = Number(coupon.maxUses);
            const hasLimit = Number.isFinite(maxUses) && maxUses > 0;
            usageValue.textContent = hasLimit ? `${uses} / ${maxUses}` : `${uses} / ∞`;
            usageTop.append(usageLabel, usageValue);
            const track = document.createElement("div");
            track.className = "coupon-usage-track";
            track.setAttribute("role", "progressbar");
            track.setAttribute("aria-label", "Использование купона");
            track.setAttribute("aria-valuemin", "0");
            track.setAttribute("aria-valuemax", hasLimit ? String(maxUses) : "100");
            track.setAttribute("aria-valuenow", String(hasLimit ? Math.min(uses, maxUses) : Math.min(uses, 100)));
            const progress = document.createElement("span");
            progress.style.width = `${hasLimit ? Math.min(100, uses / maxUses * 100) : Math.min(100, uses)}%`;
            track.append(progress);
            usage.append(usageTop, track);

            const meta = document.createElement("div");
            meta.className = "coupon-card-meta";
            const dates = document.createElement("span");
            dates.textContent = `Срок: ${formatDate(coupon.startAt)} — ${formatDate(coupon.endAt)}`;
            const partnerCount = Array.isArray(coupon.partners) ? coupon.partners.length : 0;
            const partners = document.createElement("span");
            partners.textContent = partnerCount ? `Партнёров: ${partnerCount}` : "Без партнёров";
            meta.append(dates, partners);
            card.append(top, titleRow, codeRow, usage, meta);
            couponGrid.append(card);
        });

        const totalUses = coupons.reduce((sum, coupon) => sum + Math.max(0, Number(coupon.uses) || 0), 0);
        document.querySelector("#stat-total").textContent = String(coupons.length);
        document.querySelector("#stat-active").textContent = String(coupons.filter(coupon => getCouponStatus(coupon).label === "Активен").length);
        document.querySelector("#stat-uses").textContent = String(totalUses);
        couponCount.textContent = `${coupons.length} ${coupons.length === 1 ? "купон" : coupons.length > 1 && coupons.length < 5 ? "купона" : "купонов"}`;
        couponEmpty.hidden = coupons.length > 0;
        couponGrid.hidden = coupons.length === 0;
    }

    function renderProductOptions(selectedIds = []) {
        productList.replaceChildren();
        const products = Array.isArray(shop.products) ? shop.products : [];
        document.querySelector("#coupon-products-empty").hidden = products.length > 0;
        products.forEach(product => {
            const label = document.createElement("label");
            label.className = "coupon-product-option";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "productIds";
            checkbox.value = product.id;
            checkbox.checked = selectedIds.includes(product.id);
            const thumb = document.createElement("span");
            thumb.className = "coupon-product-thumb";
            const initials = Array.from(product.name || "?").slice(0, 1).join("").toUpperCase();
            thumb.textContent = initials;
            if (typeof product.image === "string" && product.image) {
                const image = document.createElement("img");
                image.alt = "";
                image.hidden = true;
                image.setAttribute("aria-hidden", "true");
                image.addEventListener("load", () => {
                    if (thumb.isConnected) {
                        image.hidden = false;
                        thumb.replaceChildren(image);
                    }
                }, { once: true });
                image.addEventListener("error", () => {
                    if (thumb.isConnected) {
                        image.title = "Не удалось загрузить фото товара";
                        showToast(`Не удалось загрузить фото товара «${product.name || "Без названия"}».`);
                    }
                }, { once: true });
                thumb.append(image);
                const assetKey = window.sdonateImageStorage.keyFromReference(product.image);
                if (assetKey) {
                    window.sdonateImageStorage.get(assetKey).then(source => {
                        if (!source) {
                            throw new Error("Фото не найдено в хранилище.");
                        }
                        if (thumb.isConnected) {
                            image.src = source;
                        }
                    }).catch(error => {
                        if (thumb.isConnected) {
                            image.title = error.message;
                            showToast(`Не удалось загрузить фото товара «${product.name || "Без названия"}»: ${error.message}`);
                        }
                    });
                } else {
                    image.src = product.image;
                }
            }
            const copy = document.createElement("span");
            copy.className = "coupon-product-copy";
            const title = document.createElement("b");
            title.textContent = product.name || "Товар без названия";
            const detail = document.createElement("small");
            detail.textContent = [product.category || "Товар", Number.isFinite(Number(product.price)) ? `${product.price} ₽` : ""].filter(Boolean).join(" · ");
            copy.append(title, detail);
            label.append(checkbox, thumb, copy);
            productList.append(label);
        });
    }

    function renderPartnerOptions(selectedPartners = []) {
        partnerList.replaceChildren();
        const partners = shop.tools && Array.isArray(shop.tools.partners) ? shop.tools.partners : [];
        document.querySelector("#coupon-partners-empty").hidden = partners.length > 0;
        partners.forEach((partner, index) => {
            const partnerId = partner.id || `legacy-partner-${index}`;
            const saved = selectedPartners.find(item => item.id === partnerId);
            const label = document.createElement("label");
            label.className = "coupon-partner-option";
            const checkbox = document.createElement("input");
            checkbox.type = "checkbox";
            checkbox.name = "partnerIds";
            checkbox.value = partnerId;
            checkbox.checked = Boolean(saved);
            const copy = document.createElement("span");
            copy.className = "coupon-partner-copy";
            const name = document.createElement("b");
            name.textContent = partner.name || "Партнёр";
            const detail = document.createElement("small");
            detail.textContent = partner.detail || "Партнёр магазина";
            copy.append(name, detail);
            const commission = document.createElement("input");
            commission.className = "coupon-partner-commission";
            commission.type = "number";
            commission.name = `commission-${partnerId}`;
            commission.min = "0";
            commission.max = "100";
            commission.step = "1";
            commission.value = saved ? String(saved.commissionPercent) : "10";
            commission.setAttribute("aria-label", `Процент партнёра ${partner.name || ""}`);
            commission.disabled = !checkbox.checked;
            checkbox.addEventListener("change", () => {
                commission.disabled = !checkbox.checked;
            });
            label.append(checkbox, copy, commission);
            partnerList.append(label);
        });
    }

    function openCouponDialog(coupon = null) {
        form.reset();
        formFeedback.hidden = true;
        document.querySelector("#coupon-dialog-title").textContent = coupon ? "Редактирование купона" : "Добавление купона";
        form.elements.id.value = coupon ? coupon.id : "";
        form.elements.name.value = coupon ? coupon.name || "" : "";
        form.elements.code.value = coupon ? coupon.code || "" : "";
        form.elements.discount.value = coupon ? String(coupon.discount || 10) : "10";
        form.elements.maxUses.value = coupon && coupon.maxUses ? String(coupon.maxUses) : "";
        form.elements.startAt.value = coupon ? coupon.startAt || "" : "";
        form.elements.endAt.value = coupon ? coupon.endAt || "" : "";
        form.elements.active.checked = coupon ? coupon.active !== false : true;
        renderProductOptions(coupon && Array.isArray(coupon.productIds) ? coupon.productIds : []);
        renderPartnerOptions(coupon && Array.isArray(coupon.partners) ? coupon.partners : []);
        dialog.showModal();
        form.elements.name.focus();
    }

    function getFormPartners() {
        const partners = shop.tools && Array.isArray(shop.tools.partners) ? shop.tools.partners : [];
        return Array.from(form.querySelectorAll('input[name="partnerIds"]:checked'), checkbox => {
            const index = partners.findIndex((partner, partnerIndex) =>
                (partner.id || `legacy-partner-${partnerIndex}`) === checkbox.value
            );
            const partner = partners[index];
            const commissionInput = form.elements[`commission-${checkbox.value}`];
            const commissionPercent = Number(commissionInput.value);
            if (!Number.isInteger(commissionPercent) || commissionPercent < 0 || commissionPercent > 100) {
                throw new Error(`Укажи процент партнёра «${partner.name || "Партнёр"}» от 0 до 100.`);
            }
            if (!partner.id) {
                partner.id = checkbox.value;
            }
            return { id: checkbox.value, name: partner.name || "Партнёр", commissionPercent };
        });
    }

    function saveCoupon(event) {
        event.preventDefault();
        formFeedback.hidden = true;
        if (!form.reportValidity()) {
            return;
        }
        const name = form.elements.name.value.trim();
        const code = form.elements.code.value.trim().toUpperCase();
        const discount = Number(form.elements.discount.value);
        const maxUses = form.elements.maxUses.value ? Number(form.elements.maxUses.value) : null;
        const startAt = form.elements.startAt.value;
        const endAt = form.elements.endAt.value;
        if (!/^[A-Z0-9_-]{2,32}$/.test(code)) {
            formFeedback.textContent = "Код: от 2 до 32 символов — только латинские буквы, цифры, дефис и подчёркивание.";
            formFeedback.hidden = false;
            form.elements.code.focus();
            return;
        }
        if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
            formFeedback.textContent = "Размер скидки должен быть целым числом от 1 до 100.";
            formFeedback.hidden = false;
            form.elements.discount.focus();
            return;
        }
        if (maxUses !== null && (!Number.isInteger(maxUses) || maxUses < 1)) {
            formFeedback.textContent = "Лимит использований должен быть положительным целым числом.";
            formFeedback.hidden = false;
            form.elements.maxUses.focus();
            return;
        }
        if (startAt && endAt && new Date(startAt).getTime() > new Date(endAt).getTime()) {
            formFeedback.textContent = "Дата окончания не может быть раньше даты начала.";
            formFeedback.hidden = false;
            form.elements.endAt.focus();
            return;
        }

        const coupons = allCoupons();
        const id = form.elements.id.value;
        if (coupons.some(item => item.id !== id && String(item.code).toUpperCase() === code)) {
            formFeedback.textContent = "Такой код уже есть в этом магазине.";
            formFeedback.hidden = false;
            form.elements.code.focus();
            return;
        }

        let partners;
        try {
            partners = getFormPartners();
        } catch (error) {
            formFeedback.textContent = error.message;
            formFeedback.hidden = false;
            return;
        }

        const existing = coupons.find(item => item.id === id);
        const updated = {
            id: id || createId(),
            name,
            code,
            discount,
            maxUses,
            uses: existing ? Math.max(0, Number(existing.uses) || 0) : 0,
            startAt,
            endAt,
            productIds: Array.from(form.querySelectorAll('input[name="productIds"]:checked'), checkbox => checkbox.value),
            partners,
            active: form.elements.active.checked
        };
        try {
            shop.coupons = [...coupons.filter(item => item.id !== id), updated];
            saveShop();
            dialog.close();
            renderCoupons();
            showToast(existing ? "Изменения купона сохранены." : "Купон добавлен в демо-магазин.");
        } catch (error) {
            formFeedback.textContent = `Не удалось сохранить купон: ${error.message}`;
            formFeedback.hidden = false;
        }
    }

    document.querySelector("#add-coupon").addEventListener("click", () => openCouponDialog());
    document.querySelector("#empty-add-coupon").addEventListener("click", () => openCouponDialog());
    document.querySelector("#close-coupon-dialog").addEventListener("click", () => dialog.close());
    document.querySelector("#cancel-coupon").addEventListener("click", () => dialog.close());
    form.addEventListener("submit", saveCoupon);

    couponGrid.addEventListener("click", async event => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }
        const coupons = allCoupons();
        const coupon = coupons.find(item => item.id === button.dataset.couponId);
        if (!coupon) {
            showToast("Купон не найден. Обновите страницу и попробуйте снова.");
            return;
        }
        if (button.dataset.action === "edit") {
            openCouponDialog(coupon);
        } else if (button.dataset.action === "toggle") {
            try {
                shop.coupons = coupons.map(item => item.id === coupon.id ? { ...item, active: item.active === false } : item);
                saveShop();
                renderCoupons();
                showToast(coupon.active === false ? "Купон включён." : "Купон выключен.");
            } catch (error) {
                showToast(`Не удалось изменить купон: ${error.message}`);
            }
        } else if (button.dataset.action === "delete") {
            pendingDeleteId = coupon.id;
            document.querySelector("#coupon-delete-name").textContent = coupon.name;
            deleteDialog.showModal();
        } else if (button.dataset.action === "copy") {
            try {
                if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
                    throw new Error("Копирование недоступно в браузере.");
                }
                await navigator.clipboard.writeText(coupon.code);
                showToast("Код купона скопирован.");
            } catch (error) {
                showToast(`Не удалось скопировать код: ${error.message}`);
            }
        }
    });

    document.querySelector("#cancel-coupon-delete").addEventListener("click", () => {
        pendingDeleteId = null;
        deleteDialog.close();
    });
    document.querySelector("#confirm-coupon-delete").addEventListener("click", () => {
        try {
            shop.coupons = allCoupons().filter(coupon => coupon.id !== pendingDeleteId);
            saveShop();
            renderCoupons();
            deleteDialog.close();
            showToast("Купон удалён.");
        } catch (error) {
            showToast(`Не удалось удалить купон: ${error.message}`);
        } finally {
            pendingDeleteId = null;
        }
    });

    document.querySelector("#logout-button").addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });

    try {
        shops = readShops();
        shop = shops.find(item => item.id === shopId);
        if (!shop) {
            throw new Error("Магазин не найден или уже удалён.");
        }
        shop.tools = shop.tools && typeof shop.tools === "object" ? shop.tools : {};
        shop.products = Array.isArray(shop.products) ? shop.products : [];
        shop.coupons = allCoupons();
        document.title = `Купоны — ${shop.name} — SDonate`;
        document.querySelector("#coupons-shop-caption").textContent = `Управляйте купонами магазина «${shop.name}»`;
        renderCoupons();
    } catch (error) {
        showToast(`Не удалось открыть купоны: ${error.message}`);
        window.setTimeout(() => window.location.replace("./shops.html"), 1800);
    }
})();
