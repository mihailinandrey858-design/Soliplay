(() => {
    const main = document.querySelector("main");
    const promo = document.createElement("a");
    promo.className = "telegram-promo";
    promo.href = "https://t.me/Sdonat1";
    promo.target = "_blank";
    promo.rel = "noopener noreferrer";
    promo.setAttribute("aria-label", "Открыть Telegram SDonate");
    promo.innerHTML = `
        <span class="telegram-promo-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M21.5 3.6 18.3 20c-.2 1.2-.9 1.5-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1 9.3-8.4c.4-.4-.1-.6-.6-.2L5.7 13.6.8 12.1c-1.1-.3-1.1-1.1.2-1.6L20.1 3c.9-.3 1.7.2 1.4.6Z"></path></svg>
        </span>
        <span class="telegram-promo-copy">
            <span class="telegram-promo-title">Наш Telegram <span>@Sdonat1</span></span>
            <span class="telegram-promo-description">Новости, обновления и анонсы — присоединяйся к сообществу SDonate.</span>
        </span>
        <span class="telegram-promo-arrow" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false"><path d="M7 17 17 7M8 7h9v9"></path></svg>
        </span>`;

    const stylesheet = document.createElement("link");
    stylesheet.rel = "stylesheet";
    stylesheet.href = "./css/telegram-promo.css";
    document.head.append(stylesheet);

    if (main && main.classList.contains("auth-layout")) {
        promo.dataset.placement = "auth";
        document.body.insertBefore(promo, main);
    } else if (main) {
        if (main.id === "top") {
            promo.dataset.placement = "landing";
        }
        main.insertBefore(promo, main.firstChild);
    } else {
        const header = document.querySelector("header");
        if (header) {
            header.insertAdjacentElement("afterend", promo);
        } else {
            document.body.insertBefore(promo, document.body.firstChild);
        }
    }
})();
