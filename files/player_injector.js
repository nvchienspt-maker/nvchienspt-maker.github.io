(function() {
    // --- 1. BỘ CHẶN MẠNG (NETWORK INTERCEPTOR) ---
    // Bắt mọi request gọi API lấy link phim, đề phòng web thay đổi code lấy link
    const originalFetch = window.fetch;
    window.fetch = async function() {
        const url = arguments[0];
        const response = await originalFetch.apply(this, arguments);
        
        try {
            // Nếu phát hiện request có dấu hiệu là API trả về m3u8 hoặc mp4 của phim
            if (typeof url === 'string' && (url.includes('/api/') || url.includes('get-movie'))) {
                response.clone().json().then(data => {
                    // Logic tìm link m3u8/mp4 từ cục data JSON trả về (có thể thay đổi linh hoạt trên GitHub)
                    let videoUrl = data.link_phim || data.url || data.file; 
                    let v = document.querySelector('video');
                    if (v && videoUrl) {
                        console.log("Đã bắt được link phim mới:", videoUrl);
                        // Ép video chạy link mới
                        v.src = videoUrl;
                        v.play();
                    }
                }).catch(e => {});
            }
        } catch(e) {}
        return response;
    };


    // --- 2. BỘ XỬ LÝ GIAO DIỆN (Giữ nguyên code cũ của bạn) ---
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
                var ev = new MouseEvent(events[i], {
                    bubbles: true,
                    cancelable: true,
                    view: window,
                    clientX: x,
                    clientY: y
                });
                el.dispatchEvent(ev);
            }
            if (typeof el.click === 'function') {
                el.click();
            }
        } catch(e) {}
    }

    function fastForwardAd(doc) {
        try {
            var vids = doc.querySelectorAll('video');
            for (var vIdx = 0; vIdx < vids.length; vIdx++) {
                var v = vids[vIdx];
                if (v && v.duration && isFinite(v.duration) && v.duration <= 120 && v.currentTime < v.duration) {
                    v.currentTime = v.duration;
                }
            }
        } catch(e) {}
    }

    function handleAutoActions(doc) {
        if (!doc) return;

        var timeoutTexts = ['khởi tạo player quá lâu', 'tải lại trang để thử lại'];
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
                    var reloadBtn = doc.querySelector('button, [role="button"], a');
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
                if (vid && vid.paused) {
                    vid.play();
                }
                return;
            }
        }

        var adClasses = ['[class*="ad-showing"]', '[class*="ad-playing"]', '[class*="ad-countdown"]', '[class*="ad-timer"]', '.jw-flag-ads'];
        for (var a = 0; a < adClasses.length; a++) {
            var adEl = doc.querySelector(adClasses[a]);
            if (adEl && (adEl.offsetWidth > 0 || adEl.offsetHeight > 0)) {
                fastForwardAd(doc);
                break;
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
                var hasChildSkip = false;
                for (var c = 0; c < el.children.length; c++) {
                    if ((el.children[c].textContent || '').toLowerCase().includes('bỏ qua')) {
                        hasChildSkip = true;
                        break;
                    }
                }
                if (!hasChildSkip) {
                    simClick(el);
                    var closestBtn = el.closest('button, [role="button"], a, [class*="skip"]');
                    if (closestBtn && closestBtn !== el) simClick(closestBtn);
                    return;
                }
            }

            if (!hasHandledResume && (txt === 'xem tiếp' || txt === 'tiếp tục xem' || txt.includes('xem tiếp từ'))) {
                var hasChildResume = false;
                for (var k = 0; k < el.children.length; k++) {
                    var cTxt = (el.children[k].textContent || '').toLowerCase();
                    if (cTxt.includes('xem tiếp') || cTxt.includes('tiếp tục xem')) {
                        hasChildResume = true;
                        break;
                    }
                }

                if (!hasChildResume) {
                    hasHandledResume = true; 
                    simClick(el);
                    el.style.display = 'none';
                    var noticeContainer = el.closest('.art-notice, [class*="notice"], [class*="dialog"]');
                    if (noticeContainer) {
                        noticeContainer.style.display = 'none';
                    }

                    setTimeout(function() {
                        var vPlay = doc.querySelector('video');
                        if (vPlay && vPlay.paused) {
                            vPlay.play();
                        }
                    }, 800);
                    return;
                }
            }

            if (txt.includes('có dấu hiệu chặn quảng cáo') || txt.includes('tài nguyên quảng cáo chưa tải được')) {
                var boxAlert = el.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                if (boxAlert) {
                    boxAlert.style.display = 'none';
                } else {
                    el.style.display = 'none';
                    if (el.parentElement) el.parentElement.style.display = 'none';
                }

                var vAlert = doc.querySelector('video');
                if (vAlert && vAlert.paused) {
                    vAlert.play();
                }
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
        if (document.body && document.body.style.overflow !== 'auto') {
            document.body.style.overflow = 'auto';
        }
    }, 500);
})();
