// ==UserScript==
// @name               ChatGPT LaTeX Auto Render (OpenAI, you, bing, etc.)
// @namespace          http://tampermonkey.net/
// @version            0.4.2
// @author             Scruel
// @homepage           https://github.com/scruel/tampermonkey-scripts
// @description        Auto typeset LaTeX math formulas on ChatGPT pages (OpenAI, you, bing, etc.).
// @description:zh-CN  自动渲染 ChatGPT 页面 (OpenAI, you, bing 等) 上的 LaTeX 数学公式。
// @match              https://chat.openai.com/*
// @match              https://you.com/search?*&tbm=youchat*
// @match              https://www.bing.com/search?*
// @grant              none
// ==/UserScript==

'use strict';

const _parsed_mark = '_sc_parsed';

function queryAddNoParsed(query) {
    return query + ":not([" + _parsed_mark + "])";
}

function prepareScript() {
    window._sc_typeset = () => {
        if (window._sc_typesetting) {
            return;
        }
        window._sc_typesetting = true;
        try {
            const messages = window._sc_get_messages();
            messages.forEach((element) => {
                element.setAttribute(_parsed_mark,'');
                MathJax.typesetPromise([element]);
            });
        } catch (ignore) {
        }
        window._sc_typesetting = false;
    }

    const commonCheck = (query) => {
        const submitButton = document.querySelector(query);
        return submitButton && !submitButton.disabled;
    }

    if (window.location.host == "www.bing.com") {
        window._sc_get_messages = () => {
            const elements = [];
            const allChatTurn = document.querySelector("#b_sydConvCont > cib-serp").shadowRoot.querySelector("#cib-conversation-main").shadowRoot.querySelectorAll("#cib-chat-main > cib-chat-turn");
            if (allChatTurn.length == 0) {
                return;
            }
            const allCibMeg = allChatTurn[allChatTurn.length - 1].shadowRoot.querySelector("cib-message-group.response-message-group").shadowRoot.querySelectorAll("cib-message");
            allCibMeg.forEach((cibMeg) => {
                const element = cibMeg.shadowRoot.querySelector(queryAddNoParsed("cib-shared"));
                if (element) {
                    elements.append(element);
                }
            });
            return elements;
        }
        window._sc_isAnswerPrepared = () => {
            const actionBarParent = document.querySelector("#b_sydConvCont > cib-serp");
            if (!actionBarParent) {
                return false;
            }
            const actionBar = actionBarParent.shadowRoot.querySelector("#cib-action-bar-main");
            return actionBar && !actionBar.hasAttribute('cancelable');
        }
    }
    else if (window.location.host == "you.com") {
        window._sc_get_messages = () => {
            return [document.querySelectorAll(queryAddNoParsed('#chatHistory div[data-testid="youchat-answer"]'))];
        }
        window._sc_isAnswerPrepared = () => {
            return commonCheck('main div[data-testid="youchat-input"] textarea+button');
        }
    }
    else if (window.location.host == "chat.openai.com") {
        window._sc_get_messages = () => {
            return document.querySelectorAll(queryAddNoParsed("div.w-full div.text-base div.items-start"));
        }
        window._sc_isAnswerPrepared = () => {
            return commonCheck('main form textarea+button');
        }
    }
}

function renderTrigger() {
    setTimeout(renderLatex, window.renderDelay);
}

function renderLatex() {
    if (window._sc_isAnswerPrepared()) {
        // console.log("Rendering...")
        window._sc_typeset();
    }
    renderTrigger();
}

async function addScript(url) {
    const scriptElement = document.createElement('script');
    const headElement = document.getElementsByTagName('head')[0] || document.documentElement;
    if (!headElement.appendChild(scriptElement)) {
        // Prevent appendChild overwritten problem.
        headElement.append(scriptElement);
    }
    scriptElement.src = url;

    await waitScriptLoaded();
}

function waitScriptLoaded() {
  return new Promise(async (resolve, reject) => {
      const resolver = () => {
          if (MathJax.hasOwnProperty('typeset')) {
              resolve();
              return;
          }
          if (window._sc_ChatLatex.loadCount > 100) {
              setTipsElementText("Failed to load MathJax, try refresh.");
              reject("Failed to load MathJax, try refresh.");
              return;
          }
          window._sc_ChatLatex.loadCount += 1;
          window.setTimeout(resolver, 200);
      }
      resolver();
  });
}

function setTipsElementText(text) {
    window._sc_ChatLatex.tipsElement.innerHTML = text;
}

function showTipsElement() {
    const tipsElement = window._sc_ChatLatex.tipsElement;
    tipsElement.style.position = "fixed";
    tipsElement.style.left = "10px";
    tipsElement.style.bottom = "10px";
    tipsElement.style.background = '#333';
    tipsElement.style.color = '#fff';
    document.body.appendChild(tipsElement);
}

function hideTipsElement(timeout=3) {
    window.setTimeout(() => {window._sc_ChatLatex.tipsElement.hidden=true}, 3000);
}

(async function() {
    window._sc_ChatLatex = {
        tipsElement: document.createElement("div"),
        loadCount: 0
    }
    window.MathJax = {
        tex: {
            inlineMath: [['$', '$'], ['\\(', '\\)']],
            displayMath  : [['$$', '$$']]
        }
    };

    showTipsElement();
    setTipsElementText("Loading MathJax...");
    await addScript('https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js');
    setTipsElementText("MathJax Loaded.");
    hideTipsElement();

    prepareScript();
    window.renderDelay = 1000;
    renderTrigger();
})();
