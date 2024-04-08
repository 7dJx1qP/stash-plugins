(function () {
    'use strict';

    const stash = function () {

        const { fetch: originalFetch } = window;
        const stashListener = new EventTarget();

        window.fetch = async (...args) => {
            let [resource, config ] = args;
            // request interceptor here
            stashListener.dispatchEvent(new CustomEvent('request', { 'detail': config }));
            const response = await originalFetch(resource, config);
            // response interceptor here
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1 && typeof resource === "string" && resource.endsWith('/graphql')) {
                try {
                    const data = await response.clone().json();
                    stashListener.dispatchEvent(new CustomEvent('response', { 'detail': data }));
                }
                catch (e) {

                }
            }
            return response;
        };

        class Logger {
            constructor(enabled) {
                this.enabled = enabled;
            }
            debug() {
                if (!this.enabled) return;
                console.debug(...arguments);
            }
        }

        function waitForElementId(elementId, callBack, time) {
            time = (typeof time !== 'undefined') ? time : 100;
            window.setTimeout(() => {
                const element = document.getElementById(elementId);
                if (element) {
                    callBack(elementId, element);
                } else {
                    waitForElementId(elementId, callBack);
                }
            }, time);
        }

        function waitForElementClass(elementId, callBack, time) {
            time = (typeof time !== 'undefined') ? time : 100;
            window.setTimeout(() => {
                const element = document.getElementsByClassName(elementId);
                if (element.length > 0) {
                    callBack(elementId, element);
                } else {
                    waitForElementClass(elementId, callBack);
                }
            }, time);
        }

        function waitForElementByXpath(xpath, callBack, time) {
            time = (typeof time !== 'undefined') ? time : 100;
            window.setTimeout(() => {
                const element = getElementByXpath(xpath);
                if (element) {
                    callBack(xpath, element);
                } else {
                    waitForElementByXpath(xpath, callBack);
                }
            }, time);
        }

        function waitForElementsByXpath(xpath, callBack, time) {
            time = (typeof time !== 'undefined') ? time : 100;
            window.setTimeout(() => {
                const element = getElementsByXpath(xpath);
                if (element) {
                    callBack(xpath, element);
                } else {
                    waitForElementsByXpath(xpath, callBack);
                }
            }, time);
        }

        function getElementByXpath(xpath, contextNode) {
            return document.evaluate(xpath, contextNode || document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        }

        function getElementsByXpath(xpath, contextNode) {
            return document.evaluate(xpath, contextNode || document, null, XPathResult.ORDERED_NODE_ITERATOR_TYPE, null);
        }

        function getClosestAncestor(el, selector, stopSelector) {
            let retval = null;
            while (el) {
                if (el.matches(selector)) {
                    retval = el;
                    break
                } else if (stopSelector && el.matches(stopSelector)) {
                    break
                }
                el = el.parentElement;
            }
            return retval;
        }

        function insertAfter(newNode, existingNode) {
            existingNode.parentNode.insertBefore(newNode, existingNode.nextSibling);
        }

        function createElementFromHTML(htmlString) {
            const div = document.createElement('div');
            div.innerHTML = htmlString.trim();

            // Change this to div.childNodes to support multiple top-level nodes.
            return div.firstChild;
        }


        function setNativeValue(element, value) {
            const valueSetter = Object.getOwnPropertyDescriptor(element, 'value').set;
            const prototype = Object.getPrototypeOf(element);
            const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value').set;

            if (valueSetter && valueSetter !== prototypeValueSetter) {
                prototypeValueSetter.call(element, value);
            } else {
                valueSetter.call(element, value);
            }
        }

        function updateTextInput(element, value) {
            setNativeValue(element, value);
            element.dispatchEvent(new Event('input', { bubbles: true }));
        }

        function concatRegexp(reg, exp) {
            let flags = reg.flags + exp.flags;
            flags = Array.from(new Set(flags.split(''))).join();
            return new RegExp(reg.source + exp.source, flags);
        }

        function sortElementChildren(node) {
            const items = node.childNodes;
            const itemsArr = [];
            for (const i in items) {
                if (items[i].nodeType == Node.ELEMENT_NODE) { // get rid of the whitespace text nodes
                    itemsArr.push(items[i]);
                }
            }

            itemsArr.sort((a, b) => {
                return a.innerHTML == b.innerHTML
                    ? 0
                    : (a.innerHTML > b.innerHTML ? 1 : -1);
            });

            for (let i = 0; i < itemsArr.length; i++) {
                node.appendChild(itemsArr[i]);
            }
        }

        function xPathResultToArray(result) {
            let node = null;
            const nodes = [];
            while (node = result.iterateNext()) {
                nodes.push(node);
            }
            return nodes;
        }

        const reloadImg = url =>
            fetch(url, { cache: 'reload', mode: 'no-cors' })
            .then(() => document.body.querySelectorAll(`img[src='${url}']`)
            .forEach(img => img.src = url));

        class Stash extends EventTarget {
            constructor({ pageUrlCheckInterval = 50, logging = false } = {}) {
                super();
                this.log = new Logger(logging);
                this._pageUrlCheckInterval = pageUrlCheckInterval;
                this.fireOnHashChangesToo = true;
                this.lastLocationEvents = [];
                this.pageURLCheckTimer = setInterval(() => {
                    // Loop every 50ms
                    if (this.lastPathStr !== location.pathname || this.lastQueryStr !== location.search || (this.fireOnHashChangesToo && this.lastHashStr !== location.hash)) {
                        this.lastPathStr = location.pathname;
                        this.lastQueryStr = location.search;
                        this.lastHashStr = location.hash;
                        this.gmMain();
                    }
                }, this._pageUrlCheckInterval);
                stashListener.addEventListener('response', (evt) => {
                    if (evt.detail.data?.plugins) {
                        this.getPluginVersion(evt.detail);
                    }
                    this.processRemoteScenes(evt.detail);
                    this.processScene(evt.detail);
                    this.processScenes(evt.detail);
                    this.processStudios(evt.detail);
                    this.processPerformers(evt.detail);
                    this.processApiKey(evt.detail);
                    this.dispatchEvent(new CustomEvent('stash:response', { 'detail': evt.detail }));
                });
                stashListener.addEventListener('request', (evt) => {
                    this.dispatchEvent(new CustomEvent('stash:request', { 'detail': evt.detail }));
                });
                stashListener.addEventListener('pluginVersion', (evt) => {
                    if (this.pluginVersion !== evt.detail) {
                        this.pluginVersion = evt.detail;
                        this.dispatchEvent(new CustomEvent('stash:pluginVersion', { 'detail': evt.detail }));
                    }
                });
                this.version = [0, 0, 0];
                this.getVersion();
                this.pluginVersion = null;
                this.getPlugins().then(plugins => this.getPluginVersion(plugins));
                this.hiddenPluginTasks = [];
                this.settingsCallbacks = [];
                this.settingsId = 'userscript-settings';
                this.remoteScenes = {};
                this.scenes = {};
                this.studios = {};
                this.performers = {};
                this.userscripts = [];
                this.sceneTaggerObserver = new MutationObserver(mutations => {
                    mutations.forEach(mutation => {
                        mutation.addedNodes.forEach(node => {
                            if (node?.classList?.contains('entity-name') && node.innerText.startsWith('Performer:')) {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:remoteperformer', { 'detail': { node, mutation } }));
                            }
                            else if (node?.classList?.contains('entity-name') && node.innerText.startsWith('Studio:')) {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:remotestudio', { 'detail': { node, mutation } }));
                            }
                            else if (node.tagName === 'SPAN' && node.innerText.startsWith('Matched:')) {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:local', { 'detail': { node, mutation } }));
                            }
                            else if (node.tagName === 'UL') {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:container', { 'detail': { node, mutation } }));
                            }
                            else if (node?.classList?.contains('col-lg-6')) {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:subcontainer', { 'detail': { node, mutation } }));
                            }
                            else if (node.tagName === 'H5') { // scene date
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:date', { 'detail': { node, mutation } }));
                            }
                            else if (node.tagName === 'DIV' && node?.classList?.contains('d-flex') && node?.classList?.contains('flex-column')) { // scene stashid, url, details
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:detailscontainer', { 'detail': { node, mutation } }));
                            }
                            else if (node.tagName === 'DIV' && node?.classList?.contains('react-select__multi-value')) {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:remotetag', { 'detail': { node, mutation } }));
                            }
                            else {
                                this.dispatchEvent(new CustomEvent('tagger:mutation:add:other', { 'detail': { node, mutation } }));
                            }
                        });
                    });
                    this.dispatchEvent(new CustomEvent('tagger:mutations:searchitems', { 'detail': mutations }));
                });
                this.taggerContainerHeaderObserver = new MutationObserver(mutations => {
                    this.dispatchEvent(new CustomEvent('tagger:mutations:header', { 'detail': mutations }));
                });
                this.performerPageObserver = new MutationObserver(mutations => {
                    let isEdit = false;
                    let isCollapsed = false;
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            if (mutation.target.classList.contains('edit')) {
                                isEdit = true;
                            }
                            else if (mutation.target.classList.contains('collapsed')) {
                                isCollapsed = true;
                            }
                            else if (mutation.target.classList.contains('full-width')) {
                                isCollapsed = false;
                            }
                        }
                    });
                    if (isEdit) {
                        this.dispatchLocationEvent(new Event('page:performer:edit'));
                    }
                    else {
                        this.dispatchLocationEvent(new Event('page:performer:details'));
                    }
                    if (isCollapsed) {
                        this.dispatchLocationEvent(new Event('page:performer:details:collapsed'));
                    }
                    else {
                        this.dispatchLocationEvent(new Event('page:performer:details:expanded'));
                    }
                });
                this.studioPageObserver = new MutationObserver(mutations => {
                    let isEdit = false;
                    let isCollapsed = false;
                    mutations.forEach(mutation => {
                        if (mutation.attributeName === 'class') {
                            if (mutation.target.classList.contains('edit')) {
                                isEdit = true;
                            }
                            else if (mutation.target.classList.contains('collapsed')) {
                                isCollapsed = true;
                            }
                            else if (mutation.target.classList.contains('full-width')) {
                                isCollapsed = false;
                            }
                        }
                    });
                    if (isEdit) {
                        this.dispatchLocationEvent(new Event('page:studio:edit'));
                    }
                    else {
                        this.dispatchLocationEvent(new Event('page:studio:details'));
                    }
                    if (isCollapsed) {
                        this.dispatchLocationEvent(new Event('page:studio:details:collapsed'));
                    }
                    else {
                        this.dispatchLocationEvent(new Event('page:studio:details:expanded'));
                    }
                });
            }
            async getVersion() {
                const reqData = {
                    "operationName": "",
                    "variables": {},
                    "query": `query version {
    version {
        version
    }
}
`
                };
                const data = await this.callGQL(reqData);
                const versionString = data.data.version.version;
                this.version = versionString.substring(1).split('.').map(o => parseInt(o));
            }
            compareVersion(minVersion) {
                let [currMajor, currMinor, currPatch = 0] = this.version;
                let [minMajor, minMinor, minPatch = 0] = minVersion.split('.').map(i => parseInt(i));
                if (currMajor > minMajor) return 1;
                if (currMajor < minMajor) return -1;
                if (currMinor > minMinor) return 1;
                if (currMinor < minMinor) return -1;
                return 0;

            }
            comparePluginVersion(minPluginVersion) {
                if (!this.pluginVersion) return -1;
                let [currMajor, currMinor, currPatch = 0] = this.pluginVersion.split('.').map(i => parseInt(i));
                let [minMajor, minMinor, minPatch = 0] = minPluginVersion.split('.').map(i => parseInt(i));
                if (currMajor > minMajor) return 1;
                if (currMajor < minMajor) return -1;
                if (currMinor > minMinor) return 1;
                if (currMinor < minMinor) return -1;
                return 0;

            }
            async runPluginTask(pluginId, taskName, args = []) {
                const reqData = {
                    "operationName": "RunPluginTask",
                    "variables": {
                        "plugin_id": pluginId,
                        "task_name": taskName,
                        "args": args
                    },
                    "query": "mutation RunPluginTask($plugin_id: ID!, $task_name: String!, $args: [PluginArgInput!]) {\n  runPluginTask(plugin_id: $plugin_id, task_name: $task_name, args: $args)\n}\n"
                };
                return this.callGQL(reqData);
            }
            async callGQL(reqData) {
                const options = {
                    method: 'POST',
                    body: JSON.stringify(reqData),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }

                try {
                    const res = await window.fetch('/graphql', options);
                    this.log.debug(res);
                    return res.json();
                }
                catch (err) {
                    console.error(err);
                }
            }
            async getPlugins() {
                const reqData = {
                    "operationName": "Plugins",
                    "variables": {},
                    "query": `query Plugins {
  plugins {
    id
    name
    description
    url
    version
    tasks {
      name
      description
      __typename
    }
    hooks {
      name
      description
      hooks
    }
  }
}
`
                };
                return this.callGQL(reqData);
            }
            async getPluginVersion(plugins) {
                let version = null;
                for (const plugin of plugins?.data?.plugins || []) {
                    if (plugin.id === 'userscript_functions') {
                        version = plugin.version;
                    }
                }
                stashListener.dispatchEvent(new CustomEvent('pluginVersion', { 'detail': version }));
            }
            async getStashBoxes() {
                const reqData = {
                    "operationName": "Configuration",
                    "variables": {},
                    "query": `query Configuration {
                        configuration {
                          general {
                            stashBoxes {
                              endpoint
                              api_key
                              name
                            }
                          }
                        }
                      }`
                };
                return this.callGQL(reqData);
            }
            async getApiKey() {
                const reqData = {
                    "operationName": "Configuration",
                    "variables": {},
                    "query": `query Configuration {
                        configuration {
                          general {
                            apiKey
                          }
                        }
                      }`
                };
                return this.callGQL(reqData);
            }
            async getPluginConfigs() {
                const reqData = {
                    "operationName": "Configuration",
                    "variables": {},
                    "query": `query Configuration {
                        configuration {
                          plugins
                        }
                      }`
                };
                return this.callGQL(reqData);
            }
            async getPluginConfig(pluginId) {
                const data = await this.getPluginConfigs();
                return data.data.configuration.plugins[pluginId];
            }
            async updatePluginConfig(pluginId, config) {
                const reqData = {
                    "operationName": "ConfigurePlugin",
                    "variables": {
                        "plugin_id": pluginId,
                        "input": config
                    },
                    "query": `mutation ConfigurePlugin($plugin_id: ID!, $input: Map!) {
                        configurePlugin(plugin_id: $plugin_id, input: $input)
                      }`
                };
                return this.callGQL(reqData);
            }
            async getUIConfig() {
                const reqData = {
                    "operationName": "Configuration",
                    "variables": {},
                    "query": `query Configuration {
                        configuration {
                          ui
                        }
                      }`
                };
                return this.callGQL(reqData);
            }
            matchUrl(location, fragment) {
                const regexp = concatRegexp(new RegExp(location.origin), fragment);
                this.log.debug(regexp, location.href.match(regexp));
                return location.href.match(regexp) != null;
            }
            get serverUrl() {
                return window.location.origin;
            }
            dispatchLocationEvent(evt) {
                this.dispatchEvent(evt);
                this.lastLocationEvents.push(evt);
            }
            addEventListener(eventName, handler) {
                super.addEventListener(eventName, handler);
                // ensures that late loading plugin script handlers do not miss the initial location event dispatch
                if (eventName.startsWith('page:')) {
                    for (const evt of this.lastLocationEvents) {
                        if (evt.type === eventName) {
                            handler(evt);
                        }
                    }
                }
            }
            gmMain() {
                const location = window.location;
                this.log.debug(URL, window.location);
                this.lastLocationEvents = [];

                // marker wall
                if (this.matchUrl(location, /\/scenes\/markers/)) {
                    this.log.debug('[Navigation] Wall-Markers Page');
                    this.dispatchLocationEvent(new Event('page:markers'));
                }
                // scene page
                else if (this.matchUrl(location, /\/scenes\/\d+/)) {
                    this.log.debug('[Navigation] Scene Page');
                    this.dispatchLocationEvent(new Event('page:scene'));
                }
                // scenes wall
                else if (this.matchUrl(location, /\/scenes\?/)) {
                    this.log.debug('[Navigation] Wall-Scene Page');
                    this.processTagger();
                    this.dispatchLocationEvent(new Event('page:scenes'));
                }

                // images wall
                if (this.matchUrl(location, /\/images\?/)) {
                    this.log.debug('[Navigation] Wall-Images Page');
                    this.dispatchLocationEvent(new Event('page:images'));
                }
                // image page
                if (this.matchUrl(location, /\/images\/\d+/)) {
                    this.log.debug('[Navigation] Image Page');
                    this.dispatchLocationEvent(new Event('page:image'));
                }

                // movie scenes page
                else if (this.matchUrl(location, /\/movies\/\d+\?/)) {
                    this.log.debug('[Navigation] Movie Page - Scenes');
                    this.processTagger();
                    this.dispatchLocationEvent(new Event('page:movie:scenes'));
                }
                // movie page
                else if (this.matchUrl(location, /\/movies\/\d+/)) {
                    this.log.debug('[Navigation] Movie Page');
                    this.dispatchLocationEvent(new Event('page:movie'));
                }
                // movies wall
                else if (this.matchUrl(location, /\/movies\?/)) {
                    this.log.debug('[Navigation] Wall-Movies Page');
                    this.dispatchLocationEvent(new Event('page:movies'));
                }

                // galleries wall
                if (this.matchUrl(location, /\/galleries\?/)) {
                    this.log.debug('[Navigation] Wall-Galleries Page');
                    this.dispatchLocationEvent(new Event('page:galleries'));
                }
                // gallery page
                if (this.matchUrl(location, /\/galleries\/\d+/)) {
                    this.log.debug('[Navigation] Gallery Page');
                    this.dispatchLocationEvent(new Event('page:gallery'));
                }

                // performer scenes page
                if (this.matchUrl(location, /\/performers\/\d+\/scenes/)) {
                    this.log.debug('[Navigation] Performer Page - Scenes');
                    this.processTagger();
                    this.dispatchLocationEvent(new Event('page:performer:scenes'));
                }
                // performer galleries page
                else if (this.matchUrl(location, /\/performers\/\d+\/galleries/)) {
                    this.log.debug('[Navigation] Performer Page - Galleries');
                    this.dispatchLocationEvent(new Event('page:performer:galleries'));
                }
                // performer movies page
                else if (this.matchUrl(location, /\/performers\/\d+\/movies/)) {
                    this.log.debug('[Navigation] Performer Page - Movies');
                    this.dispatchLocationEvent(new Event('page:performer:movies'));
                }
                // performer appears with page
                else if (this.matchUrl(location, /\/performers\/\d+\/appearswith/)) {
                    this.log.debug('[Navigation] Performer Page - Appears With');
                    this.dispatchLocationEvent(new Event('page:performer:appearswith'));
                }
                // performer page
                else if (this.matchUrl(location, /\/performers\/\d+/)) {
                    this.log.debug('[Navigation] Performers Page');
                    if (this.compareVersion('0.24.3') <= 0) this.processTagger(); // v0.24.3 compatibility
                    this.dispatchLocationEvent(new Event('page:performer'));
                }
                // performer any page
                if (this.matchUrl(location, /\/performers\/\d+/)) {
                    this.log.debug('[Navigation] Performer Page - Any');
                    this.dispatchLocationEvent(new Event('page:performer:any'));

                    waitForElementClass('detail-header', (className, targetNode) => {
                        const observerOptions = {
                            attributes : true,
                            attributeFilter : ['class']
                        }
                        this.performerPageObserver.observe(targetNode[0], observerOptions);
                    });
                }
                // performers wall
                else if (this.matchUrl(location, /\/performers\?/)) {
                    this.log.debug('[Navigation] Wall-Performers Page');
                    this.dispatchLocationEvent(new Event('page:performers'));
                }

                // studio galleries page
                if (this.matchUrl(location, /\/studios\/\d+\/galleries/)) {
                    this.log.debug('[Navigation] Studio Page - Galleries');
                    this.dispatchLocationEvent(new Event('page:studio:galleries'));
                }
                // studio images page
                else if (this.matchUrl(location, /\/studios\/\d+\/images/)) {
                    this.log.debug('[Navigation] Studio Page - Images');
                    this.dispatchLocationEvent(new Event('page:studio:images'));
                }
                // studio performers page
                else if (this.matchUrl(location, /\/studios\/\d+\/performers/)) {
                    this.log.debug('[Navigation] Studio Page - Performers');
                    this.dispatchLocationEvent(new Event('page:studio:performers'));
                }
                // studio movies page
                else if (this.matchUrl(location, /\/studios\/\d+\/movies/)) {
                    this.log.debug('[Navigation] Studio Page - Movies');
                    this.dispatchLocationEvent(new Event('page:studio:movies'));
                }
                // studio childstudios page
                else if (this.matchUrl(location, /\/studios\/\d+\/childstudios/)) {
                    this.log.debug('[Navigation] Studio Page - Child Studios');
                    this.dispatchLocationEvent(new Event('page:studio:childstudios'));
                }
                // studio scenes page
                else if (this.matchUrl(location, /\/studios\/\d+\/scenes/)) {
                    this.log.debug('[Navigation] Studio Page - Scenes');
                    this.processTagger();
                    this.dispatchLocationEvent(new Event('page:studio:scenes'));
                }
                // studio page
                else if (this.matchUrl(location, /\/studios\/\d+/)) {
                    this.log.debug('[Navigation] Studio Page');
                    if (this.compareVersion('0.24.3') <= 0) this.processTagger(); // v0.24.3 compatibility
                    this.dispatchLocationEvent(new Event('page:studio'));
                }
                // studio any page
                if (this.matchUrl(location, /\/studios\/\d+/)) {
                    this.log.debug('[Navigation] Studio Page - Any');
                    this.dispatchLocationEvent(new Event('page:studio:any'));

                    waitForElementClass('detail-header', (className, targetNode) => {
                        const observerOptions = {
                            attributes : true,
                            attributeFilter : ['class']
                        }
                        this.studioPageObserver.observe(targetNode[0], observerOptions);
                    });
                }
                // studios wall
                else if (this.matchUrl(location, /\/studios\?/)) {
                    this.log.debug('[Navigation] Wall-Studios Page');
                    this.dispatchLocationEvent(new Event('page:studios'));
                }

                // tag galleries page
                if (this.matchUrl(location, /\/tags\/\d+\/galleries/)) {
                    this.log.debug('[Navigation] Tag Page - Galleries');
                    this.dispatchLocationEvent(new Event('page:tag:galleries'));
                }
                // tag images page
                else if (this.matchUrl(location, /\/tags\/\d+\/images/)) {
                    this.log.debug('[Navigation] Tag Page - Images');
                    this.dispatchLocationEvent(new Event('page:tag:images'));
                }
                // tag markers page
                else if (this.matchUrl(location, /\/tags\/\d+\/markers/)) {
                    this.log.debug('[Navigation] Tag Page - Markers');
                    this.dispatchLocationEvent(new Event('page:tag:markers'));
                }
                // tag performers page
                else if (this.matchUrl(location, /\/tags\/\d+\/performers/)) {
                    this.log.debug('[Navigation] Tag Page - Performers');
                    this.dispatchLocationEvent(new Event('page:tag:performers'));
                }
                // tag scenes page
                else if (this.matchUrl(location, /\/tags\/\d+\/scenes/)) {
                    this.log.debug('[Navigation] Tag Page - Scenes');
                    this.processTagger();
                    this.dispatchLocationEvent(new Event('page:tag:scenes'));
                }
                // tag page
                else if (this.matchUrl(location, /\/tags\/\d+/)) {
                    this.log.debug('[Navigation] Tag Page');
                    if (this.compareVersion('0.24.3') <= 0) this.processTagger(); // v0.24.3 compatibility
                    this.dispatchLocationEvent(new Event('page:tag'));
                }
                // tags any page
                if (this.matchUrl(location, /\/tags\/\d+/)) {
                    this.log.debug('[Navigation] Tag Page - Any');
                    this.dispatchLocationEvent(new Event('page:tag:any'));
                }
                // tags wall
                else if (this.matchUrl(location, /\/tags\?/)) {
                    this.log.debug('[Navigation] Wall-Tags Page');
                    this.dispatchLocationEvent(new Event('page:tags'));
                }

                // settings page tasks tab
                if (this.matchUrl(location, /\/settings\?tab=tasks/)) {
                    this.log.debug('[Navigation] Settings Page Tasks Tab');
                    this.dispatchLocationEvent(new Event('page:settings:tasks'));
                    this.hidePluginTasks();
                }
                // settings page system tab
                else if (this.matchUrl(location, /\/settings\?tab=system/)) {
                    this.log.debug('[Navigation] Settings Page System Tab');
                    this.dispatchLocationEvent(new Event('page:settings:system'));
                }
                // settings page (defaults to tasks tab)
                else if (this.matchUrl(location, /\/settings/)) {
                    this.log.debug('[Navigation] Settings Page Tasks Tab');
                    this.dispatchLocationEvent(new Event('page:settings:tasks'));
                    this.hidePluginTasks();
                }

                // stats page
                if (this.matchUrl(location, /\/stats/)) {
                    this.log.debug('[Navigation] Stats Page');
                    this.dispatchLocationEvent(new Event('page:stats'));
                }
            }
            hidePluginTasks () {
                waitForElementsByXpath("//div[@id='tasks-panel']//h1[text()='Plugin Tasks']/following-sibling::div[@class='card']/div[contains(@class, 'setting-group')]", (elementId, nodeIter) => {
                    const nodes = [];
                    let node = null;
                    while (node = nodeIter.iterateNext()) {
                        nodes.push(node);
                    }
                    for (const el of nodes) {
                        const pluginName = el.querySelector('.setting').innerText;
                        const hidePlugin = this.hiddenPluginTasks.find(hiddenPluginTask => hiddenPluginTask[0] === pluginName && !hiddenPluginTask[1]);
                        if (hidePlugin) el.classList.add('d-none');
                        const tasks = el.querySelectorAll('.collapsible-section .setting');
                        for (const task of tasks) {
                            const taskName = task.querySelector('h3').innerText;
                            const hideTask = this.hiddenPluginTasks.find(hiddenPluginTask => hiddenPluginTask[0] === pluginName && hiddenPluginTask[1] === taskName);
                            if (hideTask) {
                                task.classList.add('d-none');
                                if (!task.nextSibling) {
                                    task.previousSibling.style.borderBottom = 0;
                                }
                            }
                            this.dispatchEvent(new CustomEvent('stash:plugin:task', { 'detail': { taskName, task } }));
                        }
                    }
                });
            }
            registerHiddenPluginTask(plugin, task) {
                this.hiddenPluginTasks.push([plugin, task]);
            }
            async pollLogsForMessage(prefix) {
                const reqTime = Date.now();
                const reqData = {
                    "variables": {},
                    "query": `query Logs {
                        logs {
                            time
                            level
                            message
                        }
                    }`
                };
                await new Promise(r => setTimeout(r, 500));
                let retries = 0;
                while (true) {
                    const delay = 2 ** retries * 100;
                    await new Promise(r => setTimeout(r, delay));
                    retries++;
        
                    const logs = await this.callGQL(reqData);
                    for (const log of logs.data.logs) {
                        const logTime = Date.parse(log.time);
                        if (logTime > reqTime && log.message.startsWith(prefix)) {
                            return log.message.replace(prefix, '').trim();
                        }
                    }

                    if (retries >= 5) {
                        throw `Poll logs failed for message: ${prefix}`;
                    }
                }
            }
            processTagger() {
                waitForElementByXpath("//button[text()='Scrape All']", (xpath, el) => {
                    this.dispatchEvent(new CustomEvent('tagger', { 'detail': el }));

                    const searchItemContainer = document.querySelector('.tagger-container').lastChild;
                    this.sceneTaggerObserver.observe(searchItemContainer, {
                        childList: true,
                        subtree: true
                    });

                    const taggerContainerHeader = document.querySelector('.tagger-container-header');
                    this.taggerContainerHeaderObserver.observe(taggerContainerHeader, {
                        childList: true,
                        subtree: true
                    });

                    for (const searchItem of document.querySelectorAll('.search-item')) {
                        this.dispatchEvent(new CustomEvent('tagger:searchitem', { 'detail': searchItem }));
                    }

                    if (!document.getElementById('progress-bar')) {
                        const progressBar = createElementFromHTML(`<div id="progress-bar" class="progress"><div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div>`);
                        progressBar.classList.add('progress');
                        progressBar.style.display = 'none';
                        taggerContainerHeader.appendChild(progressBar);
                    }
                });
                waitForElementByXpath("//div[@class='tagger-container-header']/div/div[@class='row']/h4[text()='Configuration']", (xpath, el) => {
                    this.dispatchEvent(new CustomEvent('tagger:configuration', { 'detail': el }));
                });
            }
            setProgress(value) {
                const progressBar = document.getElementById('progress-bar');
                if (progressBar) {
                    progressBar.firstChild.style.width = value + '%';
                    progressBar.style.display = (value <= 0 || value > 100) ? 'none' : 'flex';
                }
            }
            processRemoteScenes(data) {
                if (data.data?.scrapeMultiScenes) {
                    for (const matchResults of data.data.scrapeMultiScenes) {
                        for (const scene of matchResults) {
                            this.remoteScenes[scene.remote_site_id] = scene;
                        }
                    }
                }
                else if (data.data?.scrapeSingleScene) {
                    for (const scene of data.data.scrapeSingleScene) {
                        this.remoteScenes[scene.remote_site_id] = scene;
                    }
                }
            }
            processScene(data) {
                if (data.data.findScene) {
                    this.scenes[data.data.findScene.id] = data.data.findScene;
                    for (const performer of data.data.findScene.performers) {
                        this.performers[performer.id] = performer;
                    }
                }
            }
            processScenes(data) {
                if (data.data.findScenes?.scenes) {
                    for (const scene of data.data.findScenes.scenes) {
                        this.scenes[scene.id] = scene;
                    }
                }
            }
            processStudios(data) {
                if (data.data.findStudios?.studios) {
                    for (const studio of data.data.findStudios.studios) {
                        this.studios[studio.id] = studio;
                    }
                }
            }
            processPerformers(data) {
                if (data.data.findPerformers?.performers) {
                    for (const performer of data.data.findPerformers.performers) {
                        this.performers[performer.id] = performer;
                    }
                }
            }
            processApiKey(data) {
                if (data.data.generateAPIKey != null && this.pluginVersion) {
                    this.updateConfigValueTask('STASH', 'api_key', data.data.generateAPIKey);
                }
            }
            parseSearchItem(searchItem) {
                const urlNode = searchItem.querySelector('a.scene-link');
                const url = new URL(urlNode.href);
                const id = url.pathname.replace('/scenes/', '');
                const data = this.scenes[id];
                const nameNode = searchItem.querySelector('a.scene-link > div.TruncatedText');
                const name = nameNode.innerText;
                const queryInput = searchItem.querySelector('input.text-input');
                const performerNodes = searchItem.querySelectorAll('.performer-tag-container');
                const tagNodes = searchItem.querySelectorAll('.original-scene-details div.col.col-lg-6 > div > span.tag-item.badge.badge-secondary');

                return {
                    urlNode,
                    url,
                    id,
                    data,
                    nameNode,
                    name,
                    queryInput,
                    performerNodes,
                    tagNodes
                }
            }
            parseSearchResultItem(searchResultItem) {
                const remoteUrlNode = searchResultItem.querySelector('.scene-details .optional-field .optional-field-content a');
                const remoteId = remoteUrlNode?.href.split('/').pop();
                const remoteUrl = remoteUrlNode?.href ? new URL(remoteUrlNode.href) : null;
                const remoteData = this.remoteScenes[remoteId];

                const sceneDetailNodes = searchResultItem.querySelectorAll('.scene-details .optional-field .optional-field-content');
                let urlNodes = [];
                let detailsNode = null;
                for (const sceneDetailNode of sceneDetailNodes) {
                    for (const sceneDetailNodeChild of sceneDetailNode.childNodes) {
                        let bIsUrlNode = false;
                        if (remoteData?.urls) {
                            for (const remoteDataUrl of remoteData?.urls) {
                                if (remoteDataUrl === sceneDetailNodeChild.innerText) {
                                    urlNodes.push(sceneDetailNodeChild);
                                    bIsUrlNode = true;
                                }
                            }
                        }
                        if (!bIsUrlNode && remoteData?.details === sceneDetailNodeChild.textContent) {
                            detailsNode = sceneDetailNodeChild;
                        }
                    }
                }

                const imageNode = searchResultItem.querySelector('.scene-image-container .optional-field .optional-field-content');

                const metadataNode = searchResultItem.querySelector('.scene-metadata');
                const titleNode = metadataNode.querySelector('h4 .optional-field .optional-field-content');
                let dateNode;
                let studioCodeNode;
                let directorNode;
                for (const node of searchResultItem.querySelectorAll('h5 .optional-field .optional-field-content')) {
                    if (node.innerText === remoteData.date) {
                        dateNode = node;
                    }
                    else if (node.innerText === remoteData.code) {
                        studioCodeNode = node;
                    }
                    else if (node.innerText === 'Director: ' + remoteData.director) {
                        directorNode = node;
                    }
                }

                const entityNodes = searchResultItem.querySelectorAll('.entity-name');
                let studioNode = null;
                const performerNodes = [];
                for (const entityNode of entityNodes) {
                    if (entityNode.innerText.startsWith('Studio:')) {
                        studioNode = entityNode;
                    }
                    else if (entityNode.innerText.startsWith('Performer:')) {
                        performerNodes.push(entityNode);
                    }
                }

                const matchNodes = searchResultItem.querySelectorAll('div.col-lg-6 div.mt-2 div.row.no-gutters.my-2 span.ml-auto');
                const matches = []
                for (const matchNode of matchNodes) {
                    let matchType = null;
                    const entityNode = matchNode.parentElement.querySelector('.entity-name');

                    const matchName = matchNode.querySelector('.optional-field-content b').innerText;
                    const matchStoredId = matchNode.querySelector('a').href.split('/').pop();
                    const remoteName = entityNode.querySelector('b').innerText;

                    let data;
                    if (entityNode.innerText.startsWith('Performer:')) {
                        matchType = 'performer';
                        if (remoteData) {
                            data = remoteData.performers.find(performer => performer.stored_id === matchStoredId);
                        }
                    }
                    else if (entityNode.innerText.startsWith('Studio:')) {
                        matchType = 'studio';
                        if (remoteData) {
                            data = remoteData.studio
                        }
                    }

                    matches.push({
                        matchType,
                        matchNode,
                        entityNode,
                        matchName,
                        remoteName,
                        data
                    });
                }

                const tagNodes = searchResultItem.querySelectorAll('div.col-lg-6 div.mt-2 div div.form-group.row div.col-xl-12.col-sm-9 .react-select__multi-value');
                const unmatchedTagNodes = searchResultItem.querySelectorAll('div.col-lg-6 div.mt-2 span.tag-item.badge.badge-secondary');

                return {
                    remoteUrlNode,
                    remoteId,
                    remoteUrl,
                    remoteData,
                    urlNodes,
                    detailsNode,
                    imageNode,
                    titleNode,
                    dateNode,
                    studioNode,
                    performerNodes,
                    matches,
                    tagNodes,
                    unmatchedTagNodes,
                    studioCodeNode,
                    directorNode
                }
            }
        }
        
        return {
            stash: new Stash({ logging: false }),
            Stash,
            waitForElementId,
            waitForElementClass,
            waitForElementByXpath,
            waitForElementsByXpath,
            getElementByXpath,
            getElementsByXpath,
            getClosestAncestor,
            insertAfter,
            createElementFromHTML,
            setNativeValue,
            updateTextInput,
            sortElementChildren,
            xPathResultToArray,
            reloadImg,
            Logger,
        };
    };

    if (!window.stash7dJx1qP) {
        window.stash7dJx1qP = stash();
    }
})();