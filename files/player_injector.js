(function() {
    // Cờ kiểm soát: Chỉ bấm "Xem tiếp" DUY NHẤT 1 LẦN trong suốt phiên xem
    var hasHandledResume = false;

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

    // Ép video quảng cáo tua thẳng về giây cuối cùng
    function fastForwardAd(doc) {
        try {
            var vids = doc.querySelectorAll('video');
            for (var vIdx = 0; vIdx < vids.length; vIdx++) {
                var v = vids[vIdx];
                if (v && v.duration && isFinite(v.duration) && v.currentTime < v.duration) {
                    v.currentTime = v.duration;
                }
            }
        } catch(e) {}
    }

    function handleAutoActions(doc) {
        if (!doc) return;

        // Phát hiện theo class quảng cáo hoặc bộ đếm thời gian quảng cáo
        var adClasses = [
            '[class*="ad-showing"]',
            '[class*="ad-playing"]',
            '[class*="ad-countdown"]',
            '[class*="ad-timer"]',
            '[class*="art-ads"]',
            '[class*="video-ads"]',
            '.jw-flag-ads'
        ];
        for (var a = 0; a < adClasses.length; a++) {
            var adEl = doc.querySelector(adClasses[a]);
            if (adEl && (adEl.offsetWidth > 0 || adEl.offsetHeight > 0)) {
                fastForwardAd(doc);
                break;
            }
        }

        // 1. TỰ ĐỘNG BỎ QUA QUẢNG CÁO (Skip Ads)
        var directSelectors = [
            '.art-ads-skip',
            '.art-skip',
            '[class*="ads-skip"]',
            '[class*="skip-button"]',
            '[class*="btn-skip"]',
            '[class*="skip-ad"]',
            '.jw-skip'
        ];
        for (var s = 0; s < directSelectors.length; s++) {
            var directBtn = doc.querySelector(directSelectors[s]);
            if (directBtn && directBtn.offsetWidth > 0) {
                fastForwardAd(doc);
                simClick(directBtn);
                return;
            }
        }

        var all = doc.querySelectorAll('button, div, span, a, p');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var txt = (el.textContent || '').trim().toLowerCase();

            // Tự động bấm nút "Đóng thông báo" khi tài nguyên quảng cáo bị chặn
            if (txt === 'đóng thông báo' || txt.includes('đóng thông báo')) {
                simClick(el);
                var modal = el.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"], [class*="wrap"]');
                if (modal) modal.style.display = 'none';
                el.style.display = 'none';

                var v = doc.querySelector('video');
                if (v && v.paused) {
                    v.play();
                }
                return;
            }

            // Phát hiện bộ đếm giây quảng cáo qua text
            if ((txt.includes('quảng cáo sau') || txt.includes('bỏ qua sau') || txt.includes('ad in')) && /\d+/.test(txt)) {
                fastForwardAd(doc);
            }

            // Xử lý nút bỏ qua quảng cáo qua text
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

            // 2. TỰ ĐỘNG BẤM "XEM TIẾP" / "TIẾP TỤC XEM" (CHỈ BẤM 1 LẦN)
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
                    hasHandledResume = true; // Khóa cờ ngay lập tức để không click lặp lại
                    simClick(el);

                    // Ẩn thông báo ngay lập tức để giao diện không bị chập chờn
                    el.style.display = 'none';
                    var noticeContainer = el.closest('.art-notice, [class*="notice"], [class*="dialog"]');
                    if (noticeContainer) {
                        noticeContainer.style.display = 'none';
                    }

                    // Chờ player nhảy mốc thời gian xong (800ms) rồi mới kích hoạt Play nếu video vẫn đang dừng
                    setTimeout(function() {
                        var v = doc.querySelector('video');
                        if (v && v.paused) {
                            v.play();
                        }
                    }, 800);
                    return;
                }
            }

            // 3. Ẩn cảnh báo chặn quảng cáo / lỗi tải tài nguyên quảng cáo
            if (txt.includes('có dấu hiệu chặn quảng cáo') || txt.includes('tài nguyên quảng cáo chưa tải được')) {
                var box = el.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                if (box) {
                    box.style.display = 'none';
                } else {
                    el.style.display = 'none';
                    if (el.parentElement) el.parentElement.style.display = 'none';
                }

                var v = doc.querySelector('video');
                if (v && v.paused) {
                    v.play();
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
