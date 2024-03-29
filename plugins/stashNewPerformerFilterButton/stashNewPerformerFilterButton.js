(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
    } = window.stash7dJx1qP;

    stash.addEventListener('page:performers', function () {
        waitForElementClass("btn-toolbar", async function () {
            if (!document.getElementById('new-performer-filter')) {
                const settings = await stash.getPluginConfig('stashNewPerformerFilterButton');

                const toolbar = document.querySelector(".btn-toolbar");

                const newGroup = document.createElement('div');
                newGroup.classList.add('mx-2', 'mb-2', 'd-flex');
                toolbar.appendChild(newGroup);

                const newButton = document.createElement("a");
                newButton.setAttribute("id", "new-performer-filter");
                newButton.classList.add('btn', 'btn-secondary');
                newButton.innerHTML = settings?.buttonText || 'New Performers';
                newButton.href = settings?.filterUrl || `${stash.serverUrl}/performers?disp=3&sortby=created_at&sortdir=desc`;
                newGroup.appendChild(newButton);
            }
        });
    });
})();