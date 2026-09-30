(function () {
    "use strict";

    const cardSelector = ".project-card";
    const videoSelector = `${cardSelector} iframe[src*="youtube.com/embed/"]`;
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

    function cardWantsPlayback(card) {
        return card.matches(":hover") || card.contains(document.activeElement);
    }

    function initializePlayers() {
        document.querySelectorAll(videoSelector).forEach((iframe) => {
            if (iframe.dataset.hoverPlayerInitialized === "true") {
                return;
            }

            iframe.dataset.hoverPlayerInitialized = "true";
            const card = iframe.closest(cardSelector);
            const state = { player: null, ready: false };

            function syncPlayback() {
                if (!state.ready) {
                    return;
                }

                if (cardWantsPlayback(card)) {
                    state.player.mute();
                    state.player.playVideo();
                } else {
                    state.player.pauseVideo();
                }
            }

            state.player = new YT.Player(iframe, {
                events: {
                    onReady(event) {
                        state.ready = true;
                        event.target.mute();
                        syncPlayback();
                    }
                }
            });

            card.addEventListener("mouseenter", syncPlayback);
            card.addEventListener("mouseleave", syncPlayback);
            card.addEventListener("focusin", syncPlayback);
            card.addEventListener("focusout", () => {
                requestAnimationFrame(syncPlayback);
            });

            document.addEventListener("visibilitychange", () => {
                if (document.hidden && state.ready) {
                    state.player.pauseVideo();
                }
            });
        });
    }

    const previousReadyHandler = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
        if (typeof previousReadyHandler === "function") {
            previousReadyHandler();
        }
        initializePlayers();
    };

    window.addEventListener("resize", scheduleCardFit);
    fitAllCards();

    if (document.fonts) {
        document.fonts.ready.then(scheduleCardFit);
    }

    if (window.YT && typeof window.YT.Player === "function") {
        initializePlayers();
    }
})();
