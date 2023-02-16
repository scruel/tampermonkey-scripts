// ==UserScript==
// @name               ChatGPT LaTeX Auto Render (OpenAI, you, bing, etc.)
// @namespace          http://tampermonkey.net/
// @version            0.3.6
// @author             Scruel
// @homepage           https://github.com/scruel/tampermonkey-scripts
// @description        Auto typeset LaTeX math formulas on ChatGPT pages (OpenAI, you, bing, etc.).
// @description:zh-CN  自动渲染 ChatGPT 页面 (OpenAI, you, bing 等) 上的 LaTeX 数学公式。
// @match              https://chat.openai.com/chat/*
// @match              https://you.com/search?*&tbm=youchat*
// @grant              none
// ==/UserScript==

'use strict';

async function addScript(url) {
    const scriptElement = document.createElement('script');
    scriptElement.src = url;
    scriptElement.async = true;

    const headElement = document.getElementsByTagName('head')[0] || document.documentElement;
    headElement.appendChild(scriptElement);
    await waitScriptLoaded();
}

function waitScriptLoaded() {
  return new Promise(async (resolve, reject) => {
      const resolver = () => {
          if (MathJax.hasOwnProperty('Hub')) {
              resolve();
              return;
          }
          if (window.ChatLatex.loadCount > 100) {
              setTipsElementText("Failed to load MathJax, try refresh.");
              reject("Failed to load MathJax, try refresh.");
              return;
          }
          window.ChatLatex.loadCount += 1;
          window.setTimeout(resolver, 200);
      }
      resolver();
  });
}

function renderTrigger() {
    setTimeout(renderLatex, window.renderDelay);
}

function loadingCheckFn() {
    const commonCheck = (query) => {
        const submitButton = document.querySelector(query);
        return submitButton && !submitButton.disabled;
    }
    if (window.location.host == 'you.com') {
        window.isChatLoading = () => {
            return commonCheck('main div[data-testid="youchat-input"] textarea+button');
        }
    }
    if (window.location.host == 'chat.openai.com') {
        window.isChatLoading = () => {
            return commonCheck('main form textarea+button');
        }
    }
}

function renderLatex() {
    if (window.isChatLoading()) {
        // console.log("Rendering...")
        MathJax.Hub.Queue(["Typeset", MathJax.Hub]);
    }
    renderTrigger();
}

function showTipsElement() {
    const tipsElement = window.ChatLatex.tipsElement;
    tipsElement.style.position = "fixed";
    tipsElement.style.left = "10px";
    tipsElement.style.bottom = "10px";
    tipsElement.style.background = '#333';
    tipsElement.style.color = '#fff';
    document.body.appendChild(tipsElement);
}

function setTipsElementText(text) {
    window.ChatLatex.tipsElement.innerHTML = text;
}

function hideTipsElement(timeout=3) {
    window.setTimeout(() => {window.ChatLatex.tipsElement.hidden=true}, 3000);
}

(async function() {
    window.ChatLatex = {
        tipsElement: document.createElement("div"),
        loadCount: 0
    }
    window.MathJax = {
        tex2jax: {
            inlineMath: [['$', '$']],
            displayMath  : [['$$', '$$']]
        },
        CommonHTML: { linebreaks: { automatic: true } },
        "HTML-CSS": { linebreaks: { automatic: true } },
        SVG: { linebreaks: { automatic: true } },
    };

    showTipsElement();
    setTipsElementText("Loading MathJax...");
    await addScript('https://cdn.jsdelivr.net/npm/mathjax@2/MathJax.js?config=TeX-AMS_CHTML');
    setTipsElementText("MathJax Loaded.");
    hideTipsElement();

    loadingCheckFn();
    window.renderDelay = 1000;
    renderTrigger();
})();
