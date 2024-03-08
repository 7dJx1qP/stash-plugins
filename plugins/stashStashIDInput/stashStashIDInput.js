(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        getElementsByXpath,
        createElementFromHTML,
    } = window.stash7dJx1qP;

    document.body.appendChild(document.createElement('style')).textContent = `
    .stash_id_input { order: 1; }
    .detail-header.collapsed .stash_id_input { display: none; }
    `;

    let settings = null;
    async function isStashIDInputEnabled(page) {
        if (settings === null) {
            settings = await stash.getPluginConfig('stashStashIdInput');
        }
        if (settings?.[page] === undefined) {
            settings = settings || {};
            settings[page] = true;
            await stash.updatePluginConfig('stashStashIdInput', settings);
        }
        return settings?.[page] !== false;
    }

    async function updatePerformerStashIDs(performerId, stash_ids) {
        const reqData = {
            "variables": {
                "input": {
                    "stash_ids": stash_ids,
                    "id": performerId
                }
            },
            "query": `mutation PerformerUpdate($input: PerformerUpdateInput!) {
    performerUpdate(input: $input) {
        ...PerformerData
    }
}

fragment PerformerData on Performer {
    id
    favorite
    stash_ids {
        stash_id
        endpoint
  }
}`
        };
        await stash.callGQL(reqData);
    }

    async function getPerformerStashIDs(performerId) {
        const reqData = {
            "variables": {
                "id": performerId
            },
            "query": `query FindPerformer($id: ID!) {
    findPerformer(id: $id) {
        ...PerformerData
    }
}

fragment PerformerData on Performer {
    id
    stash_ids {
        endpoint
        stash_id
    }
}`
        };
        return (await stash.callGQL(reqData)).data.findPerformer.stash_ids;
    }

    async function getStudioStashIDs(studioId) {
        const reqData = {
            "variables": {
                "id": studioId
            },
            "query": `query FindStudio($id: ID!) {
    findStudio(id: $id) {
        ...StudioData
    }
}

fragment StudioData on Studio {
    id
    stash_ids {
        endpoint
        stash_id
    }
}`
        };
        return (await stash.callGQL(reqData)).data.findStudio.stash_ids;
    }

    async function updateStudioStashIDs(studioId, stash_ids) {
        const reqData = {
            "variables": {
                "input": {
                    "stash_ids": stash_ids,
                    "id": studioId
                }
            },
            "query": `mutation StudioUpdate($input: StudioUpdateInput!) {
    studioUpdate(input: $input) {
        ...StudioData
    }
}

fragment StudioData on Studio {
    id
    stash_ids {
        stash_id
        endpoint
    }
}`
        };
        await stash.callGQL(reqData);
    }

    function toUrl(string) {
        let url;
        
        try {
            url = new URL(string);
        } catch (_) {
            return null;
        }
    
        if (url.protocol === "http:" || url.protocol === "https:") return url;
        return null;
    }

    function createTooltipElement() {
        const copyTooltip = document.createElement('span');
        copyTooltip.setAttribute('id', 'copy-tooltip');
        copyTooltip.innerText = 'Copied!';
        copyTooltip.classList.add('fade', 'hide');
        copyTooltip.style.position = "absolute";
        copyTooltip.style.left = '0px';
        copyTooltip.style.top = '0px';
        copyTooltip.style.marginLeft = '40px';
        copyTooltip.style.padding = '5px 12px';
        copyTooltip.style.backgroundColor = '#000000df';
        copyTooltip.style.borderRadius = '4px';
        copyTooltip.style.color = '#fff';
        copyTooltip.style.zIndex = 100;
        document.body.appendChild(copyTooltip);
        return copyTooltip;
    }

    function createCopyButton(copyTooltip, copyText) {
        const copyBtn = document.createElement('button');
        copyBtn.title = 'Copy to clipboard';
        copyBtn.innerHTML = `<svg class="svg-inline--fa" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><!--! Font Awesome Pro 6.1.2 by @fontawesome - https://fontawesome.com License - https://fontawesome.com/license (Commercial License) Copyright 2022 Fonticons, Inc. --><path fill="#FFFFFF" d="M384 96L384 0h-112c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48H464c26.51 0 48-21.49 48-48V128h-95.1C398.4 128 384 113.6 384 96zM416 0v96h96L416 0zM192 352V128h-144c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h192c26.51 0 48-21.49 48-48L288 416h-32C220.7 416 192 387.3 192 352z"/></svg>`;
        copyBtn.classList.add('btn', 'btn-secondary', 'btn-sm', 'minimal', 'ml-1');
        copyBtn.addEventListener('click', copyHandler(copyTooltip, copyText));
        return copyBtn;
    }

    function copyHandler(copyTooltip, copyText) {
        return evt => {
            navigator.clipboard.writeText(copyText);
            const rect = document.body.getBoundingClientRect();
            const rect2 = evt.currentTarget.getBoundingClientRect();
            const x = rect2.left - rect.left;
            const y = rect2.top - rect.top;
            copyTooltip.classList.add('show');
            copyTooltip.style.left = `${x}px`;
            copyTooltip.style.top = `${y}px`;
            setTimeout(() => {
                copyTooltip.classList.remove('show');
            }, 500);
        }
    }

    async function createStashIdInput(detailsList, urlFragment, getStashIDs, updateStashIDs) {
        const detailItem = document.createElement('div');
        detailItem.classList.add('detail-item', 'stash_id_input');
        detailsList.appendChild(detailItem);
        const detailTitle = document.createElement('span');
        detailTitle.classList.add('detail-item-title', 'stash-id-input');
        detailItem.appendChild(detailTitle);
        const detailValue = document.createElement('span');
        detailValue.classList.add('detail-item-value', 'stash-id-input');
        detailItem.appendChild(detailValue);
        const stashboxInputContainer = document.createElement('div');
        const stashboxInput = document.createElement('select');
        stashboxInput.setAttribute('id', 'update-stashids-endpoint');
        stashboxInput.classList.add('form-control', 'input-control');
        stashboxInputContainer.appendChild(stashboxInput);
        detailTitle.appendChild(stashboxInputContainer);

        const data = await stash.getStashBoxes();
        let i = 0;
        for (const { name, endpoint } of data.data.configuration.general.stashBoxes) {
            i++;
            const option = document.createElement('option');
            option.innerText = name || `stash-box: #${i}`
            option.value = endpoint;
            stashboxInput.appendChild(option);
        }

        const stashIdInput = document.createElement('input');
        stashIdInput.classList.add('query-text-field', 'bg-secondary', 'text-white', 'border-secondary', 'form-control');
        stashIdInput.setAttribute('id', 'update-stashids');
        stashIdInput.setAttribute('placeholder', 'Add StashID…');
        stashIdInput.addEventListener('change', async function () {
            const url = toUrl(stashIdInput.value);
            let newEndpoint;
            let newStashId;
            if (url) {
                for (const option of stashboxInput.options) {
                    if (option.value === url.origin + '/graphql') {
                        newEndpoint = option.value;
                    }
                }
                if (!newEndpoint || !url.pathname.startsWith(urlFragment)) {
                    alert('Unknown stashbox url.');
                    return;
                }
                newStashId = url.pathname.replace(urlFragment, '');
            }
            else {
                newEndpoint = stashboxInput.options[stashboxInput.selectedIndex].value;
                newStashId = stashIdInput.value;
            }
            stashIdInput.value = '';
            if (!newStashId) return;

            const id = window.location.pathname.replace(urlFragment, '').split('/')[0];
            const stash_ids = await getStashIDs(id);
            if (stash_ids.find(({endpoint, stash_id }) => endpoint === newEndpoint && stash_id === newStashId)) return;
            if (!confirm(`Add StashID ${newStashId}?`)) return;
            await updateStashIDs(id, stash_ids.concat([{ endpoint: newEndpoint, stash_id: newStashId }]));
            window.location.reload();
        });
        detailValue.appendChild(stashIdInput);

        const copyTooltip = createTooltipElement();

        const stashIdsResult = getElementsByXpath("//span[contains(@class, 'detail-item-value') and contains(@class, 'stash-ids')]//span[@class='stash-id-pill']/a")
        const stashIds = [];
        let node = null;
        while (node = stashIdsResult.iterateNext()) {
            stashIds.push(node);
        }
        for (const stashId of stashIds) {
            const copyBtn = createCopyButton(copyTooltip, stashId.innerText);
            stashId.parentElement.appendChild(copyBtn);
        }
    }

    async function performerPageHandler() {
        if (await isStashIDInputEnabled('performers')) {
            waitForElementClass('detail-group', async function (className, el) {
                if (!document.getElementById('update-stashids-endpoint')) {
                    await createStashIdInput(el[0], '/performers/', getPerformerStashIDs, updatePerformerStashIDs);
                }
            });
        }
    }
    stash.addEventListener('page:performer:any', performerPageHandler);
    stash.addEventListener('page:performer:details', performerPageHandler);

    async function studioPageHandler() {
        if (await isStashIDInputEnabled('studios')) {
            waitForElementClass('detail-group', async function (className, el) {
                if (!document.getElementById('update-stashids-endpoint')) {
                    await createStashIdInput(el[0], '/studios/', getStudioStashIDs, updateStudioStashIDs);
                }
            });
        }
    }
    stash.addEventListener('page:studio:any', studioPageHandler);
    stash.addEventListener('page:studio:details', studioPageHandler);
})();