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
        insertAfter,
        reloadImg,
    } = window.stash7dJx1qP;

    document.body.appendChild(document.createElement('style')).textContent = `
    .video-setting-input {
        width: 150px;
    }
    `;

    function toHHMMSS(s) {
        var sec_num = parseInt(s, 10); // don't forget the second param
        var hours   = Math.floor(sec_num / 3600);
        var minutes = Math.floor((sec_num - (hours * 3600)) / 60);
        var seconds = sec_num - (hours * 3600) - (minutes * 60);
    
        if (hours   < 10) {hours   = "0"+hours;}
        if (minutes < 10) {minutes = "0"+minutes;}
        if (seconds < 10) {seconds = "0"+seconds;}
        return hours+':'+minutes+':'+seconds;
    }

    function toSeconds(s) {
        const [hh, mm, ss] = s.split(':');
        return parseInt(hh) * 3600 + parseInt(mm) * 60 + parseInt(ss);
    }

    function updatePlayerABTime(player, type, seconds) {
        if (type === 'start') {
            player.abLoopPlugin.setStart(seconds);
        }
        else {
            player.abLoopPlugin.setEnd(seconds);
        }
    }

    function createTimeInput(type, player) {
        const input = createElementFromHTML(`<div class="video-setting-input duration-input ${type}">
            <div class="input-group">
                <input placeholder="hh:mm:ss" id="${type}-seconds" class="duration-control text-input form-control">
                <div class="input-group-append">
                    <button id="${type}-set" type="button" class="btn btn-secondary">
                        <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="clock" class="svg-inline--fa fa-clock fa-icon " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path fill="currentColor" d="M256 0a256 256 0 1 1 0 512A256 256 0 1 1 256 0zM232 120V256c0 8 4 15.5 10.7 20l96 64c11 7.4 25.9 4.4 33.3-6.7s4.4-25.9-6.7-33.3L280 243.2V120c0-13.3-10.7-24-24-24s-24 10.7-24 24z"></path></svg>
                    </button>
                    <div role="group" class="btn-group-vertical">
                        <button id="${type}-up" type="button" class="duration-button btn btn-secondary">
                            <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-up" class="svg-inline--fa fa-chevron-up fa-icon " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M201.4 105.4c12.5-12.5 32.8-12.5 45.3 0l192 192c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L224 173.3 54.6 342.6c-12.5 12.5-32.8 12.5-45.3 0s-12.5-32.8 0-45.3l192-192z"></path></svg>
                        </button>
                        <button id="${type}-down" type="button" class="duration-button btn btn-secondary">
                            <svg aria-hidden="true" focusable="false" data-prefix="fas" data-icon="chevron-down" class="svg-inline--fa fa-chevron-down fa-icon " role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path fill="currentColor" d="M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path></svg>
                        </button>
                    </div>
                </div>
                <div id="${type}-error" class="invalid-feedback"></div>
            </div>
        </div>`);
        input.querySelector(`#${type}-set`).addEventListener('click', evt => {
            const seconds = Math.round(player.currentTime());
            input.querySelector(`#${type}-seconds`).value = toHHMMSS(seconds);
            updatePlayerABTime(player, type, seconds)
        });
        input.querySelector(`#${type}-up`).addEventListener('click', evt => {
            const val = input.querySelector(`#${type}-seconds`).value;
            let seconds = val ? toSeconds(val) : Math.round(player.currentTime());
            seconds = toHHMMSS(Math.floor(seconds + 1, Math.round(player.duration())));
            input.querySelector(`#${type}-seconds`).value = seconds;
            updatePlayerABTime(player, type, seconds)
        });
        input.querySelector(`#${type}-down`).addEventListener('click', evt => {
            const val = input.querySelector(`#${type}-seconds`).value;
            let seconds = val ? toSeconds(val) : Math.round(player.currentTime());
            seconds = toHHMMSS(Math.max(0, seconds - 1));
            input.querySelector(`#${type}-seconds`).value = seconds;
            updatePlayerABTime(player, type, seconds)
        });
        input.querySelector(`#${type}-seconds`).addEventListener('change', evt => {
            const val = input.querySelector(`#${type}-seconds`).value;
            let seconds = toSeconds(val);
            if (isNaN(seconds)) {
                seconds = Math.round(player.currentTime());
            }
            else if (seconds < 0) {
                seconds = 0;
            }
            else if (seconds > Math.round(player.duration())) {
                seconds = Math.round(player.duration());
            }
            input.querySelector(`#${type}-seconds`).value = toHHMMSS(seconds);
            updatePlayerABTime(player, type, seconds)
        });
        return input;
    }

    stash.addEventListener('page:scene', function () {
        waitForElementId('VideoJsPlayer', function (a, b) {
            if (!document.querySelector('.video-setting-input')) {
                const player = videojs('VideoJsPlayer');
                player.ready(function () {
                    const btnStart = document.querySelector('.abLoopButton.start');
                    const btnEnd = document.querySelector('.abLoopButton.end');
                    btnStart.style.display = 'none';
                    btnEnd.style.display = 'none';
        
                    const btnStartNew = createTimeInput('start', player);
                    const btnEndNew = createTimeInput('end', player);
                    insertAfter(btnStartNew, btnStart);
                    insertAfter(btnEndNew, btnEnd);
                });
            }
        });
    });
})();
