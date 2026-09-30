(function () {
    "use strict";

    const cardSelector = ".project-card";
    let fitFrame;

    function contentFits(content) {
        return content.scrollHeight <= content.clientHeight + 1
            && content.scrollWidth <= content.clientWidth + 1;
    }

    function fitCardDescription(content) {
        const description = content.querySelector(".project-description");
        content.style.removeProperty("--card-description-size");

        if (!description || contentFits(content)) {
            return;
        }

        const maximumSize = parseFloat(getComputedStyle(description).fontSize);
        let minimumSize = 8;
        let upperBound = maximumSize;

        for (let attempt = 0; attempt < 8; attempt += 1) {
            const candidate = (minimumSize + upperBound) / 2;
            content.style.setProperty("--card-description-size", `${candidate}px`);

            if (contentFits(content)) {
                minimumSize = candidate;
            } else {
                upperBound = candidate;
            }
        }

        content.style.setProperty("--card-description-size", `${minimumSize}px`);
    }

    function fitAllCards() {
        document.querySelectorAll(`${cardSelector} .project-content`).forEach(fitCardDescription);
    }

    function scheduleCardFit() {
        cancelAnimationFrame(fitFrame);
        fitFrame = requestAnimationFrame(fitAllCards);
    }

    window.addEventListener("resize", scheduleCardFit);
    fitAllCards();

    if (document.fonts) {
        document.fonts.ready.then(scheduleCardFit);
    }

})();
