(function() {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        insertAfter,
        getClosestAncestor,
        createElementFromHTML,
        updateTextInput,
    } = window.stash7dJx1qP;

    document.body.appendChild(document.createElement('style')).textContent = `
    .stash-id-pill span.stashbox-scene-count { border-radius: .25rem; background-color: #394b59; }
    `;

    const STASHDB_ENDPOINT = 'https://stashdb.org/graphql';

    let settings = null;
    async function isSceneCountEnabled(page) {
        if (settings === null) {
            settings = await stash.getPluginConfig('stashStashboxSceneCount');
        }
        let bUpdate = false;
        settings = settings || {};
        if (settings?.endpoints === undefined) {
            settings.endpoints = STASHDB_ENDPOINT;
            bUpdate = true;
        }
        if (settings?.[page] === undefined) {
            settings[page] = true;
            bUpdate = true;
        }
        if (bUpdate) {
            await stash.updatePluginConfig('stashStashboxSceneCount', settings);
        }
        return settings?.[page] !== false;
    }

    async function runGetStashboxPerformerSceneCountTask(endpoint, api_key, stashId) {
        return stash.runPluginTask("stashStashboxSceneCount", "Get Stashbox Performer Scene Count", [{"key":"endpoint", "value":{"str": endpoint}}, {"key":"api_key", "value":{"str": api_key}}, {"key":"stash_id", "value":{"str": stashId}}]);
    }

    async function runGetStashboxStudioSceneCountTask(endpoint, api_key, stashId) {
        return stash.runPluginTask("stashStashboxSceneCount", "Get Stashbox Studio Scene Count", [{"key":"endpoint", "value":{"str": endpoint}}, {"key":"api_key", "value":{"str": api_key}}, {"key":"stash_id", "value":{"str": stashId}}]);
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
                  stash_ids {
                    endpoint
                    stash_id
                  }
                }
              }`
          };
        const result = await stash.callGQL(reqData);
        return result?.data?.findPerformer;
    }

    async function getStudio() {
        const studioId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'studios');
        const reqData = {
            "operationName": "FindStudio",
            "variables": {
              "id": studioId
            },
            "query": `query FindStudio($id: ID!) {
                findStudio(id: $id) {
                  id
                  stash_ids {
                    endpoint
                    stash_id
                  }
                }
              }`
          };
        const result = await stash.callGQL(reqData);
        return result?.data?.findStudio;
    }

    async function getPerformerScenes(endpoint) {
        const performerId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'performers');
        const reqData = {
            "operationName": "FindScenes",
            "variables": {
                "filter": {
                  "q": "",
                  "page": 1,
                  "per_page": 20,
                  "sort": "random_41127446",
                  "direction": "DESC"
                },
                "scene_filter": {
                  "stash_id_endpoint": {
                    "endpoint": endpoint,
                    "stash_id": "",
                    "modifier": "NOT_NULL"
                  },
                  "performers": {
                    "value": [performerId],
                    "excludes": [],
                    "modifier": "INCLUDES_ALL"
                  }
                }
              },
            "query": `query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType, $scene_ids: [Int!]) {
                findScenes(filter: $filter, scene_filter: $scene_filter, scene_ids: $scene_ids) {
                  count
                }
              }`
          };
        const result = await stash.callGQL(reqData);
        return result?.data?.findScenes.count;
    }

    async function getStudioScenes(endpoint, includeSubsidiaryStudios) {
        const studioId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'studios');
        const reqData = {
            "operationName": "FindScenes",
            "variables": {
                "filter": {
                  "q": "",
                  "page": 1,
                  "per_page": 20,
                  "sort": "random_41127446",
                  "direction": "DESC"
                },
                "scene_filter": {
                  "stash_id_endpoint": {
                    "endpoint": endpoint,
                    "stash_id": "",
                    "modifier": "NOT_NULL"
                  },
                  "studios": {
                    "value": [studioId],
                    "excludes": [],
                    "modifier": "INCLUDES_ALL"
                  }
                }
              },
            "query": `query FindScenes($filter: FindFilterType, $scene_filter: SceneFilterType, $scene_ids: [Int!]) {
                findScenes(filter: $filter, scene_filter: $scene_filter, scene_ids: $scene_ids) {
                  count
                }
              }`
          };
        if (includeSubsidiaryStudios) {
            reqData.variables.scene_filter.studios.depth = -1;
        }
        const result = await stash.callGQL(reqData);
        return result?.data?.findScenes.count;
    }

    async function performerPageHandler() {
        if (await isSceneCountEnabled('performers')) {
            const endpoints = (settings?.endpoints || STASHDB_ENDPOINT).split(',');
            const performer = await getPerformer();
            const data = await stash.getStashBoxes();
            for (const { endpoint, stash_id } of performer.stash_ids.filter(o => endpoints.indexOf(o.endpoint) !== -1)) {
                const el = getElementByXpath(`//span[@class='stash-id-pill']/a[text()='${stash_id}']`);
                if (el && !el.parentElement.querySelector('.stashbox-scene-count')) {
                    const badge = createElementFromHTML(`<span class="stashbox-scene-count ml-1" style="display: none;"></span>`);
                    insertAfter(badge, el);
                    const api_key = data.data.configuration.general.stashBoxes.find(o => o.endpoint = endpoint).api_key;
                    await runGetStashboxPerformerSceneCountTask(endpoint, api_key, stash_id);
                    const stashBoxSceneCount = await stash.pollLogsForMessage(`[Plugin / Stash Stashbox Scene Count] ${stash_id}: `);
                    badge.innerText = stashBoxSceneCount;
                    badge.style.display = 'inline-block';
                }
            }
        }
    }
    stash.addEventListener('page:performer:any', performerPageHandler);
    stash.addEventListener('page:performer:details:expanded', performerPageHandler);

    async function studioPageHandler() {
        if (await isSceneCountEnabled('studios')) {
            const endpoints = (settings?.endpoints || STASHDB_ENDPOINT).split(',');
            const studio = await getStudio();
            const data = await stash.getStashBoxes();
            for (const { endpoint, stash_id } of studio.stash_ids.filter(o => endpoints.indexOf(o.endpoint) !== -1)) {
                const el = getElementByXpath(`//span[@class='stash-id-pill']/a[text()='${stash_id}']`);
                if (el && !el.parentElement.querySelector('.stashbox-scene-count')) {
                    const badge = createElementFromHTML(`<span class="stashbox-scene-count ml-1" style="display: none;"></span>`);
                    insertAfter(badge, el);
                    const api_key = data.data.configuration.general.stashBoxes.find(o => o.endpoint = endpoint).api_key;
                    await runGetStashboxStudioSceneCountTask(endpoint, api_key, stash_id);
                    const stashBoxSceneCount = await stash.pollLogsForMessage(`[Plugin / Stash Stashbox Scene Count] ${stash_id}: `);
                    badge.innerText = stashBoxSceneCount;
                    badge.style.display = 'inline-block';
                }
            }
        }
    }
    stash.addEventListener('page:studio:any', studioPageHandler);
    stash.addEventListener('page:studio:details:expanded', studioPageHandler);

    stash.registerHiddenPluginTask('Stash Stashbox Scene Count');

})();