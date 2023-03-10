// ==UserScript==
// @name               ChatGPT LaTeX Auto Render (OpenAI, you, new bing, etc.)
// @version            0.5.5
// @author             Scruel Tao
// @homepage           https://github.com/scruel/tampermonkey-scripts
// @description        Auto typeset LaTeX math formulas on ChatGPT pages (OpenAI, new bing, you, etc.).
// @description:zh-CN  自动渲染 ChatGPT 页面 (OpenAI, new bing, you 等) 上的 LaTeX 数学公式。
// @match              https://chat.openai.com/*
// @match              https://www.bing.com/search?*
// @match              https://you.com/search?*&tbm=youchat*
// @match              https://www.you.com/search?*&tbm=youchat*
// @namespace          http://tampermonkey.net/
// @icon               https://chat.openai.com/favicon.ico
// @grant              none
// @noframes
// ==/UserScript==

'use strict';

const _parsed_mark = '_sc_parsed';
function queryAddNoParsed(query) {
    return query + ":not([" + _parsed_mark + "])";
}

async function prepareScript() {
    window._sc_beforeTypesetMsg = (msg) => { msg.setAttribute(_parsed_mark,'');};
    window._sc_afterTypesetMsg = (element) => {};
    window._sc_typeset = () => {
        try {
            const messages = window._sc_getMsgEles();
            messages.forEach(msg => {
                window._sc_beforeTypesetMsg(msg);
                MathJax.typesetPromise([msg]);
                window._sc_afterTypesetMsg(msg);
            });
        } catch (e) {
            console.warn(e);
        }
    }
    window._sc_mutationHandler = (mutation) => {
        if (mutation.oldValue === '') {
            window._sc_typeset();
        }
    };
    window._sc_chatLoaded = () => { return true; };
    window._sc_getObserveElement = () => { return null; };
    var observerOptions = {
        attributeOldValue : true,
        attributeFilter: ['cancelable', 'disabled'],
    };
    var afterMainOvservationStart = () => { window._sc_typeset(); };

    // Handle special cases per site.
    if (window.location.host == "www.bing.com") {
        window._sc_getObserveElement = () => {
            const ele = document.querySelector("#b_sydConvCont > cib-serp");
            if (!ele) {return null;}
            return ele.shadowRoot.querySelector("#cib-action-bar-main");
        }

        const getContMsgEles = (cont, isInChat=true) => {
            const allChatTurn = cont.shadowRoot.querySelector("#cib-conversation-main").shadowRoot.querySelectorAll("cib-chat-turn");
            var lastChatTurnSR = allChatTurn[allChatTurn.length - 1];
            if (isInChat) { lastChatTurnSR = lastChatTurnSR.shadowRoot; }
            const allCibMsgGroup = lastChatTurnSR.querySelectorAll("cib-message-group");
            const allCibMsg = Array.from(allCibMsgGroup).map(e => Array.from(e.shadowRoot.querySelectorAll("cib-message"))).flatMap(e => e);
            return Array.from(allCibMsg).map(cibMsg => cibMsg.shadowRoot.querySelector("cib-shared")).filter(e => e);
        }
        window._sc_getMsgEles = () => {
            try {
                const convCont = document.querySelector("#b_sydConvCont > cib-serp");
                const tigerCont = document.querySelector("#b_sydTigerCont > cib-serp");
                return getContMsgEles(convCont).concat(getContMsgEles(tigerCont, false));
            } catch (ignore) {
                return [];
            }
        }
    }
    else if (window.location.host == "chat.openai.com") {
        window._sc_getObserveElement = () => {
            return document.querySelector("main form textarea+button");
        }
        window._sc_chatLoaded = () => { return document.querySelector('main div.text-sm>svg.animate-spin') === null; };

        afterMainOvservationStart = () => {
            window._sc_typeset();
            // Handle conversation switch
            new MutationObserver((mutationList) => {
                mutationList.forEach(async (mutation) => {
                    if (mutation.addedNodes){
                        window._sc_typeset();
                        startMainOvservation(await getMainObserveElement(true), observerOptions);
                    }
                });
            }).observe(document.querySelector('#__next'), {childList: true});
        };

        window._sc_getMsgEles = () => {
            return document.querySelectorAll(queryAddNoParsed("div.w-full div.text-base div.items-start"));
        }

        window._sc_beforeTypesetMsg = (msg) => {
            msg.setAttribute(_parsed_mark,'');
            // Prevent latex typeset conflict
            const displayEles = msg.querySelectorAll('.math-display');
            displayEles.forEach(e => {
                const texEle = e.querySelector(".katex-mathml annotation");
                e.removeAttribute("class");
                e.textContent = texEle.textContent;
            });
        };
        window._sc_afterTypesetMsg = (element) => { element.style.display = 'unset';}
    }
    else if (window.location.host == "you.com" || window.location.host == "www.you.com") {
        window._sc_getObserveElement = () => {
            return document.querySelector('#chatHistory');
        };
        window._sc_chatLoaded = () => { return document.querySelector('#chatHistory div[data-pinnedconversationturnid]'); };

        observerOptions = {
            childList : true
        };

        window._sc_mutationHandler = (mutation) => {
            mutation.addedNodes.forEach(e => {
                const attr = e.getAttribute('data-testid')
                if (attr && attr.startsWith("youchat-convTurn")) {
                    startTurnAttrObservationForTypesetting(e, 'data-pinnedconversationturnid');
                }
            })
        };

        window._sc_getMsgEles = () => {
            return document.querySelectorAll(queryAddNoParsed('#chatHistory div[data-testid="youchat-answer"]'));
        };
    }
    console.log('Waiting for chat loading...')
    const mainElement = await getMainObserveElement();
    console.log('Chat loaded.')
    startMainOvservation(mainElement, observerOptions);
    afterMainOvservationStart();
}

