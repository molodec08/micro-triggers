(function () {
  "use strict";

  function getSettingsUrl() {
    var script = document.currentScript;
    var appUrl = script && script.getAttribute("data-settings-url");
    return appUrl || "/apps/micro-triggers/settings";
  }

  function fetchCart(callback) {
    fetch("/cart.js", { credentials: "same-origin" })
      .then(function (res) {
        return res.json();
      })
      .then(callback)
      .catch(function () {
        callback(null);
      });
  }

  function initBlinkingTab(settings, originalTitle) {
    if (!settings || !settings.enabled) return;

    var blinking = false;
    var intervalId = null;
    var message = settings.message || "Come back! Your cart is waiting";

    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        fetchCart(function (cart) {
          var hasItems = cart && cart.item_count > 0;
          if (!hasItems || blinking) return;
          blinking = true;
          var showMessage = false;
          intervalId = window.setInterval(function () {
            document.title = showMessage ? message : originalTitle;
            showMessage = !showMessage;
          }, 1000);
        });
      } else {
        blinking = false;
        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        document.title = originalTitle;
      }
    });
  }

  function initExitPopup(settings) {
    if (!settings || !settings.enabled) return;

    var shown = false;
    var threshold = 20;

    function buildPopup() {
      var overlay = document.createElement("div");
      overlay.setAttribute("data-micro-triggers-exit-popup", "");
      overlay.style.cssText =
        "position:fixed;inset:0;z-index:2147483000;background:rgba(0,0,0,0.5);" +
        "display:flex;align-items:center;justify-content:center;";

      var box = document.createElement("div");
      box.style.cssText =
        "background:#fff;padding:24px 28px;border-radius:8px;max-width:360px;" +
        "text-align:center;font-family:sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.2);";

      var text = document.createElement("p");
      text.textContent = settings.message || "Wait! Here's a discount for you";
      text.style.cssText = "margin:0 0 12px;font-size:16px;";
      box.appendChild(text);

      if (settings.discountCode) {
        var code = document.createElement("p");
        code.textContent = settings.discountCode;
        code.style.cssText =
          "margin:0 0 16px;font-weight:bold;font-size:18px;letter-spacing:1px;";
        box.appendChild(code);
      }

      var closeBtn = document.createElement("button");
      closeBtn.textContent = "Close";
      closeBtn.style.cssText =
        "border:none;background:#111;color:#fff;padding:8px 16px;border-radius:4px;cursor:pointer;";
      closeBtn.addEventListener("click", function () {
        overlay.remove();
      });
      box.appendChild(closeBtn);

      overlay.appendChild(box);
      overlay.addEventListener("click", function (event) {
        if (event.target === overlay) overlay.remove();
      });

      return overlay;
    }

    document.addEventListener("mouseleave", function (event) {
      if (shown) return;
      if (event.clientY > threshold) return;

      fetchCart(function (cart) {
        var hasItems = cart && cart.item_count > 0;
        if (!hasItems || shown) return;
        shown = true;
        document.body.appendChild(buildPopup());
      });
    });
  }

  function initSound(settings) {
    if (!settings || !settings.enabled) return;

    var audioCtx = null;

    function playBeep() {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var oscillator = audioCtx.createOscillator();
        var gain = audioCtx.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = 880;
        gain.gain.value = 0.05;
        oscillator.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.15);
      } catch (e) {
        // Web Audio API недоступен (блокировщик приватности) — тихо игнорируем.
      }
    }

    if (settings.playOnAddCart) {
      document.addEventListener("submit", function (event) {
        var form = event.target;
        if (form && form.action && form.action.indexOf("/cart/add") !== -1) {
          playBeep();
        }
      });
    }

    if (settings.playOnCheckout) {
      document.addEventListener("click", function (event) {
        var target = event.target.closest && event.target.closest('[href*="/checkout"]');
        if (target) playBeep();
      });
    }
  }

  function init() {
    var originalTitle = document.title;
    var settingsUrl = getSettingsUrl();

    fetch(settingsUrl, { credentials: "same-origin" })
      .then(function (res) {
        return res.json();
      })
      .then(function (settings) {
        initBlinkingTab(settings.blinkingTab, originalTitle);
        initExitPopup(settings.exitPopup);
        initSound(settings.sound);
      })
      .catch(function () {
        // Настройки недоступны — триггеры молча не активируются.
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
