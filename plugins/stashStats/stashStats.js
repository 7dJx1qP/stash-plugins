(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        getClosestAncestor,
        updateTextInput,
    } = window.stash7dJx1qP;

    function createStatElement(container, title, heading) {
        const statEl = document.createElement('div');
        statEl.classList.add('stats-element');
        container.appendChild(statEl);

        const statTitle = document.createElement('p');
        statTitle.classList.add('title');
        statTitle.innerText = title;
        statEl.appendChild(statTitle);

        const statHeading = document.createElement('p');
        statHeading.classList.add('heading');
        statHeading.innerText = heading;
        statEl.appendChild(statHeading);
    }

    function getProperty(obj, path) {
        const parts = path.split('.'); // Split the path into individual keys
        let value = obj;
        for (const part of parts) {
            value = value[part]; // Access each nested property
            if (value === undefined) {
                break; // Stop if any part of the path is undefined
            }
        }
        return value;
    }

    async function createStatFromConfig(row, config) {
        const variables = {};
        for (const key in config.variables) {
            const configVariable = config.variables[key];
            const resp = (await stash.callGQL({ variables: configVariable.variables, query: configVariable.query }));
            variables[key] = getProperty(resp, configVariable.path);
        }
        const result = eval('`' + config.template + '`');
        createStatElement(row, result, config.header);
    }

    stash.addEventListener('page:stats', function () {
        waitForElementByXpath("//div[contains(@class, 'container-fluid')]/div[@class='mt-5']", async function (xpath, el) {
            let resp = await window.fetch('plugin/stashStats/assets/config.json');
            if (resp.status === 404) {
                resp = await window.fetch('plugin/stashStats/assets/config.default.json');
            }
            const config = await resp.json();
            if (!document.getElementById('custom-stats-row')) {
                const changelog = el.querySelector('div.changelog');

                let i = 0;
                for (const configRow of config) {
                    const row = document.createElement('div');
                    row.setAttribute('id', `custom-stats-row-${i}`);
                    row.classList.add('col', 'col-sm-8', 'm-sm-auto', 'row', 'stats');
                    el.insertBefore(row, changelog);
                    i++;

                    for (const statConfig of configRow) {
                        await createStatFromConfig(row, statConfig);
                    }
                }
            }
        });
    });

})();