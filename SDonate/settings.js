if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const storageKeys = {
        nickname: "sdonate-demo-nickname",
        email: "sdonate-demo-email",
        chart: "sdonate-demo-chart"
    };
    const nicknameInput = document.querySelector("#nickname");
    const emailInput = document.querySelector("#email");
    const profileForm = document.querySelector("#profile-form");
    const profileMessage = document.querySelector("#profile-message");
    const avatarFile = document.querySelector("#avatar-file");
    const avatarPreview = document.querySelector("#avatar-preview");
    const avatarInitial = document.querySelector("#avatar-initial");
    const avatarReset = document.querySelector("#avatar-reset");
    const avatarError = document.querySelector("#avatar-error");
    const twoFactorToggle = document.querySelector("#two-factor-toggle");
    const twoFactorState = document.querySelector("#two-factor-state");
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const settingsAccountName = document.querySelector("#settings-account-name");
    const chartSelect = document.querySelector("#chart-style");
    const dialog = document.querySelector("#settings-dialog");
    const dialogForm = document.querySelector("#settings-dialog-form");
    const dialogFields = document.querySelector("#dialog-fields");
    const dialogMark = document.querySelector("#dialog-mark");
    const dialogTitle = document.querySelector("#dialog-title");
    const dialogDescription = document.querySelector("#dialog-description");
    const dialogFeedback = document.querySelector("#dialog-feedback");
    const dialogActions = document.querySelector("#dialog-actions");
    const dialogConfirm = document.querySelector("#dialog-confirm");
    const dialogCancel = document.querySelector("#dialog-cancel");
    const toast = document.querySelector("#settings-toast");
    const logoutButton = document.querySelector("#logout-button");
    const settingsLogoutButton = document.querySelector("#settings-logout");
    let dialogMode = "email";
    let toastTimer;

    function getStoredValue(key, fallback) {
        return sessionStorage.getItem(key) || fallback;
    }

    function showToast(text) {
        window.clearTimeout(toastTimer);
        toast.textContent = text;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function updateProfileHeader(nickname) {
        accountName.textContent = nickname;
        settingsAccountName.textContent = nickname;
        accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
        window.sdonateRenderAvatar(window.sdonateGetAvatar());
    }

    function renderAvatar(source) {
        avatarPreview.replaceChildren();

        if (source) {
            const image = document.createElement("img");
            image.src = source;
            image.alt = "Предпросмотр аватара";
            avatarPreview.append(image);
            avatarReset.hidden = false;
            return;
        }

        avatarInitial.textContent = Array.from(nicknameInput.value || "S")[0].toUpperCase();
        avatarPreview.append(avatarInitial);
        avatarReset.hidden = true;
    }

    nicknameInput.value = getStoredValue(storageKeys.nickname, "Игрок");
    emailInput.value = getStoredValue(storageKeys.email, "");
    chartSelect.value = getStoredValue(storageKeys.chart, "area");
    updateProfileHeader(nicknameInput.value);
    renderAvatar(window.sdonateGetAvatar());

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });

    settingsLogoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });

    nicknameInput.addEventListener("input", () => {
        if (!avatarPreview.querySelector("img")) {
            avatarInitial.textContent = Array.from(nicknameInput.value || "S")[0].toUpperCase();
        }
    });

    profileForm.addEventListener("submit", event => {
        event.preventDefault();

        if (!profileForm.reportValidity()) {
            return;
        }

        const nickname = nicknameInput.value.trim();
        const previousEmail = sessionStorage.getItem(storageKeys.email) || "";
        const email = emailInput.value.trim().toLowerCase();
        sessionStorage.setItem(storageKeys.nickname, nickname);
        sessionStorage.setItem(storageKeys.email, email);
        sessionStorage.setItem(storageKeys.chart, chartSelect.value);
        window.sdonateMoveAvatar(previousEmail, email);
        updateProfileHeader(nickname);

        profileMessage.textContent = "Демо: настройки профиля сохраняются до закрытия вкладки. Аватар сохранён в этом браузере; серверный профиль не изменён.";
        profileMessage.hidden = false;
    });

    async function compressAvatar(file) {
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

        const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
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
                throw new Error("Браузер не поддерживает сжатие изображения.");
            }
            if (blob.size <= 400 * 1024) {
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

        throw new Error("Не удалось сжать изображение до допустимого размера.");
    }

    avatarFile.addEventListener("change", async () => {
        avatarError.hidden = true;
        const [file] = avatarFile.files || [];

        if (!file) {
            return;
        }

        if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
            avatarError.textContent = "Выбери изображение PNG, JPG или WEBP.";
            avatarError.hidden = false;
            avatarFile.value = "";
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            avatarError.textContent = "Размер изображения не должен превышать 10 МБ.";
            avatarError.hidden = false;
            avatarFile.value = "";
            return;
        }

        try {
            const source = await compressAvatar(file);
            window.sdonateSetAvatar(source);
            renderAvatar(source);
            showToast("Аватар сохранён в этом браузере и останется после обновления страницы.");
        } catch (error) {
            avatarError.textContent = `Не удалось сохранить аватар: ${error.message}`;
            avatarError.hidden = false;
        }
    });

    avatarReset.addEventListener("click", () => {
        avatarFile.value = "";
        window.sdonateSetAvatar("");
        renderAvatar("");
        showToast("Аватар удалён из этого браузера.");
    });

    twoFactorToggle.addEventListener("click", () => {
        const enabled = twoFactorToggle.getAttribute("aria-pressed") !== "true";
        twoFactorToggle.setAttribute("aria-pressed", String(enabled));
        twoFactorToggle.textContent = enabled ? "Выключить 2FA" : "Включить 2FA";
        twoFactorState.textContent = enabled ? "Демо · включена" : "Выключена";
        twoFactorState.classList.toggle("enabled", enabled);
        showToast(enabled
            ? "Демо-переключатель включён. Коды подтверждения не создаются."
            : "Демо-переключатель выключен.");
    });

    function appendDialogInput(label, name, type, value, autocomplete) {
        const fieldLabel = document.createElement("label");
        fieldLabel.className = "dialog-field";
        fieldLabel.htmlFor = `dialog-${name}`;
        fieldLabel.textContent = label;

        const input = document.createElement("input");
        input.className = "dialog-input";
        input.id = `dialog-${name}`;
        input.name = name;
        input.type = type;
        input.value = value;
        input.autocomplete = autocomplete;
        input.required = true;
        if (type === "password") {
            input.minLength = 8;
        }

        dialogFields.append(fieldLabel, input);
        return input;
    }

    function openActionDialog(mode) {
        dialogMode = mode;
        dialogFields.replaceChildren();
        dialogFeedback.hidden = true;
        dialogFeedback.classList.remove("error");
        dialogActions.hidden = false;
        dialogConfirm.type = "submit";
        dialogConfirm.textContent = "Продолжить";
        dialogCancel.hidden = false;

        if (mode === "email") {
            dialogMark.textContent = "✉";
            dialogTitle.textContent = "Изменить почту";
            dialogDescription.textContent = "Демо-изменение сохранится только в текущей вкладке. Подтверждение email не отправляется.";
            appendDialogInput("Новый email", "email", "email", emailInput.value, "email");
        } else if (mode === "password") {
            dialogMark.textContent = "⌑";
            dialogTitle.textContent = "Изменить пароль";
            dialogDescription.textContent = "Пароль демонстрационного аккаунта не хранится и не проверяется.";
            appendDialogInput("Новый пароль", "password", "password", "", "new-password");
            appendDialogInput("Повтори новый пароль", "confirm-password", "password", "", "new-password");
        } else if (mode === "reset") {
            dialogMark.textContent = "↻";
            dialogTitle.textContent = "Сбросить пароль";
            dialogDescription.textContent = "Письмо для сброса не отправляется, так как почтовый сервер не подключён.";
            appendDialogInput("Email аккаунта", "email", "email", emailInput.value, "email");
            dialogConfirm.textContent = "Показать демо";
        } else {
            dialogMark.textContent = "⌫";
            dialogTitle.textContent = "Удалить демо-аккаунт?";
            dialogDescription.textContent = "Данные аккаунта в этой вкладке будут удалены. Это действие нельзя отменить.";
            dialogConfirm.textContent = "Удалить демо-аккаунт";
        }

        dialog.showModal();
        dialogFields.querySelector("input")?.focus();
    }

    document.querySelectorAll("[data-account-action]").forEach(button => {
        button.addEventListener("click", () => openActionDialog(button.dataset.accountAction));
    });

    document.querySelector("#delete-account").addEventListener("click", () => {
        openActionDialog("delete");
    });

    const verificationForm = document.querySelector("#verification-form");
    const verificationState = document.querySelector("#verification-state");
    const verificationBadge = document.querySelector("#verification-badge");
    const verificationFeedback = document.querySelector("#verification-feedback");
    const verificationSubmit = document.querySelector("#verification-submit");
    const adminDashboardLink = document.querySelector("#admin-dashboard-link");

    function updateVerificationView(request) {
        if (!request) {
            verificationBadge.textContent = "Не проверено";
            verificationState.textContent = "Заявки пока нет.";
            verificationSubmit.disabled = false;
            verificationSubmit.textContent = "Отправить заявку";
            return;
        }
        const labels = {
            pending: "На проверке",
            approved: "Одобрено",
            rejected: "Отклонено"
        };
        verificationBadge.textContent = labels[request.status] || "Неизвестный статус";
        verificationState.textContent = `Статус: ${labels[request.status] || "неизвестен"} · Заявка №${request.id}`;
        verificationSubmit.disabled = request.status === "pending" || request.status === "approved";
        verificationSubmit.textContent = request.status === "pending"
            ? "Заявка на рассмотрении"
            : request.status === "approved"
                ? "Верификация пройдена"
                : "Отправить заявку";
    }

    async function loadVerificationStatus() {
        const response = await fetch("/api/verification", {
            credentials: "same-origin",
            cache: "no-store"
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || "Не удалось загрузить статус верификации.");
        }
        updateVerificationView(result.request);
    }

    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
        .then(async response => {
            if (response.status === 401) {
                window.location.replace("./reg.html?mode=login");
                return null;
            }
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || "Не удалось проверить права аккаунта.");
            }
            return result;
        })
        .then(result => {
            if (result && result.user.isAdmin === true) {
                adminDashboardLink.hidden = false;
            }
        })
        .catch(error => {
            console.error("Не удалось проверить права администратора:", error);
            if (window.location.protocol === "file:") {
                verificationState.textContent = "Открой сайт через сервер: запусти .\\start-sdonate.ps1 и перейди на http://127.0.0.1:3000/settings.html.";
            }
        });

    loadVerificationStatus().catch(error => {
        verificationState.textContent = window.location.protocol === "file:"
            ? "API недоступен при открытии HTML напрямую. Запусти .\\start-sdonate.ps1 и открой http://127.0.0.1:3000/settings.html."
            : `Не удалось загрузить статус: ${error.message}`;
    });

    verificationForm.addEventListener("submit", async event => {
        event.preventDefault();
        if (!verificationForm.reportValidity()) {
            return;
        }
        verificationSubmit.disabled = true;
        verificationFeedback.hidden = true;
        try {
            const formData = new FormData(verificationForm);
            const response = await fetch("/api/verification", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    surname: formData.get("surname"),
                    firstName: formData.get("firstName"),
                    patronymic: formData.get("patronymic"),
                    phone: formData.get("phone"),
                    consent: formData.get("consent") === "on"
                })
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 409) {
                    await loadVerificationStatus();
                }
                throw new Error(result.error || "Не удалось отправить заявку.");
            }
            updateVerificationView(result.request);
            verificationForm.reset();
            if (!result.telegramConfigured) {
                verificationFeedback.textContent = "Заявка сохранена. Telegram не настроен; администратор увидит её в панели.";
            } else if (!result.notificationSent) {
                verificationFeedback.textContent = result.notificationError || "Заявка сохранена, но уведомление Telegram не отправлено.";
            } else {
                verificationFeedback.textContent = "Заявка отправлена. Решение придёт после проверки.";
            }
            verificationFeedback.hidden = false;
        } catch (error) {
            verificationSubmit.disabled = false;
            verificationFeedback.textContent = error.message;
            verificationFeedback.hidden = false;
        }
    });

    dialogCancel.addEventListener("click", () => dialog.close());

    dialogForm.addEventListener("submit", event => {
        event.preventDefault();

        if (dialogMode === "delete") {
            dialogFeedback.textContent = "Удаление серверной учётной записи пока не подключено.";
            dialogFeedback.hidden = false;
            return;
        }

        if (!dialogForm.reportValidity()) {
            return;
        }

        if (dialogMode === "email") {
            const previousEmail = sessionStorage.getItem(storageKeys.email) || "";
            const newEmail = dialogForm.elements.email.value.trim().toLowerCase();
            emailInput.value = newEmail;
            sessionStorage.setItem(storageKeys.email, newEmail);
            window.sdonateMoveAvatar(previousEmail, newEmail);
            dialogFeedback.textContent = "Демо: email изменён только в текущей вкладке. Письмо с подтверждением не отправлено.";
        } else if (dialogMode === "password") {
            const password = dialogForm.elements.password.value;
            const confirmation = dialogForm.elements["confirm-password"].value;

            if (password !== confirmation) {
                dialogFeedback.textContent = "Пароли не совпадают.";
                dialogFeedback.classList.add("error");
                dialogFeedback.hidden = false;
                return;
            }

            dialogFeedback.textContent = "Демо: новый пароль не сохранён, серверная авторизация не подключена.";
        } else {
            dialogFeedback.textContent = "Демо: письмо для сброса пароля не отправлено.";
        }

        dialogFeedback.classList.remove("error");
        dialogFeedback.hidden = false;
        dialogActions.hidden = true;
    });
}
