(function() {
    // =========================================================
    // 1. TIÊM CSS TÀNG HÌNH HOÀN TOÀN KHUNG QUẢNG CÁO
    // =========================================================
    var hideAdsCSS = document.createElement('style');
    hideAdsCSS.innerHTML = `
        /* Ẩn các class quảng cáo phổ biến của JWPlayer, ArtPlayer, VideoJS */
        .jw-plugin-googima, .jw-plugin-ads, .jw-ads, 
        .art-ad, .art-ads, .art-ad-control, .art-ad-countdown,
        .vjs-ad-playing, .video-js.vjs-ad-playing .vjs-tech,
        [id^="google_ads_"], [id^="ima-"], [class*="ad-showing"],
        .ad-container, .ads-manager, .art-notice, .jw-skip {
            display: none !important;
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            width: 0 !important;
            height: 0 !important;
            z-index: -9999 !important;
        }
    `;
    document.head.appendChild(hideAdsCSS);

    // =========================================================
    // 2. ÉP CÂM TIẾNG VÀ TUA NHANH VIDEO NGAY TỪ GIÂY ĐẦU TIÊN
    // =========================================================
    function instantKillAd(v) {
        // Nếu video có độ dài hợp lệ và dưới 120s (quảng cáo)
        if (v && v.duration && isFinite(v.duration) && v.duration > 0 && v.duration <= 120) {
            v.muted = true;           // Khóa mỏ ngay lập tức
            v.style.opacity = '0';    // Tàng hình video

            // Ép thời gian nhảy đến giây cuối cùng
            if (v.currentTime < v.duration - 0.5) {
                v.currentTime = v.duration;
            }
        }
    }

    // Bắt sự kiện Real-time cho mọi thẻ <video> ngay khi nó vừa xuất hiện trong DOM
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.tagName === 'VIDEO') {
                    // Kích hoạt diệt QC ngay khi video nạp thông tin
                    node.addEventListener('loadedmetadata', () => instantKillAd(node));
                    node.addEventListener('timeupdate', () => instantKillAd(node));
                    node.addEventListener('play', () => instantKillAd(node));
                }
            });
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Quét các thẻ video đã có sẵn trên trang
    document.querySelectorAll('video').forEach(v => {
        v.addEventListener('loadedmetadata', () => instantKillAd(v));
        v.addEventListener('timeupdate', () => instantKillAd(v));
        v.addEventListener('play', () => instantKillAd(v));
    });

    // =========================================================
    // 3. NETWORK INTERCEPTOR (Chặn bắt link phim)
    // =========================================================
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const url = arguments[0];
        const response = await originalFetch.apply(this, arguments);
        try {
            if (typeof url === 'string' && (url.includes('/api/') || url.includes('get-movie'))) {
                response.clone().json().then(data => {
                    let videoUrl = data.link_phim || data.url || data.file; 
                    let v = document.querySelector('video');
                    if (v && videoUrl) {
                        v.src = videoUrl;
                        v.play();
                    }
                }).catch(e => {});
            }
        } catch(e) {}
        return response;
    };

    // =========================================================
    // 4. BỘ XỬ LÝ CLICK GIAO DIỆN CŨ (Giữ nguyên để phòng hờ)
    // =========================================================
    var hasHandledResume = false;
    var hasReloadedForTimeout = false;

    function simClick(el) {
        if (!el) return;
        try {
            var rect = el.getBoundingClientRect();
            var x = rect.left + rect.width / 2;
            var y = rect.top + rect.height / 2;

            var events = ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'];
            for (var i = 0; i < events.length; i++) {
                var ev = new MouseEvent(events[i], { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y });
                el.dispatchEvent(ev);
            }
            if (typeof el.click === 'function') el.click();
        } catch(e) {}
    }

    function fastForwardAd(doc) {
        try {
            var vids = doc.querySelectorAll('video');
            for (var vIdx = 0; vIdx < vids.length; vIdx++) {
                instantKillAd(vids[vIdx]); // Dùng hàm diệt tận gốc ở trên
            }
        } catch(e) {}
    }

    function handleAutoActions(doc) {
        if (!doc) return;

        var allElements = doc.querySelectorAll('button, div, span, a, p');

        for (var t = 0; t < allElements.length; t++) {
            var item = allElements[t];
            var itemTxt = (item.textContent || '').trim().toLowerCase();

            if (itemTxt.includes('khởi tạo player quá lâu')) {
                var v = doc.querySelector('video');
                if (v && (v.readyState >= 2 || v.currentTime > 0)) {
                    var box = item.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                    if (box) box.style.display = 'none';
                    item.style.display = 'none';
                    v.play();
                    return;
                } else if (!hasReloadedForTimeout) {
                    for (var b = 0; b < allElements.length; b++) {
                        var btnTxt = (allElements[b].textContent || '').trim().toLowerCase();
                        if (btnTxt === 'tải lại trang' || btnTxt.includes('tải lại trang')) {
                            hasReloadedForTimeout = true;
                            simClick(allElements[b]);
                            return;
                        }
                    }
                }
            }

            if (itemTxt === 'đóng thông báo' || itemTxt.includes('đóng thông báo')) {
                simClick(item);
                var modal = item.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                if (modal) modal.style.display = 'none';
                item.style.display = 'none';

                var vid = doc.querySelector('video');
                if (vid && vid.paused) vid.play();
                return;
            }
        }

        var directSelectors = ['.art-ads-skip', '.art-skip', '[class*="ads-skip"]', '[class*="skip-button"]', '[class*="btn-skip"]', '[class*="skip-ad"]', '.jw-skip'];
        for (var s = 0; s < directSelectors.length; s++) {
            var directBtn = doc.querySelector(directSelectors[s]);
            if (directBtn && directBtn.offsetWidth > 0) {
                fastForwardAd(doc);
                simClick(directBtn);
                return;
            }
        }

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var txt = (el.textContent || '').trim().toLowerCase();

            if ((txt.includes('quảng cáo sau') || txt.includes('bỏ qua sau') || txt.includes('ad in')) && /\d+/.test(txt)) {
                fastForwardAd(doc);
            }

            if (txt.includes('bỏ qua') || txt.includes('skip ad')) {
                fastForwardAd(doc);
                simClick(el);
                var closestBtn = el.closest('button, [role="button"], a, [class*="skip"]');
                if (closestBtn && closestBtn !== el) simClick(closestBtn);
                return;
            }

            if (!hasHandledResume && (txt === 'xem tiếp' || txt === 'tiếp tục xem' || txt.includes('xem tiếp từ'))) {
                hasHandledResume = true; 
                simClick(el);
                el.style.display = 'none';
                setTimeout(function() {
                    var vPlay = doc.querySelector('video');
                    if (vPlay && vPlay.paused) vPlay.play();
                }, 800);
                return;
            }

            if (txt.includes('có dấu hiệu chặn quảng cáo') || txt.includes('tài nguyên quảng cáo chưa tải được')) {
                var boxAlert = el.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                if (boxAlert) boxAlert.style.display = 'none';
                else el.style.display = 'none';
                
                var vAlert = doc.querySelector('video');
                if (vAlert && vAlert.paused) vAlert.play();
                return;
            }
        }
    }

    function scanAll(doc) {
        if (!doc) return;
        handleAutoActions(doc);
        try {
            var iframes = doc.querySelectorAll('iframe');
            for (var k = 0; k < iframes.length; k++) {
                try {
                    var frameDoc = iframes[k].contentDocument || iframes[k].contentWindow.document;
                    if (frameDoc) scanAll(frameDoc);
                } catch(e) {}
            }
        } catch(e) {}
    }

    setInterval(function() {
        scanAll(document);
    }, 500);
})();
