
/**
 * calculate root font-size for diff device when using rem
 * **/
(function (doc, win) {
    var docEl = doc.documentElement,
        resizeEvt = 'orientationchange' in window ? 'orientationchange' : 'resize',
        recalc = function () {
            var clientWidth = docEl.clientWidth;
            if (!clientWidth) return;
            var fontSize = 20 * (clientWidth / 320);
            /** 根font-size最大值为30px **/
            docEl.style.fontSize = fontSize > 30 ? '30px' : fontSize + 'px';
        };
    if (!doc.addEventListener) return;
    win.addEventListener(resizeEvt, recalc, false);
    doc.addEventListener('DOMContentLoaded', recalc, false);
})(document, window);
