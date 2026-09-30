(function () {
    "use strict";

    const cardSelector = ".project-card";
    const videoSelector = `${cardSelector} iframe[src*="youtube.com/embed/"]`;
    const audioFadeDuration = 450;
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

    function cardWantsAudio(card) {
        return card.matches(":hover") || card.contains(document.activeElement);
    }

    function initializePlayers() {
        document.querySelectorAll(videoSelector).forEach((iframe) => {
            if (iframe.dataset.hoverPlayerInitialized === "true") {
                return;
            }

            iframe.dataset.hoverPlayerInitialized = "true";
            const card = iframe.closest(cardSelector);
            const state = {
                player: null,
                ready: false,
                inView: false,
                fadeFrame: null
            };

            function stopFade() {
                cancelAnimationFrame(state.fadeFrame);
                state.fadeFrame = null;
            }

            function silencePlayer(pauseVideo) {
                stopFade();
                state.player.setVolume(0);
                state.player.mute();

                if (pauseVideo) {
                    state.player.pauseVideo();
                }
            }

            function fadeVolume(targetVolume, pauseWhenSilent) {
                stopFade();

                const startingVolume = state.player.getVolume();
                const volumeChange = targetVolume - startingVolume;

                if (targetVolume > 0) {
                    state.player.unMute();
                }

                if (volumeChange === 0) {
                    if (targetVolume === 0) {
                        state.player.mute();
                        if (pauseWhenSilent) {
                            state.player.pauseVideo();
                        }
                    }
                    return;
                }

                const startedAt = performance.now();

                function updateVolume(now) {
                    const progress = Math.min((now - startedAt) / audioFadeDuration, 1);
                    const easedProgress = progress * progress * (3 - (2 * progress));
                    const volume = startingVolume + (volumeChange * easedProgress);
                    state.player.setVolume(Math.round(volume));

                    if (progress < 1) {
                        state.fadeFrame = requestAnimationFrame(updateVolume);
                        return;
                    }

                    state.fadeFrame = null;
                    if (targetVolume === 0) {
                        state.player.mute();
                        if (pauseWhenSilent && !state.inView) {
                            state.player.pauseVideo();
                        }
                    }
                }

                state.fadeFrame = requestAnimationFrame(updateVolume);
            }

            function syncPlayback() {
                if (!state.ready) {
                    return;
                }

                if (document.hidden || !state.inView) {
                    fadeVolume(0, true);
                    return;
                }

                state.player.playVideo();

                if (cardWantsAudio(card)) {
                    fadeVolume(100, false);
                } else {
                    fadeVolume(0, false);
                }
            }

            const visibilityObserver = new IntersectionObserver((entries) => {
                const entry = entries[0];
                state.inView = entry.isIntersecting && entry.intersectionRatio >= 0.5;
                syncPlayback();
            }, {
                threshold: [0, 0.5]
            });

            state.player = new YT.Player(iframe, {
                events: {
                    onReady(event) {
                        state.ready = true;
                        event.target.setVolume(0);
                        event.target.mute();
                        visibilityObserver.observe(event.target.getIframe());
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
                if (!state.ready) {
                    return;
                }

                if (document.hidden) {
                    silencePlayer(true);
                } else {
                    syncPlayback();
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
