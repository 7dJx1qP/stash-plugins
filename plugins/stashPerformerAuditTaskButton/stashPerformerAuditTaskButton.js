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
        waitForElementClass("btn-toolbar", async () => {
            if (!document.getElementById('audit-task')) {
                const settings = await stash.getPluginConfig('stashPerformerAuditTaskButton');

                const toolbar = document.querySelector(".btn-toolbar");

                const newGroup = document.createElement('div');
                newGroup.classList.add('mx-2', 'mb-2', settings?.performerPageButton ? 'd-flex' : 'd-none');
                toolbar.appendChild(newGroup);

                const auditButton = document.createElement("button");
                auditButton.setAttribute("id", "audit-task");
                auditButton.classList.add('btn', 'btn-secondary');
                auditButton.innerHTML = 'Audit URLs';
                auditButton.onclick = () => {
                    stash.runPluginTask("stashPerformerAuditTaskButton", "Audit performer urls");
                };
                newGroup.appendChild(auditButton);
            }
        });
    });
})();