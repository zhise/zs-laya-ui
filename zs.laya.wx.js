

window.zsSdk = (function () {
    function zsSdk() { };
    zsSdk.rewardedVideoAd = null;
    zsSdk.videoCompletedHandler = null;
    zsSdk.videoInterruptHandler = null;
    zsSdk.videoErrorHandler = null;
    
    zsSdk.fullScreenAD = null;
    zsSdk.fullScreenADUnitId = null;
    zsSdk.userInfoButton = null;
    zsSdk.audioArr = [];
    zsSdk.srcIdxObj = {};
    zsSdk.init = function () {

        wx.showShareMenu({
            withShareTicket: true
        });

        if (window.zsResUrl) {
            Laya.URL.basePath = window.zsResUrl;
            Laya.MiniAdpter.nativefiles = window.zsNativefiles;
        }
        Laya.MiniAdpter.getUrlEncode = function (url, type) {
            if (url.indexOf(".fnt") != -1 || url.indexOf(".json") != -1) {
                return "utf8";
            }
            else if (type == "arraybuffer") {
                return "";
            }
            return "ascii";
        };
        console.log("zsSdk.init");
    }

    this.loginNum = 0;
    zsSdk.login = function (successHandler, failedHandler) {
        this.loginSuccess = successHandler;
        this.loginFailed = failedHandler;
        this.loginNum++;
        wx.login({
            success: function (res) {
                if (res.code) {
                    if (successHandler) successHandler.runWith({ identityId: res.code });
                }
                else {
                    if (this.loginNum <= 3) {
                        this.login(this.loginSuccess, this.loginFailed);
                    } else {
                        if (failedHandler) failedHandler.runWith({ code: 2, desc: "Code不存在" });
                    }
                }
            },
            fail: function () {
                if (this.loginNum <= 3) {
                    this.login(this.loginSuccess, this.loginFailed);
                } else {
                    if (failedHandler) failedHandler.runWith({ code: 2, desc: "login platform error" });
                }
            },
            complete: function () {
            }
        });
    }

    zsSdk.loadSubpackage = function (pkgName, progressHandler, successHandler, failedHandler) {
        var loadTask = wx.loadSubpackage({
            name: pkgName, // name 可以填 name 或者 root
            success(res) {
                // 分包加载成功后通过 success 回调
                successHandler && successHandler.runWith(1);
            },
            fail(res) {
                // 分包加载失败通过 fail 回调
                failedHandler && failedHandler.runWith(1);
            }
        });
        if (loadTask) {
            if (progressHandler) {
                loadTask.onProgressUpdate(function (res) {
                    progressHandler.runWith(res.progress);
                })
            }
            return true;
        }
        return false;
    }

    zsSdk.createUserInfoButton = function (percentRect, successHandler) {
        var systemInfo = wx.getSystemInfoSync();
        this.userInfoButton = wx.createUserInfoButton({
            type: 'image',
            text: '',
            //image: 'zsGame/img_back.png',
            style: {
                left: systemInfo.windowWidth * percentRect.x,
                top: systemInfo.windowHeight * percentRect.y,
                width: systemInfo.windowWidth * percentRect.width,
                height: systemInfo.windowHeight * percentRect.height,
                //filter:(alpha=0),
                opacity: 1,
            }
        });
        var self = this;
        this.userInfoButton.onTap(function (res) {
            console.log("userInfoButtonOnTap:" + res);
            if (successHandler) successHandler.runWith(res);
        });
    }

    zsSdk.showUserInfoButton = function () {
        if (this.userInfoButton) {
            this.userInfoButton.show();
        }
    }

    zsSdk.hideUserInfoButton = function () {
        if (this.userInfoButton) {
            this.userInfoButton.hide();
        }
    }

    zsSdk.destroyUserInfoButton = function () {
        if (this.userInfoButton) {
            this.userInfoButton.destroy();
            this.userInfoButton = null;
        }
    }

    zsSdk.openShare = function (text, iconUrl) {
        wx.shareAppMessage({
            title: text,
            imageUrl: iconUrl
        });
    }

    zsSdk.initVideoAD = function (videoAdUnit) {
        if (videoAdUnit == null || videoAdUnit == "") {
            this.rewardedVideoAd = null;
            return;
        }
        this.rewardedVideoAd = wx.createRewardedVideoAd({ adUnitId: videoAdUnit });
        if (this.rewardedVideoAd == null) {
            return;
        }
        var self = this;
        this.rewardedVideoAd.onError(function (err) {
            console.log(err);
            self.rewardedVideoAd = null;
            if (self.errorHandler) {
                self.errorHandler.runWith(err);
            }
        });

        this.rewardedVideoAd.onClose(function (res) {
            // 用户点击了【关闭广告】按钮
            // 小于 2.1.0 的基础库版本，res 是一个 undefined
            if (res && res.isEnded || res === undefined) {
                // 正常播放结束，可以下发游戏奖励
                if (self.videoCompletedHandler) {
                    self.videoCompletedHandler.run();
                }
            } else {
                // 播放中途退出，不下发游戏奖励
                if (self.videoInterruptHandler) {
                    self.videoInterruptHandler.run();
                }
            }
        })
    }

    zsSdk.isVideoEnable = function () {
        return this.rewardedVideoAd != null;
    }

    zsSdk.playVideo = function (completedHandler, interruptHandler, errorHandler) {
        if (this.rewardedVideoAd == null) {
            if (errorHandler) {
                errorHandler.runWith("video disable");
            }
            return;
        }
        this.videoErrorHandler = errorHandler;
        this.videoCompletedHandler = completedHandler;
        this.videoInterruptHandler = interruptHandler;

        var self = this;
        this.rewardedVideoAd.show()
            .catch(function (err) {
                self.rewardedVideoAd.load()
                    .then(function () { self.rewardedVideoAd.show() })
            });
    }

    zsSdk.initFullScreenAD = function (fullScreenADUnitId, errorHandler) {
        var systemInfo = wx.getSystemInfoSync();
        if (systemInfo.SDKVersion <= "2.6.0") {
            if (errorHandler) {
                errorHandler.runWith(systemInfo.SDKVersion + " <= 2.6.0");
            }
            return;
        }
        this.fullScreenADUnitId = fullScreenADUnitId;
    }

    zsSdk.loadFullScreenAD = function (loadedHandler, errorHandler) {
        if (this.fullScreenADUnitId == null) {
            return;
        }

        this.fullScreenAD = wx.createInterstitialAd({ adUnitId: this.fullScreenADUnitId });
        if (this.fullScreenAD == null) {
            return;
        }

        var self = this;
        this.fullScreenAD.onLoad(function () {
            if (loadedHandler) {
                loadedHandler.run();
            }
        })

        this.fullScreenAD.onError(function (err) {
            console.log(err);
            self.fullScreenAD = null;
            if (errorHandler) {
                errorHandler.runWith(err);
            }
        });
    }

    zsSdk.showFullScreenAD = function (closeHandler) {
        if (this.fullScreenAD == null) {
            return;
        }

        var self = this;
        this.fullScreenAD.onClose(function () {
            self.fullScreenAD = null;
            if (closeHandler) {
                closeHandler.runWith(err);
            }
        });
        this.fullScreenAD.show();
    }

    zsSdk.setUserCloudStorage = function (kvDataList, onSuccess, onFailed, onCompleted) {
        wx.setUserCloudStorage({
            KVDataList: kvDataList,
            success: function (e) {
                console.log('-----success:' + JSON.stringify(e));
                if (onSuccess) {
                    onSuccess.runWith(e);
                }
            },
            fail: function (e) {
                console.log('-----fail:' + JSON.stringify(e));
                if (onFailed) {
                    onFailed.runWith(e);
                }
            },
            complete: function (e) {
                console.log('-----complete:' + JSON.stringify(e));
                if (onCompleted) {
                    onCompleted.runWith(e);
                }
            }
        });
    }

    zsSdk.playSound = function (res, loop, compHandler) {
        var audio = null;
        let s = this;
        if (this.srcIdxObj[res]) {
            audio = this.audioArr[this.srcIdxObj[res]["idx"]];
            console.debug("取到" + res + "的音频");
            if (!this.srcIdxObj[res]["isStop"]) {
                console.debug("" + res + "已在播放中");
                s.continiu = true;
                return;
            }
        }
        if (!audio) {
            audio = wx.createInnerAudioContext();
            this.audioArr.push(audio);
            audio.onError(function (eCode) {
                console.debug("音效播放异常  code " + JSON.stringify(eCode));
                s.audioArr.splice(s.srcIdxObj[audio.src]["idx"]);
                delete s.srcIdxObj[audio.src];
                audio.destroy();
            });
        }
        audio.src = res;
        audio.loop = loop;
        this.srcIdxObj[res] = { "idx": this.audioArr.indexOf(audio), "ptime": new Date().getTime(), "isStop": false, "curTime": 0 };
        audio.onEnded(function () {
            if (compHandler) compHandler.run();
        });
        audio.play();
    }

    zsSdk.pauseSound = function (res) {
        var audio = this.audioArr[this.srcIdxObj[res]["idx"]];
        if (!audio) return;
        audio.pause();
        audio.offEnded();
    }

    zsSdk.stopSound = function (res) {
        if (!this.srcIdxObj[res]) return;
        this.continiu = false;
        var a = new Date().getTime() - this.srcIdxObj[res]["ptime"]
        if (a < 300) {
            console.debug("间隔过短，延时关闭");
            let s = this;
            setTimeout(function () {
                if (!s.srcIdxObj[res]) return;
                var audio = s.audioArr[s.srcIdxObj[res]["idx"]];
                if (!audio || s.srcIdxObj[res]["isStop"] || s.continiu) return;
                s.srcIdxObj[res]["isStop"] = true;
                audio.stop();
                audio.offEnded();
                console.debug("进入延时关闭");
            }, 300 - a);
            return;
        }
        var audio = this.audioArr[this.srcIdxObj[res]["idx"]];
        audio.stop();
        audio.offEnded();
        this.srcIdxObj[res]["isStop"] = true;
        console.debug("进入关闭");
    }

    return zsSdk;
})();

