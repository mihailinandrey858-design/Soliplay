function getAvatarStorageKey(email) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    return normalizedEmail ? `sdonate-profile-avatar:${normalizedEmail}` : null;
}

function renderAccountAvatar(source) {
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    document.querySelectorAll(".account-avatar").forEach(avatar => {
        if (source) {
            const image = document.createElement("img");
            image.src = source;
            image.alt = "Аватар профиля";
            avatar.replaceChildren(image);
            return;
        }
        avatar.textContent = Array.from(nickname)[0].toUpperCase();
    });
}

window.sdonateGetAvatar = function () {
    const key = getAvatarStorageKey(sessionStorage.getItem("sdonate-demo-email"));
    return key ? localStorage.getItem(key) : null;
};

window.sdonateRenderAvatar = function (source) {
    renderAccountAvatar(source);
};

window.sdonateSetAvatar = function (source) {
    const key = getAvatarStorageKey(sessionStorage.getItem("sdonate-demo-email"));
    if (!key) {
        throw new Error("Сначала войди в аккаунт, чтобы сохранить аватар.");
    }
    if (source) {
        localStorage.setItem(key, source);
    } else {
        localStorage.removeItem(key);
    }
    renderAccountAvatar(source);
};

window.sdonateMoveAvatar = function (oldEmail, newEmail) {
    const oldKey = getAvatarStorageKey(oldEmail);
    const newKey = getAvatarStorageKey(newEmail);
    if (!oldKey || !newKey || oldKey === newKey) {
        return;
    }
    const source = localStorage.getItem(oldKey);
    if (source) {
        localStorage.setItem(newKey, source);
        localStorage.removeItem(oldKey);
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const key = getAvatarStorageKey(sessionStorage.getItem("sdonate-demo-email"));
    renderAccountAvatar(key ? localStorage.getItem(key) : null);
}, { once: true });

window.sdonateEndSession = async function () {
    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: "{}"
        });
        if (!response.ok) {
            throw new Error(`Сервер вернул статус ${response.status}.`);
        }
        sessionStorage.removeItem("sdonate-demo-authenticated");
        sessionStorage.removeItem("sdonate-demo-nickname");
        sessionStorage.removeItem("sdonate-demo-email");
        sessionStorage.removeItem("sdonate-demo-user-id");
        window.location.assign("./reg.html?mode=login");
    } catch (error) {
        console.error("Не удалось завершить серверную сессию:", error);
        document.querySelectorAll("#logout-button, #settings-logout").forEach(button => {
            button.disabled = false;
        });
        window.alert("Не удалось связаться с сервером. Сеанс не завершён — попробуй ещё раз.");
    }
};

document.addEventListener("click", event => {
    const button = event.target.closest("#logout-button, #settings-logout");
    if (!button) {
        return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled = true;
    window.sdonateEndSession();
}, true);
