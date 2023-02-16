// ==UserScript==
// @name         jupyter notebook auto scroll
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  Add auto scroll to bottom funtion for jupyter notebook pages.
// @author       Scruel Tao
// @match        http*://*/notebook*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var scrollDelay = 100;
    var defalutEnabled = true;

    var scrollEnableMap = new Map();
    var scrollCheckIndex = 1;

    $(".output_scroll").each(function() {
        $(this)[0].scrollTop = $(this)[0].scrollHeight;
    });

    function callScrollToBottom() {
        setTimeout(scrollToBottom, scrollDelay);
    }

    function scrollToBottom() {
        $(".output_scroll").each(function() {
            if (!$(this).attr('scroll_checkbox_index')){
                $(this).attr('scroll_checkbox_index', scrollCheckIndex);
                var div = document.createElement('div');
                var checkbox = document.createElement('input');
                checkbox.type = "checkbox";
                checkbox.setAttribute('scroll_checkbox_index', scrollCheckIndex);
                if (defalutEnabled) {
                    checkbox.checked = "checked";
                }
                checkbox.onclick = function(){
                    scrollEnableMap.set($(this).attr('scroll_checkbox_index'), checkbox.checked);
                };

                div.append("Auto Scroll: ");
                div.append(checkbox);
                $(this).parent().before(div);
                scrollEnableMap.set(scrollCheckIndex++, defalutEnabled);
            }

            if (!scrollEnableMap.has($(this).attr('scroll_checkbox_index'))){
                scrollEnableMap.set($(this).attr('scroll_checkbox_index'), defalutEnabled);
            }
            var flag = scrollEnableMap.get($(this).attr('scroll_checkbox_index'));
            if (flag){
                $(this)[0].scrollTop = $(this)[0].scrollHeight;
            }
        });
        callScrollToBottom();
    }
    scrollToBottom();
})();
