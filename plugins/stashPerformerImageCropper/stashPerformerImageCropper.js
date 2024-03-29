(function () {
    'use strict';

    const {
        stash,
        Stash,
        waitForElementId,
        waitForElementClass,
        waitForElementByXpath,
        getElementByXpath,
        reloadImg,
    } = window.stash7dJx1qP;

    document.body.appendChild(document.createElement('style')).textContent = `
    .cropper-view-box img { transition: none; }
    .detail-header-image { flex-direction: column; }
    `;

    let cropping = false;
    let cropper = null;

    stash.addEventListener('page:performer:any', function () {
        waitForElementClass('detail-container', function () {
            const cropBtnContainerId = "crop-btn-container";
            if (!document.getElementById(cropBtnContainerId)) {
                const performerId = window.location.pathname.replace('/performers/', '').split('/')[0];
                const image = getElementByXpath("//div[contains(@class, 'detail-header-image')]//img[@class='performer']");
                image.parentElement.addEventListener('click', (evt) => {
                    if (cropping) {
                        evt.preventDefault();
                        evt.stopPropagation();
                    }
                })
                const cropBtnContainer = document.createElement('div');
                cropBtnContainer.setAttribute("id", cropBtnContainerId);
                image.parentElement.parentElement.appendChild(cropBtnContainer);
    
                const cropInfo = document.createElement('p');

                const imageUrl = getElementByXpath("//div[contains(@class, 'detail-header-image')]//img[@class='performer']/@src").nodeValue;
                const cropStart = document.createElement('button');
                cropStart.setAttribute("id", "crop-start");
                cropStart.classList.add('btn', 'btn-primary');
                cropStart.innerText = 'Crop Image';
                cropStart.addEventListener('click', evt => {
                    cropping = true;
                    cropStart.style.display = 'none';
                    cropCancel.style.display = 'inline-block';
    
                    cropper = new Cropper(image, {
                        viewMode: 1,
                        initialAspectRatio: 2 /3,
                        movable: false,
                        rotatable: false,
                        scalable: false,
                        zoomable: false,
                        zoomOnTouch: false,
                        zoomOnWheel: false,
                        ready() {
                            cropAccept.style.display = 'inline-block';
                        },
                        crop(e) {
                            cropInfo.innerText = `X: ${Math.round(e.detail.x)}, Y: ${Math.round(e.detail.y)}, Width: ${Math.round(e.detail.width)}px, Height: ${Math.round(e.detail.height)}px`;
                        }
                    });
                });
                cropBtnContainer.appendChild(cropStart);
                
                const cropAccept = document.createElement('button');
                cropAccept.setAttribute("id", "crop-accept");
                cropAccept.classList.add('btn', 'btn-success', 'mr-2');
                cropAccept.innerText = 'OK';
                cropAccept.addEventListener('click', async evt => {
                    cropping = false;
                    cropStart.style.display = 'inline-block';
                    cropAccept.style.display = 'none';
                    cropCancel.style.display = 'none';
                    const cropInfoText = cropInfo.innerText;
                    cropInfo.innerText = '';
    
                    const reqData = {
                        "operationName": "PerformerUpdate",
                        "variables": {
                          "input": {
                            "image": cropper.getCroppedCanvas().toDataURL(),
                            "id": performerId
                          }
                        },
                        "query": `mutation PerformerUpdate($input: PerformerUpdateInput!) {
                            performerUpdate(input: $input) {
                              id
                            }
                          }`
                    }
                    const resp = await stash.callGQL(reqData);
                    if (resp?.data?.performerUpdate?.id) {
                        reloadImg(image.src);
                        cropper.destroy();
                    }
                    else if (resp?.errors[0]?.message) {
                        cropping = true;
                        cropStart.style.display = 'none';
                        cropAccept.style.display = 'inline-block';
                        cropCancel.style.display = 'inline-block';
                        cropInfo.innerText = cropInfoText;
                        alert(resp.errors[0].message);
                    }
                });
                cropBtnContainer.appendChild(cropAccept);
                
                const cropCancel = document.createElement('button');
                cropCancel.setAttribute("id", "crop-accept");
                cropCancel.classList.add('btn', 'btn-danger');
                cropCancel.innerText = 'Cancel';
                cropCancel.addEventListener('click', evt => {
                    cropping = false;
                    cropStart.style.display = 'inline-block';
                    cropAccept.style.display = 'none';
                    cropCancel.style.display = 'none';
                    cropInfo.innerText = '';
    
                    cropper.destroy();
                });
                cropBtnContainer.appendChild(cropCancel);
                cropAccept.style.display = 'none';
                cropCancel.style.display = 'none';

                cropBtnContainer.appendChild(cropInfo);
            }
        });
    });
})();