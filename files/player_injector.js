(function() {
    // Cờ kiểm soát: Chỉ bấm "Xem tiếp" DUY NHẤT 1 LẦN trong suốt phiên xem
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

    // Ép video quảng cáo tua thẳng về giây cuối cùng (CHỈ áp dụng cho video <= 120s)
    function fastForwardAd(doc) {
        try {
            var vids = doc.querySelectorAll('video');
            for (var vIdx = 0; vIdx < vids.length; vIdx++) {
                var v = vids[vIdx];
                // BẢO VỆ PHIM CHÍNH: Video quảng cáo không bao giờ quá 2 phút (120s).
                // Nếu v.duration > 120s thì đây chắc chắn là phim, tuyệt đối KHÔNG tua.
                if (v && v.duration && isFinite(v.duration) && v.duration <= 120 && v.currentTime < v.duration) {
                    v.currentTime = v.duration;
                }
            }
        } catch(e) {}
    }

    function handleAutoActions(doc) {
        if (!doc) return;

        // 1. XỬ LÝ LỖI "KHỞI TẠO PLAYER QUÁ LÂU"
        var timeoutTexts = ['khởi tạo player quá lâu', 'tải lại trang để thử lại'];
        var allElements = doc.querySelectorAll('button, div, span, a, p');

        for (var t = 0; t < allElements.length; t++) {
            var item = allElements[t];
            var itemTxt = (item.textContent || '').trim().toLowerCase();

            // Nếu xuất hiện thông báo lỗi khởi tạo quá lâu
            if (itemTxt.includes('khởi tạo player quá lâu')) {
                var v = doc.querySelector('video');
                // Nếu video phim đã nạp xong và có thể chạy, ẩn thông báo và phát tiếp
                if (v && (v.readyState >= 2 || v.currentTime > 0)) {
                    var box = item.closest('[class*="modal"], [class*="dialog"], [class*="notice"], [class*="popup"], [class*="mask"]');
                    if (box) box.style.display = 'none';
                    item.style.display = 'none';
                    v.play();
                    return;
                } else if (!hasReloadedForTimeout) {
                    // Nếu player thực sự bị treo, tự bấm nút "Tải lại trang"
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

            // Tự động bấm nút "Đóng thông báo" khi tài nguyên quảng cáo chưa tải được
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

        // 2. PHÁT HIỆN VÀ ÉP TUA QUẢNG CÁO
        var adClasses = [
            '[class*="ad-showing"]',
            '[class*="ad-playing"]',
            '[class*="ad-countdown"]',
            '[class*="ad-timer"]',
            '.jw-flag-ads'
        ];
        for (var a = 0; a < adClasses.length; a++) {
            var adEl = doc.querySelector(adClasses[a]);
            if (adEl && (adEl.offsetWidth > 0 || adEl.offsetHeight > 0)) {
                fastForwardAd(doc);
                break;
            }
        }

        // 3. TỰ ĐỘNG BỎ QUA QUẢNG CÁO (Skip Ads)
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

        for (var i = 0; i < allElements.length; i++) {
            var el = allElements[i];
            var txt = (el.textContent || '').trim().toLowerCase();

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

            // 4. TỰ ĐỘNG BẤM "XEM TIẾP" / "TIẾP TỤC XEM" (CHỈ BẤM 1 LẦN)
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
                        var vPlay = doc.querySelector('video');
                        if (vPlay && vPlay.paused) {
                            vPlay.play();
                        }
                    }, 800);
                    return;
                }
            }

            // 5. Ẩn cảnh báo chặn quảng cáo / lỗi tải tài nguyên
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
