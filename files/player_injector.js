(function() {
    var hasHandledResume = false;

    function fastForwardAd(videoEl) {
        if (!videoEl || videoEl.duration <= 0) return;
        try {
            // Tắt tiếng để không phát ra âm thanh quảng cáo
            videoEl.muted = true;
            // Nhảy thẳng tới cuối video quảng cáo để kết thúc lập tức
            videoEl.currentTime = videoEl.duration - 0.1;
            // Tăng tốc độ phát tối đa nếu trình duyệt chưa kịp nhảy time
            videoEl.playbackRate = 16.0;
        } catch(e) {}
    }

    function checkAndKillAds(doc) {
        if (!doc) return;

        // 1. Nhận diện trạng thái đang phát quảng cáo
        var isAdPlaying = false;
        var skipBtn = doc.querySelector('.art-ads-skip, .art-skip, [class*="ads-skip"], [class*="skip-ad"], .jw-skip');
        if (skipBtn && skipBtn.offsetWidth > 0) {
            isAdPlaying = true;
            skipBtn.click();
        }

        // Quét text cảnh báo đếm giây quảng cáo ("Quảng cáo sẽ đóng sau...", "Bỏ qua...")
        var allTextNodes = doc.querySelectorAll('span, div, p');
        for (var i = 0; i < allTextNodes.length; i++) {
            var txt = (allTextNodes[i].textContent || '').toLowerCase();
            if (txt.includes('quảng cáo sẽ đóng sau') || txt.includes('bỏ qua quảng cáo')) {
                isAdPlaying = true;
                break;
            }
        }

        // 2. Nếu đang trong luồng quảng cáo, ép video kết thúc ngay lập tức
        if (isAdPlaying) {
            var videos = doc.querySelectorAll('video');
            for (var v = 0; v < videos.length; v++) {
                fastForwardAd(videos[v]);
            }
        }

        // 3. Tự động bấm "Xem tiếp" (chỉ chạy 1 lần duy nhất khi vào xem lại)
        if (!hasHandledResume) {
            for (var j = 0; j < allTextNodes.length; j++) {
                var resumeTxt = (allTextNodes[j].textContent || '').trim().toLowerCase();
                if (resumeTxt === 'xem tiếp' || resumeTxt === 'tiếp tục xem' || resumeTxt.includes('xem tiếp từ')) {
                    hasHandledResume = true;
                    allTextNodes[j].click();
                    allTextNodes[j].style.display = 'none';
                    setTimeout(function() {
                        var mainVid = doc.querySelector('video');
                        if (mainVid && mainVid.paused) mainVid.play();
                    }, 500);
                    break;
                }
            }
        }
    }

    function scanFrames(doc) {
        if (!doc) return;
        checkAndKillAds(doc);
        var iframes = doc.querySelectorAll('iframe');
        for (var i = 0; i < iframes.length; i++) {
            try {
                var fDoc = iframes[i].contentDocument || iframes[i].contentWindow.document;
                if (fDoc) scanFrames(fDoc);
            } catch(e) {}
        }
    }

    // Quét liên tục mỗi 200ms để triệt tiêu quảng cáo ngay khi vừa xuất hiện
    setInterval(function() {
        scanFrames(document);
    }, 200);
})();
