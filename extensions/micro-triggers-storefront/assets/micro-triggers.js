(function () {
  "use strict";

  function getSettingsUrl() {
    var script = document.currentScript;
    var appUrl = script && script.getAttribute("data-settings-url");
    return appUrl || "/apps/micro-triggers/settings";
  }

  function getLeadUrl() {
    var script = document.currentScript;
    var appUrl = script && script.getAttribute("data-lead-url");
    return appUrl || "/apps/micro-triggers/lead";
  }

  function getInventoryUrl() {
    var script = document.currentScript;
    var appUrl = script && script.getAttribute("data-inventory-url");
    return appUrl || "/apps/micro-triggers/inventory";
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

  function formatMoney(cents, currencyCode) {
    var amount = cents / 100;
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode || "USD",
      }).format(amount);
    } catch (e) {
      return amount.toFixed(2) + " " + (currencyCode || "");
    }
  }

  function initBlinkingTab(settings, originalTitle, onBlinkStop) {
    if (!settings || !settings.enabled) return;

    var blinking = false;
    var intervalId = null;
    var message = settings.message || "Come back! Your cart is waiting";
    var intervalMs = settings.intervalMs > 0 ? settings.intervalMs : 1000;

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
          }, intervalMs);
        });
      } else {
        var wasBlinking = blinking;
        blinking = false;
        if (intervalId) {
          window.clearInterval(intervalId);
          intervalId = null;
        }
        document.title = originalTitle;
        if (wasBlinking && onBlinkStop) onBlinkStop();
      }
    });
  }

  function initStickyCartBar(settings) {
    if (!settings || !settings.enabled) return null;

    var bar = null;
    var textEl = null;

    function buildBar() {
      bar = document.createElement("div");
      bar.setAttribute("data-micro-triggers-sticky-bar", "");
      bar.style.cssText =
        "position:fixed;top:0;left:0;right:0;z-index:2147482999;" +
        "background:#111;color:#fff;text-align:center;padding:8px 32px 8px 12px;" +
        "font-family:sans-serif;font-size:13px;position:fixed;";

      textEl = document.createElement("span");
      bar.appendChild(textEl);

      var closeBtn = document.createElement("button");
      closeBtn.type = "button";
      closeBtn.setAttribute("aria-label", "Close");
      closeBtn.textContent = "×";
      closeBtn.style.cssText =
        "position:absolute;right:8px;top:50%;transform:translateY(-50%);" +
        "border:none;background:transparent;color:#fff;cursor:pointer;" +
        "font-size:16px;line-height:1;padding:4px;";
      closeBtn.addEventListener("click", function () {
        bar.style.display = "none";
      });
      bar.appendChild(closeBtn);

      document.body.appendChild(bar);
    }

    function show() {
      fetchCart(function (cart) {
        var count = cart && cart.item_count ? cart.item_count : 0;
        if (!count) {
          if (bar) bar.style.display = "none";
          return;
        }
        if (!bar) buildBar();
        textEl.textContent = String(settings.message || "").replace(
          "{count}",
          count,
        );
        bar.style.display = "block";
      });
    }

    return show;
  }

  function initExitPopup(settings, emailCaptureSettings, leadUrl) {
    if (!settings || !settings.enabled) return;

    var shown = false;
    var threshold = settings.sensitivityPx > 0 ? settings.sensitivityPx : 20;
    var countdownSeconds = settings.countdownSeconds || 0;

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

        if (countdownSeconds > 0) {
          var countdownEl = document.createElement("p");
          countdownEl.style.cssText = "margin:0 0 16px;font-size:12px;color:#666;";
          box.appendChild(countdownEl);

          var remaining = countdownSeconds;
          var render = function () {
            countdownEl.textContent = "Expires in " + remaining + "s";
          };
          render();
          var countdownId = window.setInterval(function () {
            remaining -= 1;
            if (remaining <= 0) {
              window.clearInterval(countdownId);
              countdownEl.textContent = "Offer expired";
              return;
            }
            render();
          }, 1000);
        }
      }

      if (emailCaptureSettings && emailCaptureSettings.enabled) {
        var emailWrap = document.createElement("div");
        emailWrap.style.cssText = "margin:0 0 16px;";

        var emailLabel = document.createElement("p");
        emailLabel.textContent =
          emailCaptureSettings.message || "Leave your email";
        emailLabel.style.cssText = "margin:0 0 8px;font-size:13px;color:#444;";
        emailWrap.appendChild(emailLabel);

        var emailInput = document.createElement("input");
        emailInput.type = "email";
        emailInput.placeholder = "you@example.com";
        emailInput.style.cssText =
          "width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;" +
          "border-radius:4px;font-size:14px;margin-bottom:8px;";
        emailWrap.appendChild(emailInput);

        var submitBtn = document.createElement("button");
        submitBtn.type = "button";
        submitBtn.textContent = "Submit";
        submitBtn.style.cssText =
          "border:none;background:#2c6ecb;color:#fff;padding:8px 16px;" +
          "border-radius:4px;cursor:pointer;width:100%;margin-bottom:4px;";
        submitBtn.addEventListener("click", function () {
          var email = emailInput.value.trim();
          if (!email || email.indexOf("@") === -1) return;
          submitBtn.disabled = true;
          submitBtn.textContent = "Submitting...";
          fetch(leadUrl, {
            method: "POST",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email }),
          })
            .then(function () {
              submitBtn.textContent = "Thanks!";
            })
            .catch(function () {
              submitBtn.disabled = false;
              submitBtn.textContent = "Submit";
            });
        });
        emailWrap.appendChild(submitBtn);

        box.appendChild(emailWrap);
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

    document.addEventListener("mouseout", function (event) {
      if (shown) return;
      if (event.relatedTarget || event.toElement) return;
      if (event.clientY > threshold) return;

      fetchCart(function (cart) {
        var hasItems = cart && cart.item_count > 0;
        if (!hasItems || shown) return;
        shown = true;
        document.body.appendChild(buildPopup());
      });
    });
  }

  var SOUND_PRESETS = {
    beep: [{ freq: 880, type: "sine", duration: 0.15 }],
    bell: [
      { freq: 988, type: "sine", duration: 0.12 },
      { freq: 1319, type: "sine", duration: 0.2, delay: 0.08 },
    ],
    coin: [
      { freq: 988, type: "square", duration: 0.08 },
      { freq: 1319, type: "square", duration: 0.18, delay: 0.08 },
    ],
  };

  function initSound(settings) {
    if (!settings || !settings.enabled) return;

    var audioCtx = null;

    function playNote(note, startDelay) {
      var oscillator = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      oscillator.type = note.type || "sine";
      oscillator.frequency.value = note.freq;
      gain.gain.value = 0.05;
      oscillator.connect(gain);
      gain.connect(audioCtx.destination);
      var startTime = audioCtx.currentTime + startDelay;
      oscillator.start(startTime);
      oscillator.stop(startTime + note.duration);
    }

    function playBeep() {
      try {
        audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
        var notes = SOUND_PRESETS[settings.soundPreset] || SOUND_PRESETS.beep;
        for (var i = 0; i < notes.length; i++) {
          playNote(notes[i], notes[i].delay || 0);
        }
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

  function initLowStockBadge(settings, inventoryUrl) {
    if (!settings || !settings.enabled) return;

    // Работает только на странице товара (`/products/{handle}`). Остаток не
    // берётся из публичного `product.js` — Shopify никогда не отдаёт
    // `inventory_quantity` в этом эндпоинте (проверено на реальном сторе,
    // поле отсутствует независимо от товара/темы). Вместо этого остаток
    // запрашивается через собственный App Proxy route, который дёргает
    // Admin GraphQL API (requires `read_products` scope).
    var match = window.location.pathname.match(/\/products\/([^/?#]+)/);
    if (!match) return;

    // Страница товара может содержать несколько `form[action*="/cart/add"]`:
    // скрытые служебные формы (напр. Shop Pay installments) и/или формы
    // рекомендованных товаров ниже на странице — не только форму текущего
    // товара. Берём первую ВИДИМУЮ такую форму, а не просто первую в DOM,
    // иначе бейдж может быть вставлен в скрытую форму и никогда не показан.
    var forms = document.querySelectorAll('form[action*="/cart/add"]');
    var form = null;
    for (var i = 0; i < forms.length; i++) {
      if (forms[i].offsetParent !== null) {
        form = forms[i];
        break;
      }
    }
    if (!form) return;

    var badge = null;
    var requestId = 0;

    renderForCurrentVariant();

    var idInput = form.querySelector('[name="id"]');
    if (idInput) {
      // Большинство тем обновляют это скрытое поле через `change` при
      // выборе другого варианта (размер/цвет) — пересчитываем бейдж.
      idInput.addEventListener("change", renderForCurrentVariant);
      form.addEventListener("change", renderForCurrentVariant);
    }

    function renderForCurrentVariant() {
      var idInput = form.querySelector('[name="id"]');
      var variantId = idInput && idInput.value;
      if (!variantId) {
        hideBadge();
        return;
      }

      var thisRequest = ++requestId;
      fetch(
        inventoryUrl + "?variantId=" + encodeURIComponent(variantId),
        { credentials: "same-origin" },
      )
        .then(function (res) {
          return res.json();
        })
        .then(function (data) {
          if (thisRequest !== requestId) return; // устаревший ответ (вариант уже сменился)
          if (!data || !data.tracked || typeof data.quantity !== "number") {
            hideBadge();
            return;
          }
          renderBadge(data.quantity);
        })
        .catch(function () {
          // Proxy/Admin API недоступны — бейдж просто не показывается.
          hideBadge();
        });
    }

    function hideBadge() {
      if (badge) badge.style.display = "none";
    }

    function renderBadge(quantity) {
      var threshold = settings.threshold > 0 ? settings.threshold : 5;
      if (quantity <= 0 || quantity > threshold) {
        hideBadge();
        return;
      }
      if (!badge) {
        badge = document.createElement("p");
        badge.setAttribute("data-micro-triggers-low-stock", "");
        badge.style.cssText =
          "color:#d82c0d;font-size:13px;font-family:sans-serif;margin:8px 0;";
        form.insertBefore(badge, form.firstChild);
      }
      badge.textContent = String(
        settings.message || "Only {count} left in stock!",
      ).replace("{count}", quantity);
      badge.style.display = "block";
    }
  }

  function initFreeShippingBar(settings) {
    if (!settings || !settings.enabled) return;

    function render() {
      fetchCart(function (cart) {
        if (!cart) return;
        var total = cart.total_price || 0;
        var thresholdCents =
          settings.thresholdCents > 0 ? settings.thresholdCents : 5000;
        var bar = document.querySelector("[data-micro-triggers-free-shipping]");
        if (!bar) {
          bar = document.createElement("div");
          bar.setAttribute("data-micro-triggers-free-shipping", "");
          // Раньше бар искал контейнер темы по имени ("cart-drawer" в id/class) и
          // вставлял себя туда. На части тем такой контейнер существует в DOM, но
          // не является видимым floating-виджетом (например, обычная секция в
          // потоке страницы, физически внизу документа) — бар физически
          // существовал, но реальный посетитель никогда его не видел. Поэтому бар
          // всегда рендерится как отдельная fixed-полоса, тем же паттерном, что
          // уже надёжно работает у sticky back-to-cart bar, а не полагается на
          // угадывание разметки конкретной темы. Закреплён снизу (в отличие от
          // sticky back-to-cart bar сверху), чтобы оба бара могли быть видны
          // одновременно без наложения друг на друга.
          bar.style.cssText =
            "position:fixed;bottom:0;left:0;right:0;z-index:2147482998;" +
            "background:#f1f8f4;color:#0f5132;text-align:center;padding:8px 12px;" +
            "font-family:sans-serif;font-size:13px;";
          document.body.appendChild(bar);
        }

        if (total >= thresholdCents) {
          bar.textContent =
            settings.successMessage || "You've unlocked free shipping!";
        } else {
          var remaining = formatMoney(thresholdCents - total, cart.currency);
          bar.textContent = String(
            settings.message || "Add {remaining} more to get free shipping!",
          ).replace("{remaining}", remaining);
        }
      });
    }

    document.addEventListener("submit", function (event) {
      var form = event.target;
      if (form && form.action && form.action.indexOf("/cart/add") !== -1) {
        window.setTimeout(render, 300);
      }
    });

    render();
  }

  function init() {
    var originalTitle = document.title;
    var settingsUrl = getSettingsUrl();
    var leadUrl = getLeadUrl();
    var inventoryUrl = getInventoryUrl();

    fetch(settingsUrl, { credentials: "same-origin" })
      .then(function (res) {
        return res.json();
      })
      .then(function (settings) {
        var showStickyBar = initStickyCartBar(settings.stickyCartBar);
        initBlinkingTab(settings.blinkingTab, originalTitle, showStickyBar);
        initExitPopup(settings.exitPopup, settings.emailCapture, leadUrl);
        initSound(settings.sound);
        initLowStockBadge(settings.lowStockBadge, inventoryUrl);
        initFreeShippingBar(settings.freeShippingBar);
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
