/*
 * dynamic-title.js
 * Анимированный document.title: фраза "собирается" из случайных символов.
 *
 * Подключение:
 *   <script src="dynamic-title.js" defer></script>
 *
 * Или с настройками (до подключения скрипта):
 *   <script>
 *     window.DYNAMIC_TITLE = { phrases: ["z3n1337.dev", "portfolio"], tick: 30 };
 *   </script>
 */
(function () {
  "use strict";

  var userConfig = window.DYNAMIC_TITLE || {};

  var config = {
    // Список фраз. Каждый цикл выбирается случайная (не та же, что была).
    phrases: ["njoiu.dev", "yoshi made a game", "six seven", "Despite everything, it's still you"],
    // Скорость смены символа в одной позиции, мс ("быстро, но не мгновенно")
    tick: 35,
    // Задержка между стартом соседних позиций, мс (эффект "построения" слева направо)
    stagger: 70,
    // Сколько держать готовую фразу, мс
    hold: 3500,
    // Повторять с новой фразой после паузы
    loop: false,
    // Набор символов: латиница, цифры, знаки
    charset:
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789" +
      "!@#$%^&*()-_=+[]{};:'\",.<>/?\\|`~"
  };
  for (var k in userConfig) config[k] = userConfig[k];

  var timer = null;
  var lastPhrase = null;

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function pickPhrase() {
    var list = config.phrases;
    if (list.length === 1) return list[0];
    var p;
    do {
      p = list[Math.floor(Math.random() * list.length)];
    } while (p === lastPhrase);
    lastPhrase = p;
    return p;
  }

  // Колода для одной позиции: все символы набора + целевой символ,
  // перемешаны, без повторов. Позиция фиксируется, когда дойдёт до целевого.
  function makeDeck(target) {
    var pool = config.charset.split("");
    if (pool.indexOf(target) === -1) pool.push(target); // кириллица и т.п.
    return shuffle(pool);
  }

  function build(phrase, done) {
    var chars = Array.from(phrase);
    var n = chars.length;
    var decks = chars.map(function (c) {
      return c === " " ? null : makeDeck(c);
    });
    var idx = new Array(n).fill(0);
    var locked = chars.map(function (c) {
      return c === " ";
    });
    var out = chars.map(function (c) {
      return c === " " ? " " : "";
    });

    var startedAt = Date.now();

    function step() {
      var elapsed = Date.now() - startedAt;
      var allDone = true;

      for (var i = 0; i < n; i++) {
        if (locked[i]) continue;
        allDone = false;
        // позиция i стартует не раньше i * stagger
        if (elapsed < i * config.stagger) continue;

        var ch = decks[i][idx[i]++];
        out[i] = ch;
        if (ch === chars[i]) locked[i] = true;
      }

      // Пока позиция не стартовала, показываем только уже начатую часть
      var visible = [];
      for (var j = 0; j < n; j++) {
        if (out[j] === "" ) break;
        visible.push(out[j]);
      }
      document.title = visible.join("") || "​";

      if (allDone) {
        document.title = phrase;
        done();
      } else {
        timer = setTimeout(step, config.tick);
      }
    }

    step();
  }

  function run() {
    build(pickPhrase(), function () {
      if (!config.loop) return;
      timer = setTimeout(run, config.hold);
    });
  }

  // Публичное API
  window.DynamicTitle = {
    start: function () {
      this.stop();
      run();
    },
    stop: function () {
      clearTimeout(timer);
      timer = null;
    }
  };

  window.DynamicTitle.start();
})();