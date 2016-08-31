// Reset view logic on job details page
function checkJobDetailsPage() {
    setTimeout(function() {
        if(mdm.store.data__.state.currentPage === 'JobDetail') {
            if(mdm.store.data__.currentJob.ArrivalTime === null) {
                $('div#btnArrive').attr('classes', '');
                $('div#btnComplete').attr('classes', 'ng-hide');
            }
            else {
                $('div#btnArrive').attr('classes', 'ng-hide');
                $('div#btnComplete').attr('classes', '');
            }
        }

        if(window.commsManager == undefined) {
            window.commsManager = new CommsManager();
        }
    }, 1000);
}

function updateReasonButton() {
    setTimeout(function() {
        if(mdm.store.data__.state.currentPage === 'FailJob') {
            if(mdm.store.data__.currentJob.Reason !== null) {
                document.querySelector('a#btnSelectReason').textContent = mdm.store.data__.currentJob.Reason;
            }
        }
    }, 1000);
}

function showStatusBar() {
    StatusBar.show();
    StatusBar.styleLightContent();
    StatusBar.backgroundColorByHexString("#3E788F");
    plugin.statusBarOverlay.show();
}

document.removeEventListener('deviceready', showStatusBar);
document.addEventListener('deviceready', showStatusBar);
