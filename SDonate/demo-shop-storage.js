(() => {
    const legacyKey = "sdonate-demo-shops";
    const emailKeyPrefix = `${legacyKey}:`;

    function getIdentity() {
        if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
            throw new Error("Войди в аккаунт, чтобы открыть магазины.");
        }

        const id = sessionStorage.getItem("sdonate-demo-user-id");
        const email = String(sessionStorage.getItem("sdonate-demo-email") || "").trim().toLowerCase();
        const value = id || email;
        if (!value) {
            throw new Error("Не удалось определить аккаунт. Выйди и войди снова.");
        }
        return { value, email };
    }

    function storageKey() {
        const { value, email } = getIdentity();
        const key = `${legacyKey}:account:${encodeURIComponent(value)}`;
        if (sessionStorage.getItem(key) !== null) {
            return key;
        }

        const migrationKeys = [];
        if (email) {
            migrationKeys.push(`${emailKeyPrefix}${encodeURIComponent(email)}`);
        }
        migrationKeys.push(legacyKey);

        for (const sourceKey of migrationKeys) {
            const stored = sessionStorage.getItem(sourceKey);
            if (stored === null) {
                continue;
            }

            const shops = JSON.parse(stored);
            if (!Array.isArray(shops)) {
                throw new Error("Сохранённый список магазинов имеет неверный формат.");
            }
            const ownedShops = shops.filter(shop =>
                shop && (shop.ownerId
                    ? shop.ownerId === value
                    : (typeof shop.ownerEmail !== "string" || !email || shop.ownerEmail.toLowerCase() === email))
            ).map(shop => ({ ...shop, ownerId: value, ownerEmail: email }));
            const otherShops = shops.filter(shop =>
                shop && (shop.ownerId
                    ? shop.ownerId !== value
                    : (typeof shop.ownerEmail === "string" && email && shop.ownerEmail.toLowerCase() !== email))
            );

            if (ownedShops.length) {
                sessionStorage.setItem(key, JSON.stringify(ownedShops));
            }
            if (otherShops.length) {
                sessionStorage.setItem(sourceKey, JSON.stringify(otherShops));
            } else {
                sessionStorage.removeItem(sourceKey);
            }
            if (sessionStorage.getItem(key) !== null) {
                break;
            }
        }

        return key;
    }

    function save(shops) {
        if (!Array.isArray(shops)) {
            throw new Error("Список магазинов имеет неверный формат.");
        }
        const { value, email } = getIdentity();
        const ownedShops = shops.map(shop => {
            if (!shop || (shop.ownerId && shop.ownerId !== value) ||
                (!shop.ownerId && typeof shop.ownerEmail === "string" && email && shop.ownerEmail.toLowerCase() !== email)) {
                throw new Error("Нельзя сохранить магазин другого аккаунта.");
            }
            return { ...shop, ownerId: value, ownerEmail: email };
        });
        sessionStorage.setItem(storageKey(), JSON.stringify(ownedShops));
    }

    window.sdonateShopStorage = { storageKey, save };
})();
