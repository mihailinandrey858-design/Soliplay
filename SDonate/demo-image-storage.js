(function () {
    const databaseName = "sdonate-demo-image-assets";
    const storeName = "images";
    let databasePromise;

    function openDatabase() {
        if (databasePromise) {
            return databasePromise;
        }
        if (!window.indexedDB) {
            return Promise.reject(new Error("Браузер не поддерживает IndexedDB для хранения изображений."));
        }
        databasePromise = new Promise((resolve, reject) => {
            const request = window.indexedDB.open(databaseName, 1);
            request.addEventListener("upgradeneeded", () => {
                const database = request.result;
                if (!database.objectStoreNames.contains(storeName)) {
                    database.createObjectStore(storeName, { keyPath: "key" });
                }
            });
            request.addEventListener("success", () => resolve(request.result), { once: true });
            request.addEventListener("error", () => {
                databasePromise = null;
                reject(request.error || new Error("Не удалось открыть хранилище изображений."));
            }, { once: true });
            request.addEventListener("blocked", () => {
                databasePromise = null;
                reject(new Error("Хранилище изображений занято другой вкладкой. Закрой старые вкладки сайта и повтори."));
            }, { once: true });
        });
        return databasePromise;
    }

    function runTransaction(mode, action) {
        return openDatabase().then(database => new Promise((resolve, reject) => {
            const transaction = database.transaction(storeName, mode);
            let result;
            transaction.objectStore(storeName);
            try {
                result = action(transaction.objectStore(storeName));
            } catch (error) {
                reject(error);
                return;
            }
            transaction.addEventListener("complete", () => resolve(result), { once: true });
            transaction.addEventListener("abort", () => {
                reject(transaction.error || new Error("Операция с изображением прервана."));
            }, { once: true });
            transaction.addEventListener("error", () => {
                reject(transaction.error || new Error("Не удалось сохранить изображение."));
            }, { once: true });
        }));
    }

    window.sdonateImageStorage = {
        reference(key) {
            return `idb:${key}`;
        },
        keyFromReference(value) {
            return typeof value === "string" && value.startsWith("idb:")
                ? value.slice(4)
                : null;
        },
        createKey(shopId, slot) {
            const id = window.crypto && typeof window.crypto.randomUUID === "function"
                ? window.crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            return `${shopId}:${slot}:${id}`;
        },
        async get(key) {
            return runTransaction("readonly", store => new Promise((resolve, reject) => {
                const request = store.get(key);
                request.addEventListener("success", () => resolve(request.result?.data || null), { once: true });
                request.addEventListener("error", () => reject(request.error || new Error("Не удалось загрузить изображение.")), { once: true });
            }));
        },
        async set(key, data) {
            try {
                await runTransaction("readwrite", store => store.put({ key, data }));
            } catch (error) {
                if (error.name === "QuotaExceededError") {
                    throw new Error("В браузере закончилось место для изображений. Удали старые фото или освободи место в настройках браузера.");
                }
                throw error;
            }
        },
        async delete(keys) {
            const uniqueKeys = [...new Set(keys.filter(key => typeof key === "string" && key))];
            if (!uniqueKeys.length) {
                return;
            }
            await runTransaction("readwrite", store => {
                uniqueKeys.forEach(key => store.delete(key));
            });
        }
    };
}());
