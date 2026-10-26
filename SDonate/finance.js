if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const financeAccountName = document.querySelector("#finance-account-name");
    const dateLabel = document.querySelector("#current-date");
    const logoutButton = document.querySelector("#logout-button");
    const dialog = document.querySelector("#finance-dialog");
    const actionForm = document.querySelector("#demo-action-form");
    const dialogTitle = document.querySelector("#dialog-title");
    const dialogDescription = document.querySelector("#dialog-description");
    const dialogIcon = document.querySelector("#dialog-icon");
    const fieldLabel = document.querySelector("#dialog-field-label");
    const amountInput = document.querySelector("#demo-amount");
    const methodField = document.querySelector("#dialog-method-field");
    const methodSelect = document.querySelector("#demo-method");
    const dialogSuffix = document.querySelector("#dialog-suffix");
    const dialogMessage = document.querySelector("#dialog-message");
    const dialogSubmit = document.querySelector("#dialog-submit");
    const toast = document.querySelector("#finance-toast");
    const currentDate = new Date();
    let dialogMode = "withdraw";
    let toastTimer;

    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
    financeAccountName.textContent = nickname;
    dateLabel.dateTime = [
        currentDate.getFullYear(),
        String(currentDate.getMonth() + 1).padStart(2, "0"),
        String(currentDate.getDate()).padStart(2, "0")
    ].join("-");
    dateLabel.textContent = new Intl.DateTimeFormat("ru-RU", {
        weekday: "long",
        day: "numeric",
        month: "long"
    }).format(currentDate);

    function showToast(text) {
        window.clearTimeout(toastTimer);
        toast.textContent = text;
        toast.hidden = false;
        toastTimer = window.setTimeout(() => {
            toast.hidden = true;
        }, 3500);
    }

    function openFinanceDialog(mode) {
        dialogMode = mode;
        dialogMessage.hidden = true;
        dialogMessage.textContent = "";
        amountInput.value = "";
        amountInput.required = mode !== "withdraw";
        dialogSubmit.type = "submit";
        methodSelect.value = methodSelect.options[0].value;
        methodField.hidden = mode !== "withdraw";

        if (mode === "card") {
            dialogIcon.textContent = "▤";
            dialogTitle.textContent = "Привязать карту";
            dialogDescription.textContent = "Банковские карты пока не подключены. Не вводи настоящие платёжные данные.";
            fieldLabel.textContent = "Название демо-реквизита";
            amountInput.type = "text";
            amountInput.placeholder = "Например, Моя карта";
            dialogSuffix.hidden = true;
            dialogSubmit.textContent = "Понятно";
        } else if (mode === "wallet") {
            dialogIcon.textContent = "₮";
            dialogTitle.textContent = "USDT-кошелёк";
            dialogDescription.textContent = "Криптовалютные выплаты пока не подключены. Не вводи настоящий адрес кошелька.";
            fieldLabel.textContent = "Метка демо-реквизита";
            amountInput.type = "text";
            amountInput.placeholder = "Например, Мой кошелёк";
            dialogSuffix.hidden = true;
            dialogSubmit.textContent = "Понятно";
        } else {
            dialogIcon.textContent = "↗";
            dialogTitle.textContent = "Вывести средства";
            dialogDescription.textContent = "Заявка не будет отправлена. Реальные финансовые операции пока не подключены.";
            fieldLabel.textContent = "Сумма вывода";
            amountInput.type = "number";
            amountInput.min = "1";
            amountInput.step = "1";
            amountInput.placeholder = "Например, 100";
            dialogSuffix.hidden = false;
            dialogSubmit.textContent = "Показать демо";
        }

        dialog.showModal();
    }

    document.querySelector("#withdraw-open").addEventListener("click", () => {
        openFinanceDialog("withdraw");
    });

    document.querySelectorAll("[data-method]").forEach(button => {
        button.addEventListener("click", () => {
            openFinanceDialog(button.dataset.method);
        });
    });

    dialogSubmit.addEventListener("click", () => {
        if (dialogSubmit.type === "button") {
            dialog.close();
        }
    });

    actionForm.addEventListener("submit", event => {
        event.preventDefault();

        if (dialogMode === "withdraw" && (!amountInput.value || Number(amountInput.value) <= 0)) {
            amountInput.reportValidity();
            return;
        }

        if (dialogMode === "withdraw") {
            dialogMessage.textContent = "Демо: заявка на вывод не отправлена. Для выплат нужен подключённый сервер и платёжный провайдер.";
        } else {
            dialogMessage.textContent = "Демо: реквизит не сохранён. Подключение платёжных методов пока недоступно.";
        }

        dialogMessage.hidden = false;
        dialogSubmit.textContent = "Закрыть";
        dialogSubmit.type = "button";
    });

    dialog.addEventListener("close", () => {
        dialogSubmit.type = "submit";
        dialogSubmit.textContent = dialogMode === "withdraw" ? "Показать демо" : "Понятно";
    });

    document.querySelector("#autopayout-toggle").addEventListener("change", event => {
        showToast(event.target.checked
            ? "Демо-настройка включена только в этом окне. Выплаты не выполняются."
            : "Демо-настройка выключена.");
    });

    logoutButton.addEventListener("click", () => {
        sessionStorage.removeItem("sdonate-demo-authenticated");
        window.location.assign("./reg.html?mode=login");
    });
}
