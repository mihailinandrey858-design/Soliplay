if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKey = window.sdonateShopStorage.storageKey();
    const shopId = new URLSearchParams(window.location.search).get("id");
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const imagesForm = document.querySelector("#images-form");
    const imagesMessage = document.querySelector("#images-message");
    const toast = document.querySelector("#images-toast");
    const logoutButton = document.querySelector("#logout-button");
    const draftImages = {
        icon: null,
        logo: null,
        background: null,
        additional: null
    };
    const previewFallbacks = {
        icon: "◇",
        logo: "SD",
        background: "ФОН",
        additional: "ИЗОБРАЖЕНИЕ"
    };
    let shops;
    let shop;
    let toastTimer;

    document.querySelector("#account-name").textContent = nickname;
    document.querySelector("#account-avatar").textContent = Array.from(nickname)[0].toUpperCase();

    function readShops() {
        const stored = sessionStorage.getItem(storageKey);
        if (stored === null) {
            throw new Error("Список магазинов не найден.");
        }

        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed) || parsed.some(item =>
            !item ||
            typeof item.id !== "string" ||
            typeof item.name !== "string" ||
            typeof item.address !== "string"
        )) {
            throw new Error("Сохранённый список магазинов имеет неверный формат.");
        }
        return parsed;
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
        imagesMessage.textContent = text;
        imagesMessage.classList.toggle("error-message", isError);
        imagesMessage.hidden = false;
    }

    function renderPreview(key) {
        const preview = document.querySelector(`#preview-${key}`);
        const imageSource = draftImages[key];
        preview.replaceChildren();
        if (imageSource) {
            const image = document.createElement("img");
            image.src = imageSource;
            image.alt = `Предпросмотр: ${key}`;
            preview.append(image);
            return;
        }

        const fallback = document.createElement("span");
        fallback.textContent = previewFallbacks[key];
        preview.append(fallback);
    }

    async function resolveSavedImage(value) {
        const assetKey = window.sdonateImageStorage.keyFromReference(value);
        if (assetKey) {
            const image = await window.sdonateImageStorage.get(assetKey);
            if (!image) {
                throw new Error("Сохранённое изображение не найдено в хранилище.");
            }
            return image;
        }
        return typeof value === "string" ? value : null;
    }

    function getImageDimensions(dataUrl) {
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.addEventListener("load", () => resolve({
                width: image.naturalWidth,
                height: image.naturalHeight
            }), { once: true });
            image.addEventListener("error", () => reject(new Error("Файл не является корректным изображением.")), { once: true });
            image.src = dataUrl;
        });
    }

    function handleFileChange(key, input) {
        input.addEventListener("change", async () => {
            imagesMessage.hidden = true;
            const [file] = input.files || [];
            if (!file) {
                return;
            }

            if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
                showMessage("Выбери изображение PNG, JPG или WEBP.", true);
                input.value = "";
                return;
            }
            if (file.size > 2 * 1024 * 1024) {
                showMessage("Размер одного изображения не должен превышать 2 МБ.", true);
                input.value = "";
                return;
            }

            const reader = new FileReader();
            reader.addEventListener("load", async () => {
                if (typeof reader.result !== "string") {
                    showMessage("Не удалось прочитать изображение.", true);
                    return;
                }

                try {
                    const dimensions = await getImageDimensions(reader.result);
                    if (dimensions.width < 1 || dimensions.height < 1) {
                        throw new Error("Не удалось определить размер изображения.");
                    }
                    draftImages[key] = reader.result;
                    renderPreview(key);
                } catch (error) {
                    showMessage(`Не удалось показать изображение: ${error.message}`, true);
                }
            }, { once: true });
            reader.addEventListener("error", () => {
                showMessage("Не удалось прочитать файл изображения.", true);
            }, { once: true });
            reader.readAsDataURL(file);
        });
    }

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
        const backUrl = `./store-settings.html?id=${encodeURIComponent(shop.id)}`;
        document.querySelector("#back-to-settings").href = backUrl;
        document.querySelector("#images-back-button").href = backUrl;
        document.title = `Картинки: ${shop.name} — SDonate`;

        const savedImages = shop.images && typeof shop.images === "object" ? shop.images : {};
        for (const key of Object.keys(draftImages)) {
            draftImages[key] = null;
            handleFileChange(key, document.querySelector(`#upload-${key}`));
        }

        Promise.all(Object.keys(draftImages).map(async key => {
            draftImages[key] = await resolveSavedImage(savedImages[key]);
            renderPreview(key);
        })).catch(error => {
            showMessage(`Не удалось загрузить сохранённые изображения: ${error.message}`, true);
        });

        document.querySelectorAll("[data-reset-image]").forEach(button => {
            button.addEventListener("click", () => {
                const key = button.dataset.resetImage;
                draftImages[key] = null;
                document.querySelector(`#upload-${key}`).value = "";
                renderPreview(key);
                imagesMessage.hidden = true;
            });
        });

        imagesForm.addEventListener("submit", async event => {
            event.preventDefault();
            imagesMessage.hidden = true;
            const newAssetKeys = [];
            try {
                shops = readShops();
                const currentShop = shops.find(item => item.id === shopId);
                if (!currentShop) {
                    throw new Error("Магазин не найден.");
                }

                const nextImages = {};
                for (const [key, image] of Object.entries(draftImages)) {
                    if (!image) {
                        nextImages[key] = null;
                        continue;
                    }
                    if (window.sdonateImageStorage.keyFromReference(image)) {
                        nextImages[key] = image;
                        continue;
                    }
                    const assetKey = window.sdonateImageStorage.createKey(shopId, key);
                    await window.sdonateImageStorage.set(assetKey, image);
                    newAssetKeys.push(assetKey);
                    nextImages[key] = window.sdonateImageStorage.reference(assetKey);
                }

                const previousAssetKeys = Object.values(currentShop.images || {})
                    .map(value => window.sdonateImageStorage.keyFromReference(value))
                    .filter(Boolean);
                currentShop.images = nextImages;
                window.sdonateShopStorage.save(shops);
                shop = currentShop;
                await window.sdonateImageStorage.delete(previousAssetKeys.filter(key =>
                    !Object.values(nextImages).some(value => window.sdonateImageStorage.keyFromReference(value) === key)
                ));
                showMessage("Изображения сохранены в демо-магазине до закрытия вкладки.", false);
            } catch (error) {
                let message = error.message;
                try {
                    await window.sdonateImageStorage.delete(newAssetKeys);
                } catch (cleanupError) {
                    message += ` Не удалось очистить временные файлы: ${cleanupError.message}`;
                }
                showMessage(`Не удалось сохранить изображения: ${message}`, true);
            }
        });

        document.querySelector("#cancel-images").addEventListener("click", () => {
            window.location.assign(backUrl);
        });

        logoutButton.addEventListener("click", () => {
            sessionStorage.removeItem("sdonate-demo-authenticated");
            window.location.assign("./reg.html?mode=login");
        });
    }
}
