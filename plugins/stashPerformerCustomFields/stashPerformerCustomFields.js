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
        createElementFromHTML,
    } = window.stash7dJx1qP;

    document.body.appendChild(document.createElement('style')).textContent = `
    .detail-header.collapsed .detail-item.custom { display: none; }
    `;

    function openExplorerTask(path) {
        stash.runPluginTask("stashPerformerCustomFields", "Open in File Explorer", {"key":"path", "value":{"str": path}});
    }

    async function getPerformer() {
        const performerId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'performers');
        const reqData = {
            "operationName": "FindPerformer",
            "variables": {
              "id": performerId
            },
            "query": `query FindPerformer($id: ID!) {
                findPerformer(id: $id) {
                  id
                  details
                }
              }`
          };
        const result = await stash.callGQL(reqData);
        return result?.data?.findPerformer;
    }

    async function updatePerformerDetails(details) {
        const performerId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'performers');
        const reqData = {
            "operationName": "PerformerUpdate",
            "variables": {
                "input": {
                  "details": details,
                  "id": performerId
                }
              },
            "query": `mutation PerformerUpdate($input: PerformerUpdateInput!) {
                performerUpdate(input: $input) {
                  id
                  details
                }
              }`
          };
        const result = await stash.callGQL(reqData);
        return result?.data?.findPerformer;
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

    function createDeleteButtonHTML(itemType, itemIndex) {
        return `<button id="btn-details-${itemType}-${itemIndex}" title="Delete" type="button" data-item-type="${itemType}" data-item-index="${itemIndex}" class="btn-details-item-delete mr-2 py-0 btn btn-danger"><svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="trash-can" class="svg-inline--fa fa-trash-can fa-icon " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M135.2 17.7C140.6 6.8 151.7 0 163.8 0H284.2c12.1 0 23.2 6.8 28.6 17.7L320 32h96c17.7 0 32 14.3 32 32s-14.3 32-32 32H32C14.3 96 0 81.7 0 64S14.3 32 32 32h96l7.2-14.3zM32 128H416V448c0 35.3-28.7 64-64 64H96c-35.3 0-64-28.7-64-64V128zm96 64c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16zm96 0c-8.8 0-16 7.2-16 16V432c0 8.8 7.2 16 16 16s16-7.2 16-16V208c0-8.8-7.2-16-16-16z"></path></svg></button>`;
    }

    async function deleteDetailItem(itemType, itemIndex) {
        const performer = await getPerformer();
        const docs = JSON.parse(performer.details);
        const doc = docs.custom;
        doc[itemType].splice(itemIndex, 1);
        if (!doc[itemType].length) doc[itemType] = null;
        const details = JSON.stringify(docs);
        await updatePerformerDetails(details);
        window.location.reload();
    }

    function createDetailsItem(field, doc) {
        const detailsItem = createElementFromHTML(`<div id="custom-details-${field}" class="detail-item custom details-${field}">
        <span class="detail-item-title text-capitalize">${field.replaceAll('_', ' ')}:</span>
        <span class="detail-item-value detail-${field} d-block"></span>
        </div>`);
        const detailsValue = detailsItem.querySelector('.detail-item-value');
        if (doc[field]) {
            if (field === 'urls') {
                doc.urls = doc.urls.map((url, i) => `<li>${createDeleteButtonHTML('urls', i)}<a href="${url}" target="_blank">${url}</a></li>`);
            }
            else if (field === 'paths') {
                doc.paths = doc.paths.map((path, i) => `<li>${createDeleteButtonHTML('paths', i)}<a class="filepath">${path}</a></li>`);
            }
            else {
                doc[field] = doc[field].map((value, i) => `<li>${createDeleteButtonHTML(field, i)}${value}</li>`);
            }
            detailsValue.appendChild(createElementFromHTML(`<ul class="list-unstyled mb-0">${doc[field].join('')}</ul>`));
            for (const a of detailsValue.querySelectorAll('a.filepath')) {
                a.style.cursor = 'pointer';
                a.addEventListener('click', function () {
                    openExplorerTask(a.innerText);
                });
            }
            for (const btn of detailsValue.querySelectorAll('.btn-details-item-delete')) {
                btn.style.display = document.getElementById('toggle-details-edit').checked ? 'block' : 'none';
                btn.addEventListener('click', async () => deleteDetailItem(btn.dataset.itemType, btn.dataset.itemIndex));
            }
        }
        else {
            detailsValue.appendChild(createElementFromHTML(`<ul class="list-unstyled mb-0"><li>None</li></ul>`));
        }

        const fieldInput = createElementFromHTML(`<input id="add-performer-${field}" data-field="${field}" class="add-custom-details query-text-field bg-secondary text-white border-secondary form-control mt-2" placeholder="Add ${field}…">`);
        fieldInput.addEventListener('change', async () => {
            const value = field === 'urls' ? toUrl(fieldInput.value) : fieldInput.value.trim();
            if (value) {
                const performer = await getPerformer();
                const docs = JSON.parse(performer.details);
                const doc = docs.custom;
                if (!doc?.[field]) {
                    doc[field] = [];
                }
                let updated = false;
                if (field === 'urls') {
                    if (doc.urls.indexOf(value.href) === -1) {
                        doc.urls.push(value.href);
                        updated = true;
                    }
                }
                else if (doc[field].indexOf(value) === -1) {
                    doc[field].push(value);
                    updated = true;
                }
                if (updated) {
                    const details = JSON.stringify(docs);
                    await updatePerformerDetails(details);
                    window.location.reload();
                }
            }
            fieldInput.value = '';
        });
        detailsValue.appendChild(fieldInput);

        return detailsItem;
    }

    function createDetailsItems(detailsEl, details) {
        const docs = JSON.parse(details);
        const doc = docs.custom;
        for (const field in doc) {
            let detailsItem = document.getElementById(`custom-details-${field}`);
            if (!detailsItem) {
                detailsItem = createDetailsItem(field, doc);
            }
            insertAfter(detailsItem, detailsEl.parentElement);
        }
        return docs;
    }

    function updateDetailElementVisibility(visible) {
        if (document.getElementById('detail-field-inputs')) document.getElementById('detail-field-inputs').style.display = visible ? 'block' : 'none';
        if (document.getElementById('details-string')) document.getElementById('details-string').style.display = visible ? 'none' : 'block';
        for (const btn of document.querySelectorAll('.btn-details-item-delete')) {
            btn.style.display = visible ? 'inline-block' : 'none';
        }
        for (const el of document.querySelectorAll('.add-custom-details')) {
            el.style.display = visible ? 'inline-block' : 'none';
        }
    }

    function performerPageHandler() {
        waitForElementClass('detail-container', async function (className, [detailContainerEl]) {
            const performer = await getPerformer();
            try {
                const docs = JSON.parse(performer.details);
                if (!Object.hasOwn(docs, 'custom')) {
                    return;
                }
            }
            catch (e) {
                return;
            }

            const settings = (await stash.getPluginConfig('stashPerformerCustomFields')) || {};
            const fields = (settings.fields || 'notes,paths,urls').split(',').map(field => field.trim().toLowerCase());
            if (!settings.fields) {
                settings.fields = 'notes,paths,urls';
                await stash.updatePluginConfig('stashPerformerCustomFields', settings);
            }

            const detailItemValueEl = detailContainerEl.querySelector(".detail-item.details > span.detail-item-value.details");
            if (detailItemValueEl) {
                detailItemValueEl.parentElement.style.display = 'none';

                let detailsStringItem = document.getElementById('custom-details');
                let cbToggleEdit = document.getElementById('toggle-details-edit');
                let detailsStringEl = document.getElementById('details-string');
                let detailsInput = document.getElementById('add-performer-details');
                if (!detailsStringItem) {
                    detailsStringItem = createElementFromHTML(`<div id="custom-details" class="detail-item custom details-string">
                    <span class="detail-item-title text-capitalize">Details:</span>
                    <span id="details-edit-container" class="detail-item-value details-edit d-block text-wrap">
                        <div class="custom-control custom-switch">
                            <input type="checkbox" id="toggle-details-edit" class="custom-control-input"><label title="" for="toggle-details-edit" class="custom-control-label"></label>
                        </div>
                        <div id="detail-field-inputs">
                            <textarea id="add-performer-details" placeholder="Details" class="text-input query-text-field bg-secondary text-white border-secondary form-control mt-2"></textarea>
                        </div>
                    </span>
                    <span id="details-string" class="detail-item-value details details-string"></span>
                    </div>`);
                    insertAfter(detailsStringItem, detailItemValueEl.parentElement);

                    cbToggleEdit = document.getElementById('toggle-details-edit');
                    detailsStringEl = document.getElementById('details-string');
                    detailsInput = document.getElementById('add-performer-details');

                    cbToggleEdit.addEventListener('change', async evt => {
                        updateDetailElementVisibility(cbToggleEdit.checked);
                        settings.showEdit = cbToggleEdit.checked;
                        const detailHeaderEl = document.querySelector('.detail-header');
                        if (cbToggleEdit.checked) {
                            // never compact in edit mode
                            if (!detailHeaderEl.classList.contains('full-width') && !detailHeaderEl.classList.contains('collapsed')) { // required otherwise userscript library mutation observer will fire infinitely
                                detailHeaderEl.classList.add('full-width');
                            }
                        }
                        else {
                            // respect compact setting out of edit mode
                            const uiConfig = await stash.getUIConfig();
                            if (uiConfig?.data.configuration.ui.compactExpandedDetails && detailHeaderEl.classList.contains('full-width')) { // required otherwise userscript library mutation observer will fire infinitely
                                detailHeaderEl.classList.remove('full-width');
                            }
                        }
                        await stash.updatePluginConfig('stashPerformerCustomFields', settings);
                    });

                    detailsInput.addEventListener('change', async () => {
                        const performer = await getPerformer();
                        const docs = JSON.parse(performer.details);
                        const detailsValue = detailsInput.value.trim();
                        if (detailsValue) {
                            docs.details = detailsValue;
                        }
                        else {
                            delete docs.details;
                        }
                        const details = JSON.stringify(docs);
                        await updatePerformerDetails(details);
                        window.location.reload();
                    });
                }
                else {
                    detailsStringItem.style.display = null;
                }
                insertAfter(detailsStringItem, detailItemValueEl.parentElement);

                const docs = createDetailsItems(detailItemValueEl, performer.details);

                if (docs.details) {
                    detailsStringEl.innerHTML = docs.details;
                    detailsInput.value = docs.details;
                }

                cbToggleEdit.checked = settings?.showEdit;
                cbToggleEdit.dispatchEvent(new Event('change'));
            }
            else {
                const uiConfig = await stash.getUIConfig();
                const detailsStringItem = document.getElementById('custom-details');
                if (detailsStringItem) {
                    detailsStringItem.style.display = uiConfig?.data.configuration.ui.compactExpandedDetails ? null : 'none';
                }
                updateDetailElementVisibility(false); // never edit mode when collapsed
            }
        });
    }
    stash.addEventListener('page:performer:any', performerPageHandler);
    stash.addEventListener('page:performer:details', performerPageHandler);

    stash.registerHiddenPluginTask('Stash Performer Custom Fields', 'Open in File Explorer');
})();