window.zsDevice = (function () {
    function zsDevice() { };

    zsDevice.deviceInfo = null;

    zsDevice.init = function () {
        this.deviceInfo = wx.getSystemInfoSync();
        console.log(this.deviceInfo);
        console.log("zsDevice.init");
    }

    zsDevice.onShow = function (handler) {
        wx.onShow(function (res) {
            console.log("zsDevice.show:" + Date.now());
            if (handler) handler.runWith(res);
        });
    }

    zsDevice.onHide = function (handler) {
        wx.onHide(function () {
            console.log("zsDevice.hide:" + Date.now());
            if (handler) handler.run();
        });

    }

    zsDevice.vibrateShort = function () {
        wx.vibrateShort({
            fail: function () {
                console.log("vibrateShort failed");
            },
        });
    }

    zsDevice.vibrateLong = function () {
        wx.vibrateLong({
            fail: function () {
                console.log("vibrateShort failed");
            },
        });
    }

    zsDevice.isNetValid = function () {
        return true;
    }

    zsDevice.statusBarHeight = function () {
        return this.deviceInfo ? this.deviceInfo.statusBarHeight : 0;
    }

    zsDevice.screenWidth = function () {
        return this.deviceInfo ? this.deviceInfo.screenWidth : 1;
    }

    zsDevice.screenHeight = function () {
        return this.deviceInfo ? this.deviceInfo.screenHeight : 1;
    }

    return zsDevice;
})();
