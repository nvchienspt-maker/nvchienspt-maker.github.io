(function() {
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

        // 1. Quét theo class/selector phổ biến
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
            if (directBtn) {
                simClick(directBtn);
                return;
            }
        }

        // 2. Tìm đúng phần tử chứa chữ "bỏ qua" hoặc "skip"
        var all = doc.querySelectorAll('button, div, span, a, p');
        for (var i = 0; i < all.length; i++) {
            var el = all[i];
            var txt = (el.textContent || '').trim().toLowerCase();

            if (txt.includes('bỏ qua') || txt.includes('skip ad')) {
                var hasChildWithText = false;
                for (var c = 0; c < el.children.length; c++) {
                    var cTxt = (el.children[c].textContent || '').toLowerCase();
                    if (cTxt.includes('bỏ qua') || cTxt.includes('skip ad')) {
                        hasChildWithText = true;
                        break;
                    }
                }
                if (!hasChildWithText) {
                    simClick(el);
                    if (el.parentElement) simClick(el.parentElement);
                    var closestBtn = el.closest('button, [role="button"], a, [class*="skip"]');
                    if (closestBtn && closestBtn !== el) simClick(closestBtn);
                    return;
                }
            }

            // 3. Tự động ấn "Tiếp tục xem"
            if (txt === 'tiếp tục xem') {
                simClick(el);
                if (el.parentElement) simClick(el.parentElement);
                var v = doc.querySelector('video');
                if (v) v.play();
                return;
            }
        }

        // 4. Ẩn thông báo chặn quảng cáo
        var divs = doc.getElementsByTagName('div');
        for (var k = 0; k < divs.length; k++) {
            var elDiv = divs[k];
            if (elDiv.innerText && elDiv.innerText.includes('Có dấu hiệu chặn quảng cáo')) {
                elDiv.style.display = 'none';
                if (elDiv.parentElement) elDiv.parentElement.style.display = 'none';
                break;
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
