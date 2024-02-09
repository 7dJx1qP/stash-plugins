(function() {
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

    const MIN_REQUIRED_PLUGIN_VERSION = '0.6.0';

    const TASK_NAME = 'Set Stashbox Favorite Performers';
    stash.visiblePluginTasks.push(TASK_NAME);

    async function runSetStashBoxFavoritePerformersTask() {
        const data = await stash.getStashBoxes();
        if (!data.data.configuration.general.stashBoxes.length) {
            alert('No Stashbox configured.');
        }
        for (const { endpoint, api_key } of data.data.configuration.general.stashBoxes) {
            if (endpoint !== 'https://stashdb.org/graphql') continue;
            await stash.runPluginTask("stashSetStashboxFavoritePerformers", "Set Stashbox Favorite Performers", [{"key":"endpoint", "value":{"str": endpoint}}, {"key":"api_key", "value":{"str": api_key}}]);
        }
    }

    async function runSetStashBoxFavoritePerformerTask(endpoint, api_key, stashId, favorite) {
        if (endpoint !== 'https://stashdb.org/graphql') return;
        return stash.runPluginTask("stashSetStashboxFavoritePerformers", "Set Stashbox Favorite Performer", [{"key":"endpoint", "value":{"str": endpoint}}, {"key":"api_key", "value":{"str": api_key}}, {"key":"stash_id", "value":{"str": stashId}}, {"key":"favorite", "value":{"b": favorite}}]);
    }

    stash.addEventListener('page:performers', function () {
        waitForElementClass("btn-toolbar", async function () {
            if (!document.getElementById('stashbox-favorite-task')) {
                const settings = await stash.getPluginConfig('stashSetStashboxFavoritePerformers');

                const toolbar = document.querySelector(".btn-toolbar");

                const newGroup = document.createElement('div');
                newGroup.classList.add('mx-2', 'mb-2', settings['performerPageButton'] ? 'd-flex' : 'd-none');
                toolbar.appendChild(newGroup);

                const button = document.createElement("button");
                button.setAttribute("id", "stashbox-favorite-task");
                button.classList.add('btn', 'btn-secondary');
                button.innerHTML = 'Set Stashbox Favorites';
                button.onclick = () => {
                    runSetStashBoxFavoritePerformersTask();
                };
                newGroup.appendChild(button);
            }
        });
    });

    stash.addEventListener('stash:response', async function (evt) {
        const data = evt.detail;
        let performers;
        if (data.data?.performerUpdate?.stash_ids?.length) {
            performers = [data.data.performerUpdate];
        }
        else if (data.data?.bulkPerformerUpdate) {
            performers = data.data.bulkPerformerUpdate.filter(performer => performer?.stash_ids?.length);
        }
        if (performers) {
            if (performers.length <= 10) {
                const data = await stash.getStashBoxes();
                for (const performer of performers) {
                    for (const { endpoint, stash_id } of performer.stash_ids) {
                        const api_key = data.data.configuration.general.stashBoxes.find(o => o.endpoint = endpoint).api_key;
                        runSetStashBoxFavoritePerformerTask(endpoint, api_key, stash_id, performer.favorite);
                    }
                }
            }
            else {
                runSetStashBoxFavoritePerformersTask();
            }
        }
    });

    stash.addEventListener('stash:plugin:task', async function (evt) {
        const { taskName, task } = evt.detail;
        if (taskName === TASK_NAME) {
            const taskButton = task.querySelector('button');
            if (!taskButton.classList.contains('hooked')) {
                taskButton.classList.add('hooked');
                taskButton.addEventListener('click', evt => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    runSetStashBoxFavoritePerformersTask();
                });
            }
        }
    });

})();