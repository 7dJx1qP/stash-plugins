(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        insertAfter,
        reloadImg,
    } = window.stash7dJx1qP;

    function processMarkdown(el) {
        el.innerHTML = marked.parse(el.innerHTML);
    }

    let settings = null;
    async function isMarkdownEnabled(page) {
        if (settings === null) {
            settings = await stash.getPluginConfig('stashMarkdown');
        }
        return settings?.[page];
    }

    stash.addEventListener('page:tag:any', async function () {
        if (await isMarkdownEnabled('tags')) {
            waitForElementByXpath("//span[contains(@class, 'detail-item-value') and contains(@class, 'description')]", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    });

    stash.addEventListener('page:tags', async function () {
        if (await isMarkdownEnabled('tags')) {
            waitForElementByXpath("//div[contains(@class, 'tag-description')]", function (xpath, el) {
                for (const node of document.querySelectorAll('.tag-description')) {
                    node.style.whiteSpace = 'initial';
                    processMarkdown(node);
                }
            });
        }
    });

    stash.addEventListener('page:scene', async function () {
        if (await isMarkdownEnabled('scenes')) {
            waitForElementByXpath("//div[@class='tab-content']//h6[contains(text(),'Details')]/following-sibling::p", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    });

    stash.addEventListener('page:gallery', async function () {
        if (await isMarkdownEnabled('galleries')) {
            waitForElementByXpath("//div[@class='tab-content']//h6[contains(text(),'Details')]/following-sibling::p", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    });

    stash.addEventListener('page:movie:scenes', async function () {
        if (await isMarkdownEnabled('movies')) {
            waitForElementByXpath("//span[contains(@class, 'detail-item-value') and contains(@class, 'synopsis')]", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    });

    stash.addEventListener('page:movies', async function () {
        if (await isMarkdownEnabled('movies')) {
            waitForElementByXpath("//div[contains(@class, 'movie-card__description')]", function (xpath, el) {
                for (const node of document.querySelectorAll('.movie-card__description')) {
                    node.style.whiteSpace = 'initial';
                    processMarkdown(node);
                }
            });
        }
    });

    // Performer details is visible regardless of chosen tab
    async function performerPageHandler() {
        if (await isMarkdownEnabled('performers')) {
            waitForElementByXpath("//span[contains(@class, 'detail-item-value') and contains(@class, 'details')]", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    }
    stash.addEventListener('page:performer:scenes', performerPageHandler);
    stash.addEventListener('page:performer:galleries', performerPageHandler);
    stash.addEventListener('page:performer:movies', performerPageHandler);
    stash.addEventListener('page:performer:appearswith', performerPageHandler);
    stash.addEventListener('page:performer:details', performerPageHandler);

    // Studio details is visible regardless of chosen tab
    async function studioPageHandler() {
        if (await isMarkdownEnabled('studios')) {
            waitForElementByXpath("//span[contains(@class, 'detail-item-value') and contains(@class, 'details')]", function (xpath, el) {
                el.style.display = 'block';
                el.style.whiteSpace = 'initial';
                processMarkdown(el);
            });
        }
    }
    stash.addEventListener('page:studio:galleries', studioPageHandler);
    stash.addEventListener('page:studio:images', studioPageHandler);
    stash.addEventListener('page:studio:performers', studioPageHandler);
    stash.addEventListener('page:studio:movies', studioPageHandler);
    stash.addEventListener('page:studio:childstudios', studioPageHandler);
    stash.addEventListener('page:studio:scenes', studioPageHandler);
    stash.addEventListener('page:studio', studioPageHandler);
})();