(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        createElementFromHTML,
    } = window.stash7dJx1qP;

    async function getPerformerMarkersCount(performerId) {
        const reqData = {
            "operationName": "FindSceneMarkers",
            "variables": {
                "scene_marker_filter": {
                  "performers": {
                    "value": [
                        performerId
                    ],
                    "modifier": "INCLUDES_ALL"
                  }
                }
              },
            "query": `query FindSceneMarkers($filter: FindFilterType, $scene_marker_filter: SceneMarkerFilterType) {
                findSceneMarkers(filter: $filter, scene_marker_filter: $scene_marker_filter) {
                    count
                }
            }`
        }
        return stash.callGQL(reqData);
    }

    const markersTabId = 'performer-details-tab-markers';

    function performerPageHandler() {
        waitForElementClass("nav-tabs", async function (className, el) {
            const navTabs = el.item(0);
            if (!document.getElementById(markersTabId)) {
                const markerTab = createElementFromHTML(`<a id="${markersTabId}" href="#" role="tab" data-rb-event-key="markers" aria-controls="performer-details-tabpane-markers" aria-selected="false" class="nav-item nav-link">Markers<span class="left-spacing badge badge-pill badge-secondary">0</span></a>`)
                navTabs.appendChild(markerTab);
                const performerId = window.location.pathname.split('/').find((o, i, arr) => i > 1 && arr[i - 1] == 'performers');
                const markersCount = (await getPerformerMarkersCount(performerId)).data.findSceneMarkers.count;
                document.querySelector(`#${markersTabId} span`).innerHTML = markersCount;
                const performerName = document.querySelector('.performer-head h2').innerText;
                const markersUrl = `${window.location.origin}/scenes/markers?c=("type":"performers","modifier":"INCLUDES_ALL","value":("items":[("id":"${performerId}","label":"${performerName}")],"excluded":[]))&sortby=created_at&sortdir=desc&disp=2`;
                markerTab.href = markersUrl;
            }
        });
    }
    stash.addEventListener('page:performer:any', performerPageHandler);
    stash.addEventListener('page:performer:details', performerPageHandler);
})();