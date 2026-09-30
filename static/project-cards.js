(function () {
    "use strict";

    const cardSelector = ".project-card";
    const videoSelector = `${cardSelector} .project-video`;
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

    function initializeVideos() {
        document.querySelectorAll(videoSelector).forEach((video) => {
            if (video.dataset.cardVideoInitialized === "true") {
                return;
            }

            video.dataset.cardVideoInitialized = "true";
            const card = video.closest(cardSelector);
            let fadeFrame = null;

            function stopFade() {
                cancelAnimationFrame(fadeFrame);
                fadeFrame = null;
            }

            function silenceVideo(pauseVideo) {
                stopFade();
                video.volume = 0;
                video.muted = true;

                if (pauseVideo) {
                    video.pause();
                }
            }

            function fadeVolume(targetVolume) {
                stopFade();

                const startingVolume = video.volume;
                const volumeChange = targetVolume - startingVolume;

                if (targetVolume > 0) {
                    video.muted = false;
                }

                if (volumeChange === 0) {
                    if (targetVolume === 0) {
                        video.muted = true;
                    }
                    return;
                }

                const startedAt = performance.now();

                function updateVolume(now) {
                    const progress = Math.min((now - startedAt) / audioFadeDuration, 1);
                    const easedProgress = progress * progress * (3 - (2 * progress));
                    const volume = startingVolume + (volumeChange * easedProgress);
                    video.volume = volume;

                    if (progress < 1) {
                        fadeFrame = requestAnimationFrame(updateVolume);
                        return;
                    }

                    fadeFrame = null;
                    if (targetVolume === 0) {
                        video.muted = true;
                    }
                }

                fadeFrame = requestAnimationFrame(updateVolume);
            }

            function syncVideo() {
                if (document.hidden) {
                    silenceVideo(true);
                    return;
                }

                video.play().catch(() => {
                    // Muted autoplay can still be disabled by a user's browser settings.
                });

                if (cardWantsAudio(card)) {
                    fadeVolume(1);
                } else {
                    fadeVolume(0);
                }
            }

            video.volume = 0;
            video.muted = true;
            video.loop = true;
            video.playsInline = true;

            card.addEventListener("mouseenter", syncVideo);
            card.addEventListener("mouseleave", syncVideo);
            card.addEventListener("focusin", syncVideo);
            card.addEventListener("focusout", () => {
                requestAnimationFrame(syncVideo);
            });

            document.addEventListener("visibilitychange", () => {
                if (document.hidden) {
                    silenceVideo(true);
                } else {
                    syncVideo();
                }
            });

            syncVideo();
        });
    }

    window.addEventListener("resize", scheduleCardFit);
    fitAllCards();

    if (document.fonts) {
        document.fonts.ready.then(scheduleCardFit);
    }

    initializeVideos();
})();