// After output completed, the attribute of turn element will be changed,
// only with observer won't be enough, so we have this function for sure.
function startTurnAttrObservationForTypesetting(element, doneWithAttr) {
    const tmpObserver = new MutationObserver((mutationList, observer) => {
        mutationList.forEach(mutation => {
            if (mutation.oldValue === null) {
                window._sc_typeset();
                observer.disconnect;
            }
        })
    });
    tmpObserver.observe(element, {
        attributeOldValue : true,
        attributeFilter: [doneWithAttr],
    });
    if (element.hasAttribute(doneWithAttr)) {
        window._sc_typeset();
        tmpObserver.disconnect;
    }
}

function getMainObserveElement(chatLoaded=false) {
  return new Promise(async (resolve, reject) => {
      const resolver = () => {
          const ele = window._sc_getObserveElement();
          if (ele && (chatLoaded || window._sc_chatLoaded())) {
              return resolve(ele);
          }
          window.setTimeout(resolver, 500);
      }
      resolver();
  });
}

function startMainOvservation(mainElement, observerOptions) {
    const callback = (mutationList, observer) => {
        mutationList.forEach(mutation => {
            window._sc_mutationHandler(mutation);
        });
    };
    if (window._sc_mainObserver) {
        window._sc_mainObserver.disconnect();
    }
    window._sc_mainObserver = new MutationObserver(callback);
    window._sc_mainObserver.observe(mainElement, observerOptions);
}

async function addScript(url) {
    const scriptElement = document.createElement('script');
    const headElement = document.getElementsByTagName('head')[0] || document.documentElement;
    if (!headElement.appendChild(scriptElement)) {
        // Prevent appendChild overwritten problem.
        headElement.append(scriptElement);
    }
    scriptElement.src = url;
}

async function waitMathJaxLoaded() {
    while (!MathJax.hasOwnProperty('typeset')) {
        if (window._sc_ChatLatex.loadCount > 20000 / 200) {
            setTipsElementText("Failed to load MathJax, try refresh.", true);
        }
        await new Promise((x) => setTimeout(x, 500));
        window._sc_ChatLatex.loadCount += 1;
    }
}

function showTipsElement() {
    const tipsElement = window._sc_ChatLatex.tipsElement;
    tipsElement.style.position = "fixed";
    tipsElement.style.right = "10px";
    tipsElement.style.top = "10px";
    tipsElement.style.background = '#333';
    tipsElement.style.color = '#fff';
    tipsElement.style.zIndex = '999999';
    var tipContainer = document.body.querySelector('header');
    if (!tipContainer) {
        tipContainer = document.body;
    }
    tipContainer.appendChild(tipsElement);
}

function setTipsElementText(text, errorRaise=false) {
    window._sc_ChatLatex.tipsElement.innerHTML = text;
    if (errorRaise) {
        throw text;
    }
    console.log(text);
}

function hideTipsElement(timeout=3) {
    window.setTimeout(() => {window._sc_ChatLatex.tipsElement.hidden=true; }, 3000);
}

async function loadMathJax() {
    showTipsElement();
    setTipsElementText("Loading MathJax...");
    addScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
    await waitMathJaxLoaded();
    setTipsElementText("MathJax Loaded.");
    hideTipsElement();
}

(async function() {
    window._sc_ChatLatex = {
        tipsElement: document.createElement("div"),
        loadCount: 0
    };
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath  : [['$$', '$$', ['\\[', '\\]']]]
        },
        startup: {
            typeset: false
        }
    };

     await loadMathJax();
     await prepareScript();
})();
