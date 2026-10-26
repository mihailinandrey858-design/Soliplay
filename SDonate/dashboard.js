if (sessionStorage.getItem("sdonate-demo-authenticated") !== "true") {
    window.location.replace("./reg.html?mode=login");
} else {
    const nickname = sessionStorage.getItem("sdonate-demo-nickname") || "Игрок";
    const greetingName = document.querySelector("#greeting-name");
    const accountName = document.querySelector("#account-name");
    const accountAvatar = document.querySelector("#account-avatar");
    const dateLabel = document.querySelector("#current-date");
    const logoutButton = document.querySelector("#logout-button");
    const currentDate = new Date();
    const chartStyle = sessionStorage.getItem("sdonate-demo-chart") || "area";

    fetch("/api/auth/me", { credentials: "same-origin", cache: "no-store" })
        .then(response => response.ok ? response.json() : null)
        .then(result => {
            if (result && result.user.isAdmin === true) {
                document.querySelector("#admin-preview-link").hidden = false;
            }
        })
        .catch(error => console.error("Не удалось проверить роль аккаунта:", error));

    document.querySelectorAll(".chart").forEach(chart => {
        chart.classList.add(`chart-style-${chartStyle}`);
    });

    greetingName.textContent = nickname;
    accountName.textContent = nickname;
    accountAvatar.textContent = Array.from(nickname)[0].toUpperCase();
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
    const hour = currentDate.getHours();
    document.querySelector(".welcome").firstChild.textContent = hour < 5
        ? "Доброй ночи, "
        : hour < 12
            ? "Доброе утро, "
            : hour < 18
                ? "Добрый день, "
                : "Добрый вечер, ";

    logoutButton.addEventListener("click", async () => {
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

    const periods = {
        day: {
            caption: "за 24 часа",
            labels: ["00:00", "06:00", "12:00", "18:00", "23:59"]
        },
        week: {
            caption: "за 7 дней",
            labels: ["Пн", "Вт", "Ср", "Чт", "Пт"]
        },
        month: {
            caption: "за 30 дней",
            labels: ["1", "8", "15", "22", "30"]
        },
        all: {
            caption: "за всё время",
            labels: ["2022", "2023", "2024", "2025", "2026"]
        }
    };

    document.querySelectorAll(".period-switch").forEach(switcher => {
        switcher.addEventListener("click", event => {
            const button = event.target.closest(".period-button");

            if (!button) {
                return;
            }

            const period = periods[button.dataset.period];

            if (!period) {
                return;
            }

            switcher.querySelectorAll(".period-button").forEach(option => {
                const active = option === button;
                option.classList.toggle("active", active);
                option.setAttribute("aria-pressed", String(active));
            });

            const chartType = switcher.dataset.chart;
            document.querySelector(`[data-caption="${chartType}"]`).textContent = period.caption;

            const labels = switcher.closest(".stat-card").querySelectorAll(".chart-labels span");
            labels.forEach((label, index) => {
                label.textContent = period.labels[index];
            });
            const chart = switcher.closest(".stat-card").querySelector(".chart");
            chart.classList.remove("chart-period-change");
            requestAnimationFrame(() => {
                chart.classList.add("chart-period-change");
                window.setTimeout(() => chart.classList.remove("chart-period-change"), 300);
            });
        });
    });
}
