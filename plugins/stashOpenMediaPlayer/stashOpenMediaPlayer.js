(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
    } = window.stash;

    async function openMediaPlayerTask(path) {
        // fixes decodeURI breaking on %'s because they are not encoded
        const encodedPctPath = path.replace(/%([^\d].)/, "%25$1");
        // decode encoded path but then encode % and # otherwise VLC breaks
        const encodedPath = decodeURI(encodedPctPath).replaceAll('%', '%25').replaceAll('#', '%23');
        const settings = await stash.getPluginConfig('stashOpenMediaPlayer');
        stash.runPluginTask("stashOpenMediaPlayer", "Open in Media Player", [{"key":"path", "value":{"str": encodedPath}}, {"key":"mediaPlayerPath", "value":{"str": settings['mediaPlayerPath']}}]);
    }
    stash.openMediaPlayerTask = openMediaPlayerTask;

    // scene filepath open with Media Player
    stash.addEventListener('page:scene', function () {
        waitForElementClass('scene-file-info', function () {
            const a = getElementByXpath("//dt[text()='Path']/following-sibling::dd/a");
            if (a) {
                a.addEventListener('click', async function () {
                    openMediaPlayerTask(a.href);
                });
            }
        });
    });
})();