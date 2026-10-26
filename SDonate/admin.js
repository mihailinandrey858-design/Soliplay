async function loadAdminPanel() {
    const response = await fetch("/api/admin/summary", { credentials: "same-origin", cache: "no-store" });
    if (response.status === 401) {
        window.location.replace("./reg.html?mode=login");
        return;
    }
    if (response.status === 403) {
        window.location.replace("./dashboard.html");
        return;
    }
    const result = await response.json();
    if (!response.ok) {
        throw new Error(result.error || "Не удалось загрузить панель.");
    }

    const userResponse = await fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" });
    if (!userResponse.ok) {
        window.location.replace("./reg.html?mode=login");
        return;
    }
    const { user } = await userResponse.json();
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const tableBody = document.querySelector("#accounts-table-body");
    const emptyMessage = document.querySelector("#accounts-empty");
    const searchInput = document.querySelector("#account-search");
    const accountTotal = document.querySelector("#account-total");
    const logoutButton = document.querySelector("#logout-button");
    const accountLabel = document.querySelector("#admin-account-label");
    const accountsCaption = document.querySelector("#accounts-caption");
    const shopsStat = document.querySelector("#shop-total");
    const statusMessage = document.querySelector("#admin-status-message");
    const deleteDialog = document.querySelector("#account-delete-dialog");
    const deleteDescription = document.querySelector("#account-delete-description");
    const incomeStat = document.querySelector("#income-caption");
    const verificationList = document.querySelector("#verification-admin-list");
    const verificationEmpty = document.querySelector("#verification-admin-empty");
    const verificationMessage = document.querySelector("#verification-admin-message");
    const verificationCaption = document.querySelector("#verification-admin-caption");
    const refreshVerifications = document.querySelector("#refresh-verifications");
    let deleteAccountId = null;

    accountName.textContent = user.nickname;
    accountAvatar.textContent = Array.from(user.nickname)[0].toUpperCase();
    accountLabel.textContent = user.email;
    accountTotal.textContent = String(result.accounts.length);
    shopsStat.textContent = "—";
    accountsCaption.textContent = "аккаунты из базы сервера";
    document.querySelector("#turnover-value").textContent = `${result.turnover.toLocaleString("ru-RU")} ₽`;
    document.querySelector("#revenue-value").textContent = `${result.revenue.toLocaleString("ru-RU")} ₽`;
    incomeStat.textContent = result.paymentsConnected
        ? "данные из платёжных операций"
        : "платёжная интеграция не подключена";

    function showAdminError(message) {
        statusMessage.textContent = message;
        statusMessage.hidden = false;
    }

    async function accountAction(account, method, active) {
        statusMessage.hidden = true;
        const options = {
            method,
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" }
        };
        if (method === "PATCH") {
            options.body = JSON.stringify({ active });
        }
        try {
            const actionResponse = await fetch(`/api/admin/accounts/${encodeURIComponent(account.id)}`, options);
            const actionResult = await actionResponse.json();
            if (!actionResponse.ok) {
                throw new Error(actionResult.error || "Не удалось изменить аккаунт.");
            }
            window.location.reload();
        } catch (error) {
            showAdminError(`Не удалось выполнить действие: ${error.message}`);
        }
    }

    function renderAccounts() {
        const query = searchInput.value.trim().toLocaleLowerCase("ru");
        const accounts = result.accounts.filter(account =>
            account.nickname.toLocaleLowerCase("ru").includes(query) ||
            account.email.toLocaleLowerCase("ru").includes(query)
        );
        tableBody.replaceChildren();

        accounts.forEach(account => {
            const row = document.createElement("tr");
            const identity = document.createElement("td");
            const avatar = document.createElement("span");
            const name = document.createElement("span");
            const email = document.createElement("td");
            const registered = document.createElement("td");
            const roleCell = document.createElement("td");
            const role = document.createElement("span");
            const statusCell = document.createElement("td");
            const status = document.createElement("span");
            const actions = document.createElement("td");
            const actionsWrap = document.createElement("div");
            const date = new Date(account.createdAt);

            identity.className = "admin-identity";
            avatar.className = "admin-table-avatar";
            avatar.textContent = Array.from(account.nickname)[0].toUpperCase();
            name.textContent = account.nickname;
            identity.append(avatar, name);
            email.textContent = account.email;
            registered.textContent = Number.isNaN(date.getTime())
                ? "Не указана"
                : new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(date);
            role.className = "account-status";
            role.textContent = account.role === "admin" ? "Администратор" : "Пользователь";
            roleCell.append(role);
            status.className = `account-status${account.active ? " account-status-active" : " account-status-blocked"}`;
            status.textContent = account.active ? "Активен" : "Заблокирован";
            statusCell.append(status);
            actionsWrap.className = "account-actions";
            if (account.role === "admin") {
                const protectedLabel = document.createElement("span");
                protectedLabel.className = "protected-account-label";
                protectedLabel.textContent = "Защищён";
                actionsWrap.append(protectedLabel);
            } else {
                const toggleButton = document.createElement("button");
                toggleButton.type = "button";
                toggleButton.className = "account-action-button";
                toggleButton.textContent = account.active ? "Заблокировать" : "Разблокировать";
                toggleButton.addEventListener("click", () => accountAction(account, "PATCH", !account.active));

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.className = "account-action-button danger-action";
                deleteButton.textContent = "Удалить";
                deleteButton.addEventListener("click", () => {
                    deleteAccountId = account.id;
                    deleteDescription.textContent = `Аккаунт ${account.nickname} (${account.email}) будет удалён без возможности восстановления.`;
                    deleteDialog.showModal();
                });
                actionsWrap.append(toggleButton, deleteButton);
            }
            actions.append(actionsWrap);
            row.append(identity, email, registered, roleCell, statusCell, actions);
            tableBody.append(row);
        });

        emptyMessage.hidden = accounts.length > 0;
    }

    async function loadVerifications() {
        verificationMessage.hidden = true;
        const response = await fetch("/api/admin/verifications", {
            credentials: "same-origin",
            cache: "no-store"
        });
        const verificationResult = await response.json();
        if (!response.ok) {
            throw new Error(verificationResult.error || "Не удалось загрузить заявки.");
        }
        verificationCaption.textContent = verificationResult.telegramConfigured
            ? "Решение можно принять здесь или кнопкой в личном чате Telegram. Личные данные в Telegram не отправляются."
            : "Telegram не настроен. Данные видны только администратору; решения можно принять здесь.";
        verificationList.replaceChildren();
        verificationResult.requests.forEach(request => {
            const card = document.createElement("article");
            const heading = document.createElement("div");
            const title = document.createElement("b");
            const status = document.createElement("span");
            const details = document.createElement("dl");
            const identity = document.createElement("div");
            const phone = document.createElement("div");
            const email = document.createElement("div");
            const requestId = document.createElement("div");
            const actions = document.createElement("div");
            const labels = { pending: "На проверке", approved: "Одобрено", rejected: "Отклонено" };
            const submitted = new Date(request.createdAt);

            card.className = "verification-admin-card";
            heading.className = "verification-admin-heading";
            title.textContent = `${request.surname} ${request.firstName} ${request.patronymic}`;
            status.className = `verification-admin-status verification-admin-status-${request.status}`;
            status.textContent = labels[request.status] || "Неизвестный статус";
            heading.append(title, status);

            details.className = "verification-admin-details";
            identity.textContent = `Аккаунт: ${request.nickname}`;
            phone.textContent = `Телефон: ${request.phone}`;
            email.textContent = request.email ? `Почта: ${request.email}` : "Почта аккаунта недоступна";
            requestId.textContent = `Заявка №${request.id}`;
            details.append(identity, phone, email, requestId);
            if (!Number.isNaN(submitted.getTime())) {
                const date = document.createElement("div");
                date.textContent = `Отправлена: ${new Intl.DateTimeFormat("ru-RU", {
                    dateStyle: "medium",
                    timeStyle: "short"
                }).format(submitted)}`;
                details.append(date);
            }

            card.append(heading, details);
            if (request.status === "pending") {
                actions.className = "verification-admin-actions";
                for (const [statusValue, label] of [["approved", "Одобрить"], ["rejected", "Отклонить"]]) {
                    const button = document.createElement("button");
                    button.type = "button";
                    button.className = `account-action-button${statusValue === "rejected" ? " danger-action" : ""}`;
                    button.textContent = label;
                    button.addEventListener("click", async () => {
                        button.disabled = true;
                        try {
                            const decisionResponse = await fetch(`/api/admin/verifications/${encodeURIComponent(request.id)}/decision`, {
                                method: "POST",
                                credentials: "same-origin",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ status: statusValue })
                            });
                            const decisionResult = await decisionResponse.json();
                            if (!decisionResponse.ok) {
                                throw new Error(decisionResult.error || "Не удалось сохранить решение.");
                            }
                            await loadVerifications();
                        } catch (error) {
                            button.disabled = false;
                            verificationMessage.textContent = error.message;
                            verificationMessage.hidden = false;
                        }
                    });
                    actions.append(button);
                }
                card.append(actions);
            }
            verificationList.append(card);
        });
        verificationEmpty.hidden = verificationResult.requests.length > 0;
    }

    refreshVerifications.addEventListener("click", () => {
        loadVerifications().catch(error => {
            verificationMessage.textContent = `Не удалось загрузить заявки: ${error.message}`;
            verificationMessage.hidden = false;
        });
    });
    loadVerifications().catch(error => {
        verificationMessage.textContent = `Не удалось загрузить заявки: ${error.message}`;
        verificationMessage.hidden = false;
    });

    searchInput.addEventListener("input", renderAccounts);
    deleteDialog.addEventListener("close", () => {
        if (deleteDialog.returnValue !== "confirm" || !deleteAccountId) {
            return;
        }
        const account = result.accounts.find(item => item.id === deleteAccountId);
        deleteAccountId = null;
        if (account) {
            accountAction(account, "DELETE");
        }
    });
    logoutButton.addEventListener("click", async () => {
        logoutButton.disabled = true;
        try {
            await fetch("/api/auth/logout", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: "{}"
            });
        } finally {
            sessionStorage.removeItem("sdonate-demo-authenticated");
            sessionStorage.removeItem("sdonate-demo-nickname");
            sessionStorage.removeItem("sdonate-demo-email");
            window.location.assign("./reg.html?mode=login");
        }
    });

    statusMessage.hidden = true;
    renderAccounts();
}

loadAdminPanel().catch(error => {
    const statusMessage = document.querySelector("#admin-status-message");
    statusMessage.textContent = `Не удалось загрузить админ-панель: ${error.message}`;
    statusMessage.hidden = false;
});
