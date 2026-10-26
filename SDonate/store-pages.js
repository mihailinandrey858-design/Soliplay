(() => {
    if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
        window.location.replace("./reg.html?mode=login");
        return;
    }

    const params = new URLSearchParams(window.location.search);
    const shopId = params.get("id");
    const storageKey = window.sdonateShopStorage.storageKey();
    const form = document.querySelector("#page-form");
    const content = document.querySelector("#page-content");
    const preview = document.querySelector("#page-live-preview");
    const pagesList = document.querySelector("#pages-list");
    const pagesEmpty = document.querySelector("#pages-empty");
    const feedback = document.querySelector("#pages-form-feedback");
    const toast = document.querySelector("#pages-toast");
    const deleteDialog = document.querySelector("#pages-delete-dialog");
    let shop;
    let editingId = null;
    let deletingId = null;
    let toastTimer;

    function createId() {
        return window.crypto && typeof window.crypto.randomUUID === "function"
            ? window.crypto.randomUUID()
            : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            throw new Error("Список магазинов не найден.");
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.some(item => !item || typeof item.id !== "string" || typeof item.name !== "string")) {
            throw new Error("Список магазинов имеет неверный формат.");
        }
        return parsed;
    }

    function saveShop() {
        const shops = readShops();
        const index = shops.findIndex(item => item.id === shopId);
        if (index < 0) {
            throw new Error("Магазин не найден.");
        }
        shops[index] = shop;
        window.sdonateShopStorage.save(shops);
    }

    function getPages() {
        const pages = shop.tools && Array.isArray(shop.tools.pages) ? shop.tools.pages : [];
        return pages.map(page => {
            if (page.address) {
                return {
                    id: page.id || createId(),
                    title: page.title || page.name || "Страница",
                    description: page.description || page.detail || "",
                    address: page.address,
                    content: page.content || ""
                };
            }
            const legacyTitle = page.title || page.name || "Страница";
            return {
                id: page.id || createId(),
                title: legacyTitle,
                description: page.description || page.detail || "",
                address: legacyTitle.toLowerCase().replace(/[^a-zа-яё0-9]+/gi, "-").replace(/^-|-$/g, "") || "page",
                content: page.content || ""
            };
        });
    }

    function showToast(message) {
        window.clearTimeout(toastTimer);
        toast.textContent = message;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3200);
    }

    function isExternalAddress(address) {
        try {
            const url = new URL(address);
            return /^https?:\/\//i.test(address) && ["https:", "http:"].includes(url.protocol);
        } catch {
            return false;
        }
    }

    function getPageUrl(page) {
        if (isExternalAddress(page.address)) {
            return page.address;
        }
        return `./public-page.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(shop.ownerId || sessionStorage.getItem("sdonate-demo-user-id") || "")}&slug=${encodeURIComponent(page.address)}`;
    }

    function renderPages() {
        const pages = getPages();
        pagesList.replaceChildren();
        pages.forEach(page => {
            const card = document.createElement("article");
            card.className = "pages-card";
            const copy = document.createElement("div");
            copy.className = "pages-card-copy";
            const title = document.createElement("h3");
            title.textContent = page.title;
            const description = document.createElement("p");
            description.textContent = page.description;
            const address = document.createElement("span");
            address.className = "pages-card-address";
            address.textContent = isExternalAddress(page.address) ? page.address : `/${page.address}`;
            copy.append(title, description, address);
            const actions = document.createElement("div");
            actions.className = "pages-card-actions";
            const open = document.createElement("a");
            open.className = "pages-open-link";
            open.href = getPageUrl(page);
            open.target = "_blank";
            open.rel = "noopener noreferrer";
            open.textContent = "Открыть";
            const edit = document.createElement("button");
            edit.className = "pages-icon-button";
            edit.type = "button";
            edit.dataset.action = "edit";
            edit.dataset.id = page.id;
            edit.setAttribute("aria-label", `Изменить ${page.title}`);
            edit.textContent = "✎";
            const remove = document.createElement("button");
            remove.className = "pages-icon-button danger";
            remove.type = "button";
            remove.dataset.action = "delete";
            remove.dataset.id = page.id;
            remove.setAttribute("aria-label", `Удалить ${page.title}`);
            remove.textContent = "×";
            actions.append(open, edit, remove);
            card.append(copy, actions);
            pagesList.append(card);
        });
        pagesEmpty.hidden = pages.length > 0;
        document.querySelector("#pages-count").textContent = `${pages.length} ${pages.length === 1 ? "страница" : pages.length > 1 && pages.length < 5 ? "страницы" : "страниц"}`;
    }

    function updatePreview() {
        document.querySelector("#page-character-count").textContent = `${content.value.length} / 20000 символов`;
        window.sdonateMarkdown.render(content.value, preview);
    }

    function resetForm() {
        form.reset();
        editingId = null;
        feedback.hidden = true;
        document.querySelector("#page-form-title").textContent = "Добавление страницы";
        document.querySelector("#pages-save-label").textContent = "Добавить страницу";
        document.querySelector("#cancel-edit").hidden = true;
        document.querySelector("#page-auto-preview").checked = true;
        document.querySelectorAll(".pages-view-button").forEach(button => {
            button.classList.toggle("active", button.dataset.view === "split");
            button.setAttribute("aria-pressed", String(button.dataset.view === "split"));
        });
        document.querySelector("#pages-editor-workspace").dataset.view = "split";
        updatePreview();
    }

    function editPage(page) {
        editingId = page.id;
        form.elements.title.value = page.title;
        form.elements.description.value = page.description;
        form.elements.address.value = page.address;
        content.value = page.content;
        document.querySelector("#page-form-title").textContent = "Редактирование страницы";
        document.querySelector("#pages-save-label").textContent = "Сохранить изменения";
        document.querySelector("#cancel-edit").hidden = false;
        updatePreview();
        form.scrollIntoView({ behavior: "smooth", block: "start" });
        form.elements.title.focus({ preventScroll: true });
    }

    form.addEventListener("input", event => {
        if (event.target === content || event.target === document.querySelector("#page-auto-preview")) {
            if (document.querySelector("#page-auto-preview").checked) {
                updatePreview();
            } else {
                document.querySelector("#page-character-count").textContent = `${content.value.length} / 20000 символов`;
            }
        }
    });
    document.querySelector("#page-auto-preview").addEventListener("change", event => {
        if (event.target.checked) {
            updatePreview();
        }
    });

    document.querySelectorAll(".pages-view-button").forEach(button => {
        button.addEventListener("click", () => {
            const workspace = document.querySelector("#pages-editor-workspace");
            workspace.dataset.view = button.dataset.view;
            document.querySelectorAll(".pages-view-button").forEach(item => {
                const active = item === button;
                item.classList.toggle("active", active);
                item.setAttribute("aria-pressed", String(active));
            });
        });
    });

    document.querySelectorAll(".pages-editor-toolbar button[data-insert], .pages-editor-toolbar button[data-prefix]").forEach(button => {
        button.addEventListener("click", () => {
            const start = content.selectionStart;
            const end = content.selectionEnd;
            const selected = content.value.slice(start, end);
            const insertion = button.dataset.insert || "";
            const prefix = button.dataset.prefix || "";
            let replacement;
            let selectionStart;
            let selectionEnd;
            if (insertion) {
                const marker = insertion.match(/^(\*\*|\*|~~|`|\[)/);
                if (selected && marker) {
                    const suffix = insertion.endsWith("](https://example.com)") ? "](https://example.com)" : marker[1];
                    replacement = `${marker[1]}${selected}${suffix}`;
                    selectionStart = start + marker[1].length;
                    selectionEnd = selectionStart + selected.length;
                } else {
                    replacement = insertion;
                    selectionStart = start + insertion.indexOf("текст");
                    selectionEnd = selectionStart + (insertion.includes("текст") ? 5 : 0);
                }
            } else {
                replacement = `${prefix}${selected || "текст"}`;
                selectionStart = start + prefix.length;
                selectionEnd = start + replacement.length;
            }
            content.setRangeText(replacement, start, end, "end");
            content.focus();
            content.setSelectionRange(selectionStart, selectionEnd);
            if (document.querySelector("#page-auto-preview").checked) {
                updatePreview();
            } else {
                document.querySelector("#page-character-count").textContent = `${content.value.length} / 20000 символов`;
            }
        });
    });

    form.addEventListener("submit", event => {
        event.preventDefault();
        feedback.hidden = true;
        if (!form.reportValidity()) {
            return;
        }
        const title = form.elements.title.value.trim();
        const description = form.elements.description.value.trim();
        const address = form.elements.address.value.trim();
        if (!isExternalAddress(address) && !/^[a-zа-яё0-9][a-zа-яё0-9_-]{0,59}$/i.test(address)) {
            feedback.textContent = "Адрес должен быть коротким именем без пробелов (например, rules) или полной ссылкой http(s).";
            feedback.hidden = false;
            form.elements.address.focus();
            return;
        }
        if (/^[a-z][a-z0-9+.-]*:/i.test(address) && !isExternalAddress(address)) {
            feedback.textContent = "Можно использовать только внешние ссылки http:// или https://.";
            feedback.hidden = false;
            form.elements.address.focus();
            return;
        }

        const pages = getPages();
        if (pages.some(page => page.id !== editingId && page.address.toLowerCase() === address.toLowerCase())) {
            feedback.textContent = "Такой адрес уже используется другой страницей этого магазина.";
            feedback.hidden = false;
            form.elements.address.focus();
            return;
        }
        const wasEditing = Boolean(editingId);
        const page = { id: editingId || createId(), title, description, address, content: content.value };
        try {
            shop.tools.pages = [...pages.filter(item => item.id !== editingId), page];
            saveShop();
            resetForm();
            renderPages();
            showToast(wasEditing ? "Страница обновлена." : "Страница добавлена.");
        } catch (error) {
            feedback.textContent = `Не удалось сохранить страницу: ${error.message}`;
            feedback.hidden = false;
        }
    });

    pagesList.addEventListener("click", event => {
        const button = event.target.closest("button[data-action]");
        if (!button) {
            return;
        }
        const page = getPages().find(item => item.id === button.dataset.id);
        if (!page) {
            showToast("Страница не найдена. Обновите список.");
            return;
        }
        if (button.dataset.action === "edit") {
            editPage(page);
        } else if (button.dataset.action === "delete") {
            deletingId = page.id;
            document.querySelector("#pages-delete-title").textContent = page.title;
            deleteDialog.showModal();
        }
    });

    document.querySelector("#cancel-edit").addEventListener("click", resetForm);
    document.querySelector("#reset-page-form").addEventListener("click", resetForm);
    document.querySelector("#cancel-page-delete").addEventListener("click", () => {
        deletingId = null;
        deleteDialog.close();
    });
    document.querySelector("#confirm-page-delete").addEventListener("click", () => {
        try {
            shop.tools.pages = getPages().filter(page => page.id !== deletingId);
            saveShop();
            renderPages();
            deleteDialog.close();
            if (editingId === deletingId) {
                resetForm();
            }
            showToast("Страница удалена.");
        } catch (error) {
            showToast(`Не удалось удалить страницу: ${error.message}`);
        } finally {
            deletingId = null;
        }
    });

    document.querySelector("#logout-button").addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });

    try {
        const shops = readShops();
        shop = shops.find(item => item.id === shopId);
        if (!shop) {
            throw new Error("Магазин не найден.");
        }
        shop.tools = shop.tools && typeof shop.tools === "object" ? shop.tools : {};
        if (Array.isArray(shop.tools.pages) && shop.tools.pages.some(page =>
            !page || typeof page.id !== "string" || typeof page.title !== "string" || typeof page.address !== "string"
        )) {
            shop.tools.pages = getPages();
            saveShop();
        }
        document.title = `Страницы — ${shop.name} — SDonate`;
        document.querySelector("#pages-shop-caption").textContent = `Создавайте страницы для магазина «${shop.name}».`;
        document.querySelector("#back-to-shop").href = `./shop-dashboard.html?id=${encodeURIComponent(shop.id)}`;
        document.querySelector("#open-store-preview").href = `./public-store.html?id=${encodeURIComponent(shop.id)}&owner=${encodeURIComponent(shop.ownerId || sessionStorage.getItem("sdonate-demo-user-id") || "")}`;
        renderPages();
        updatePreview();
    } catch (error) {
        showToast(`Не удалось открыть страницы: ${error.message}`);
        window.setTimeout(() => window.location.replace("./shops.html"), 1800);
    }
})();
