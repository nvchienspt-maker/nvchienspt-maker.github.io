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

    function handleAutoActions(doc) {
        if (!doc) return;

        // 1. TỰ ĐỘNG BỎ QUA QUẢNG CÁO (Skip Ads) theo class
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
                simClick(directBtn);
                return;
            }
        }

        var all = doc.querySelectorAll('button, div, span, a, p');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var txt = (el.textContent || '').trim().toLowerCase();

            // 1.2 Tự động bấm nút Bỏ qua quảng cáo qua text
            if (txt.includes('bỏ qua') || txt.includes('skip ad')) {
                var hasChildSkip = false;
                for (var c = 0; c < el.children.length; c++) {
                    var cTxt = (el.children[c].textContent || '').toLowerCase();
                    if (cTxt.includes('bỏ qua') || cTxt.includes('skip ad')) {
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
                    var childTxt = (el.children[k].textContent || '').toLowerCase();
                    if (childTxt.includes('xem tiếp') || childTxt.includes('tiếp tục xem')) {
                        hasChildResume = true;
                        break;
                    }
                }

                if (!hasChildResume) {
                    hasHandledResume = true; // Khóa cờ ngay lập tức để không click lặp lại
                    simClick(el);

                    // Ẩn thông báo ngay lập tức để không chập chờn khung hình
                    el.style.display = 'none';
                    var noticeContainer = el.closest('.art-notice, [class*="notice"], [class*="dialog"]');
                    if (noticeContainer) {
                        noticeContainer.style.display = 'none';
                    }

                    // Chờ player nhảy mốc thời gian (800ms) rồi kích hoạt play lại nếu đang tạm dừng
                    setTimeout(function() {
                        var v = doc.querySelector('video');
                        if (v && v.paused) {
                            v.play();
                        }
                    }, 800);
                    return;
                }
            }

            // 3. ẨN CẢNH BÁO CHẶN QUẢNG CÁO
            if (txt.includes('có dấu hiệu chặn quảng cáo')) {
                el.style.display = 'none';
                if (el.parentElement) el.parentElement.style.display = 'none';
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
