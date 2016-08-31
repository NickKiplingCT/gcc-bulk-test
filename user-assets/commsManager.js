var CommsManager = (function () {
    function CommsManager() {
        var _this = this;
        window.plugins.notify.receiveOutboxChanges('', function (r, message) { return _this.processMessageResponse(r, message); });
    }
    CommsManager.prototype.updateQueue = function (queue) {
        window.mdm.store.data__.messageQueue = queue;
    };
    CommsManager.prototype.getQueue = function () {
        if (window.mdm.store.data__.messageQueue !== undefined)
            return window.mdm.store.data__.messageQueue;
        else
            return [];
    };
    CommsManager.prototype.getMessageQueueCount = function () {
        return this.messageQueue.length;
    };
    CommsManager.prototype.addToQueue = function (message) {
        this.messageQueue = this.getQueue();
        message.payload.commsManagerId = this.generateUUID();
        this.messageQueue.push(message);
        this.updateQueue(this.messageQueue);
    };
    CommsManager.prototype.sendMessage = function (endpoint, message) {
        console.log('SENDING MESSAGE to: %s. Remaining messages on device: %s', endpoint, this.getMessageQueueCount());
        if (endpoint == 'sendEvidence' && message.payload.EvidenceType !== 'jobSignature') {
            var options = {
                "name": "bulkUpliftAzure",
                "operation": endpoint,
                "params": {
                    "payload": message.payload,
                    "photoRef": message.payload.photoRef
                },
            };
            if (message.actions !== undefined)
                options.actions = message.actions;
            window.mdm.utils.callAction('call-azure-app-service', options);
        }
        else {
            var options = {
                "name": "bulkUpliftAzure",
                "operation": endpoint,
                "params": {
                    "payload": message.payload
                }
            };
            if (message.actions !== undefined)
                options.actions = message.actions;
            window.mdm.utils.callAction('call-azure-app-service', options);
        }
    };
    CommsManager.prototype.processQueue = function () {
        this.messageQueue = this.getQueue();
        if (this.messageQueue.length > 0)
            this.sendMessage(this.messageQueue[0].endpoint, this.messageQueue[0]);
    };
    CommsManager.prototype.processMessageResponse = function (err, message) {
        this.messageQueue = this.getQueue();
        this.updateQueue(this.messageQueue);
        var loader = document.getElementsByTagName('activity-loader')[0];
        if (loader !== undefined)
            loader.hide();
        if (message.action.indexOf('FAIL') > -1) {
            console.log(message.action + ': ' + JSON.stringify(message.message));
        }
        else {
            if (this.messageQueue.length > 0) {
                var messageId = message.message.content.data.payload.commsManagerId;
                console.log('Processing response for message: %s', messageId);
                var res = window.jQuery.grep(this.messageQueue, function (e) {
                    return (e.payload.commsManagerId === messageId);
                });
                if (res.length > 0) {
                    for (var r = 0; r < res.length; r++) {
                        for (var i = 0; i < this.messageQueue.length; i++) {
                            if (this.messageQueue[i].payload.commsManagerId == res[r].payload.commsManagerId) {
                                if (this.messageQueue[i].endpoint === 'sendEvidence' && this.messageQueue[i].payload.EvidenceType === 'jobPhoto') {
                                    console.log('Evidence response received');
                                    var currIndex = i;
                                    this.deleteFile(this.messageQueue[i].payload.photoRef, currIndex, function (err, index) {
                                        if (err)
                                            console.log(err);
                                        else {
                                            window.mdm.store.data__.messageQueue.splice(index, 1);
                                            window.commsManager.updateQueue(window.mdm.store.data__.messageQueue);
                                            if (window.mdm.store.data__.messageQueue.length > 0)
                                                window.commsManager.processQueue();
                                        }
                                    });
                                }
                                else {
                                    if (this.messageQueue[i].endpoint === 'updateJob') {
                                        var jobs = window.mdm.store.data__.completedJobs;
                                        for (var j = 0; j < jobs.length; j++) {
                                            if (jobs[j].JobRef === this.messageQueue[i].payload.JobRef)
                                                jobs[j].responseReceived = true;
                                        }
                                    }
                                    if (this.messageQueue[i].actions !== undefined) {
                                        var msg = this.messageQueue[i];
                                        if (msg.logout === false) {
                                            window.mdm.utils.callAction(msg.actions[0].type, msg.actions[0].data);
                                        }
                                        else {
                                            window.plugins.zumo.logout(function () {
                                                window.mdm.utils.callAction(msg.actions[0].type, msg.actions[0].data);
                                            }, function (r) { console.log(r); });
                                        }
                                    }
                                    this.messageQueue.splice(i, 1);
                                    this.updateQueue(this.messageQueue);
                                    if (this.messageQueue.length > 0)
                                        this.processQueue();
                                }
                            }
                        }
                    }
                }
            }
        }
    };
    CommsManager.prototype.deleteFile = function (filePath, currIndex, callback) {
        var myFolderApp = 'my_folder';
        function fileSystemError(err) {
            console.log(err);
            callback(err);
        }
        window.resolveLocalFileSystemURL(filePath, function (entry) {
            entry.remove(function () {
                console.log('File deleted: %s', filePath);
                callback(false, currIndex);
            }, fileSystemError);
        }, fileSystemError);
    };
    CommsManager.prototype.generateUUID = function () {
        var d = new Date().getTime();
        if (window.performance && typeof window.performance.now === "function") {
            d += performance.now();
        }
        var uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = (d + Math.random() * 16) % 16 | 0;
            d = Math.floor(d / 16);
            return (c == 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
        return uuid;
    };
    return CommsManager;
}());
function initialiseCommsManager() {
    window.commsManager = new CommsManager();
    window.checkJobDetailsPage();
    window.updateReasonButton();
    window.resetMessageQueue();
}
document.removeEventListener('deviceready', initialiseCommsManager);
document.addEventListener('deviceready', initialiseCommsManager);
