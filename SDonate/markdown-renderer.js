(() => {
    function appendInline(parent, source) {
        const pattern = /(\*\*[^*]+\*\*|__[^_]+__|~~[^~]+~~|\*[^*\n]+\*|_[^_\n]+_|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
        let cursor = 0;
        for (const match of source.matchAll(pattern)) {
            parent.append(document.createTextNode(source.slice(cursor, match.index)));
            const token = match[0];
            let element;
            if (token.startsWith("**") || token.startsWith("__")) {
                element = document.createElement("strong");
                element.textContent = token.slice(2, -2);
            } else if (token.startsWith("~~")) {
                element = document.createElement("del");
                element.textContent = token.slice(2, -2);
            } else if (token.startsWith("*") || token.startsWith("_")) {
                element = document.createElement("em");
                element.textContent = token.slice(1, -1);
            } else if (token.startsWith("`")) {
                element = document.createElement("code");
                element.textContent = token.slice(1, -1);
            } else {
                const link = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
                let url;
                try {
                    url = new URL(link[2], window.location.href);
                } catch {
                    url = null;
                }
                if (!url || !["http:", "https:", "mailto:"].includes(url.protocol)) {
                    parent.append(document.createTextNode(token));
                    cursor = match.index + token.length;
                    continue;
                }
                element = document.createElement("a");
                element.href = url.href;
                element.textContent = link[1];
                element.rel = "noopener noreferrer";
                if (url.origin !== window.location.origin) {
                    element.target = "_blank";
                }
            }
            parent.append(element);
            cursor = match.index + token.length;
        }
        parent.append(document.createTextNode(source.slice(cursor)));
    }

    function appendParagraph(parent, lines) {
        if (!lines.length) {
            return;
        }
        const paragraph = document.createElement("p");
        lines.forEach((line, index) => {
            if (index) {
                paragraph.append(document.createElement("br"));
            }
            appendInline(paragraph, line);
        });
        parent.append(paragraph);
        lines.length = 0;
    }

    function render(source, target) {
        target.replaceChildren();
        const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
        let paragraphLines = [];
        let list = null;
        let codeLines = null;

        function closeList() {
            list = null;
        }

        lines.forEach(line => {
            if (codeLines) {
                if (/^\s*```/.test(line)) {
                    const pre = document.createElement("pre");
                    const code = document.createElement("code");
                    code.textContent = codeLines.join("\n");
                    pre.append(code);
                    target.append(pre);
                    codeLines = null;
                } else {
                    codeLines.push(line);
                }
                return;
            }
            if (/^\s*```/.test(line)) {
                appendParagraph(target, paragraphLines);
                closeList();
                codeLines = [];
                return;
            }
            if (!line.trim()) {
                appendParagraph(target, paragraphLines);
                closeList();
                return;
            }

            const heading = line.match(/^(#{1,4})\s+(.+)$/);
            if (heading) {
                appendParagraph(target, paragraphLines);
                closeList();
                const element = document.createElement(`h${heading[1].length + 1}`);
                appendInline(element, heading[2]);
                target.append(element);
                return;
            }
            if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) {
                appendParagraph(target, paragraphLines);
                closeList();
                target.append(document.createElement("hr"));
                return;
            }
            const quote = line.match(/^\s*>\s?(.*)$/);
            if (quote) {
                appendParagraph(target, paragraphLines);
                closeList();
                const blockquote = document.createElement("blockquote");
                appendInline(blockquote, quote[1]);
                target.append(blockquote);
                return;
            }
            const item = line.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/);
            if (item) {
                appendParagraph(target, paragraphLines);
                const ordered = /^\s*\d+\./.test(line);
                if (!list || list.tagName !== (ordered ? "OL" : "UL")) {
                    closeList();
                    list = document.createElement(ordered ? "OL" : "UL");
                    target.append(list);
                }
                const li = document.createElement("li");
                appendInline(li, item[1]);
                list.append(li);
                return;
            }
            closeList();
            paragraphLines.push(line);
        });

        appendParagraph(target, paragraphLines);
        if (codeLines) {
            const pre = document.createElement("pre");
            const code = document.createElement("code");
            code.textContent = codeLines.join("\n");
            pre.append(code);
            target.append(pre);
        }
        return target;
    }

    window.sdonateMarkdown = { render };
})();
