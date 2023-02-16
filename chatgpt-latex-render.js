

    // ==UserScript==
    // @name               OpenAI-ChatGPT LaTeX Auto Render (with MathJax V2)
    // @namespace          http://tampermonkey.net/
    // @version            0.3.3
    // @author             Scruel (https://github.com/scruel)
    // @description        Auto typeset LaTeX math formulas on OpenAI ChatGPT page.
    // @description:zh-CN  自动渲染 OpenAI 的 ChatGPT 页面上的 LaTeX 数学公式。
    // @match              https://chat.openai.com/chat/*
    // @match              https://gpt.chatapi.art
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
     
    function renderLatex() {
        const submitButton = document.querySelector('main form textarea+button');
        // console.log(submitButton)
        if (submitButton && !submitButton.disabled) {
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
     
        window.renderDelay = 1000;
        renderTrigger();
    })();

