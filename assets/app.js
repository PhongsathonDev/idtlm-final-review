/* 69-1IDTLM TCT1 — อ่านสอบปลายภาค
   Vanilla JS, no build step. Works from file:// as well as a static host. */

(function () {
  "use strict";

  var GROUPS = window.COURSE_GROUPS || [];
  var TOTAL_ITEMS = GROUPS.reduce(function (s, g) { return s + g.items; }, 0);
  var EXAM = new Date("2026-10-28T13:00:00+07:00");
  var KEY = "idtlm.exam.v1";

  var state = load();
  var observer = null;

  /* ---------------- state ---------------- */

  function load() {
    try {
      var raw = JSON.parse(localStorage.getItem(KEY) || "{}");
      return {
        read: raw.read || {},
        quiz: raw.quiz || {}
      };
    } catch (e) {
      return { read: {}, quiz: {} };
    }
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  function readCount(g) {
    var a = state.read[g.n] || [];
    return Math.min(a.length, g.sections.length);
  }

  function isDone(g) { return readCount(g) >= g.sections.length; }

  function groupDoneCount() {
    return GROUPS.filter(isDone).length;
  }

  function filledItems() {
    return GROUPS.reduce(function (sum, g) {
      return sum + Math.round(g.items * (readCount(g) / g.sections.length));
    }, 0);
  }

  function markSection(g, i) {
    var a = state.read[g.n] || [];
    if (a.indexOf(i) === -1) {
      a.push(i);
      state.read[g.n] = a;
      save();
      updateProgress();
    }
  }

  function setGroupRead(g, on) {
    state.read[g.n] = on ? g.sections.map(function (_, i) { return i; }) : [];
    save();
    updateProgress();
  }

  /* ---------------- helpers ---------------- */

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  function pad(n) { return n < 10 ? "0" + n : String(n); }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove("show"); }, 1800);
  }

  function countdownText() {
    var ms = EXAM - new Date();
    if (ms <= 0) return "ถึงเวลาสอบแล้ว";
    var d = Math.floor(ms / 86400000);
    var h = Math.floor((ms % 86400000) / 3600000);
    if (d > 0) return "เหลืออีก " + d + " วัน " + h + " ชม.";
    return "เหลืออีก " + h + " ชม.";
  }

  function tick() {
    var c = document.getElementById("clock");
    if (c) c.textContent = countdownText();
  }

  /* ---------------- rail ---------------- */

  function renderRail(active) {
    var rail = document.getElementById("rail");
    rail.innerHTML = "";
    rail.appendChild(el("div", "rail-head", "กลุ่มข้อสอบ · 11 กลุ่ม"));

    GROUPS.forEach(function (g) {
      var a = el("a", "rail-row");
      a.href = "#/g/" + g.n;
      if (active === g.n) a.setAttribute("aria-current", "page");
      a.innerHTML =
        '<span class="rail-bub' + (isDone(g) ? " on" : "") + '"></span>' +
        '<span class="rail-num">' + pad(g.n) + "</span>" +
        '<span class="rail-title">' + esc(g.short) + "</span>" +
        '<span class="rail-count">' + g.items + "</span>";
      rail.appendChild(a);
    });

    var foot = el("div", "rail-foot");
    foot.innerHTML =
      '<div class="rail-progress">ฝนแล้ว ' + filledItems() + " / " + TOTAL_ITEMS + " ข้อ</div>" +
      "<div>อ่านจบ " + groupDoneCount() + " จาก " + GROUPS.length + " กลุ่ม</div>";
    rail.appendChild(foot);
  }

  function updateProgress() {
    var active = document.querySelector(".rail-row[aria-current]");
    var rail = document.getElementById("rail");
    var scrollTop = rail ? rail.scrollTop : 0;
    renderRail(active ? Number(active.getAttribute("href").split("/")[2]) : null);
    if (rail) rail.scrollTop = scrollTop;

    document.querySelectorAll("[data-bubble]").forEach(function (b) {
      var g = groupByN(Number(b.getAttribute("data-group")));
      b.classList.toggle("on", Number(b.getAttribute("data-item")) < groupFilled(g));
    });

    var sheetCount = document.getElementById("sheetCount");
    if (sheetCount) sheetCount.textContent = filledItems() + " / " + TOTAL_ITEMS;

    var btn = document.getElementById("readAll");
    if (btn) {
      var g = groupByN(Number(btn.getAttribute("data-group")));
      var done = isDone(g);
      btn.setAttribute("aria-pressed", done ? "true" : "false");
      btn.querySelector(".label").textContent = done ? "อ่านจบกลุ่มนี้แล้ว" : "ทำครบทั้งกลุ่ม";
    }

    var rs = document.querySelector(".read-state");
    if (rs) {
      var rg = groupByN(Number(rs.getAttribute("data-group")));
      rs.textContent = isDone(rg) ? "อ่านจบแล้ว" : "อ่าน " + readCount(rg) + "/" + rg.sections.length;
    }

    var mr = document.getElementById("mRead");
    if (mr) mr.textContent = readCount(groupByN(Number(mr.getAttribute("data-group"))));

    var mf = document.getElementById("mFilled");
    if (mf) {
      var gf = groupByN(Number(mf.getAttribute("data-group")));
      mf.textContent = "ฝนแล้ว " + groupFilled(gf) + " จาก " + gf.items + " ข้อ";
    }

    document.querySelectorAll("[data-read-dot]").forEach(function (d) {
      var gd = groupByN(Number(d.getAttribute("data-group")));
      var idx = Number(d.getAttribute("data-read-dot"));
      d.classList.toggle("on", (state.read[gd.n] || []).indexOf(idx) !== -1);
    });
  }

  function groupByN(n) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].n === n) return GROUPS[i];
    return GROUPS[0];
  }

  function groupFilled(g) {
    return Math.round(g.items * (readCount(g) / g.sections.length));
  }

  /* ---------------- home ---------------- */

  function renderHome() {
    document.title = "อ่านสอบปลายภาค · 69-1IDTLM TCT1";
    var main = document.getElementById("main");
    main.innerHTML = "";
    main.style.maxWidth = "";
    var page = el("div", "page page--home");

    var cover = el("section", "cover");
    cover.innerHTML =
      '<div class="cover-copy">' +
        '<p class="eyebrow">69-1IDTLM TCT1 · ปลายภาค 28 ตุลาคม 2569</p>' +
        "<h1>อ่านให้ครบ แล้วไปฝนให้เต็มวง</h1>" +
        '<p class="cover-lede">สรุปเนื้อหาทั้ง 11 กลุ่มข้อสอบจากสไลด์บรรยาย พร้อมแบบทดสอบสั้น ๆ ท้ายกลุ่ม — วงกลมแต่ละวงในแผ่นฝนด้านขวาจะถูกฝนขึ้นเมื่อคุณอ่านผ่านแต่ละหัวข้อ</p>' +
        '<dl class="facts">' +
          "<div><dt>จำนวนข้อ</dt><dd>140 ข้อ · 140 คะแนน</dd></div>" +
          "<div><dt>เวลาสอบ</dt><dd>3 ชั่วโมง</dd></div>" +
          "<div><dt>รูปแบบ</dt><dd>ปรนัย 4 ตัวเลือก</dd></div>" +
          "<div><dt>วันสอบ</dt><dd>28 ต.ค. 2569 · 13:00</dd></div>" +
        "</dl>" +
      "</div>" +
      '<div class="cover-side">' + sheetHTML() + "</div>";
    page.appendChild(cover);

    var toc = el("section", "toc");
    toc.innerHTML =
      '<div class="toc-head"><h2>สารบัญ 11 กลุ่ม</h2><span>' +
      filledItems() + " / " + TOTAL_ITEMS + " ข้อ</span></div>";
    GROUPS.forEach(function (g) {
      var a = el("a", "toc-row");
      a.href = "#/g/" + g.n;
      var qz = state.quiz[g.n];
      a.innerHTML =
        '<span class="toc-num">' + pad(g.n) + "</span>" +
        '<span class="toc-main"><span class="toc-title">' + esc(g.title) +
          '<span class="toc-sub">' + esc(g.short) + "</span>" +
        "</span></span>" +
        '<span class="toc-meta">' +
          '<span class="toc-range">' + esc(g.range) + "</span>" +
          '<span class="toc-items">' + g.items + " ข้อ</span>" +
          '<em class="toc-state' + (isDone(g) ? " done" : "") + '">' +
            (isDone(g) ? "อ่านจบแล้ว" : "อ่าน " + readCount(g) + "/" + g.sections.length) +
            (qz ? " · ทดสอบ " + qz.right + "/" + qz.total : "") +
          "</em>" +
        "</span>";
      toc.appendChild(a);
    });

    var mock = el("div", "read-bar");
    mock.innerHTML =
      '<a class="check-btn" href="#/mock">สุ่มทดสอบ 25 ข้อ</a>' +
      '<a class="check-btn" href="#/cram">เปิดโหมดโค้งสุดท้าย</a>' +
      '<span class="read-note">ความคืบหน้าถูกเก็บไว้ในเบราว์เซอร์เครื่องนี้</span>';
    toc.appendChild(mock);
    page.appendChild(toc);
    main.appendChild(page);

    bindSheet();
  }

  function sheetHTML() {
    var rows = GROUPS.map(function (g) {
      var bubs = "";
      for (var i = 0; i < g.items; i++) {
        bubs += '<span class="bub' + (i < groupFilled(g) ? " on" : "") +
          '" data-bubble data-group="' + g.n + '" data-item="' + i + '"></span>';
      }
      return '<button class="sheet-row" type="button" data-go="' + g.n +
        '" aria-label="กลุ่ม ' + g.n + " " + esc(g.short) + " " +
        groupFilled(g) + " จาก " + g.items + ' ข้อ"><span class="sheet-num">' +
        pad(g.n) + "</span>" + bubs + "</button>";
    }).join("");

    return '<div class="sheet" role="group" aria-label="แผ่นฝนความคืบหน้า">' +
      '<div class="sheet-head"><span>กระดาษคำตอบ · 140 ข้อ</span>' +
      '<b id="sheetCount">' + filledItems() + " / " + TOTAL_ITEMS + "</b></div>" +
      rows +
      '<div class="sheet-legend"><span><i></i>ยังไม่อ่าน</span><span><i class="on"></i>อ่านแล้ว</span></div>' +
      "</div>";
  }

  function bindSheet() {
    document.querySelectorAll(".sheet-row").forEach(function (b) {
      b.addEventListener("click", function () {
        location.hash = "#/g/" + b.getAttribute("data-go");
      });
    });
  }

  /* ---------------- group ---------------- */

  function renderGroup(n, tab) {
    var g = groupByN(n);
    if (!g) { location.hash = "#/"; return; }

    document.title = "กลุ่ม " + pad(g.n) + " · " + g.short;
    var main = document.getElementById("main");
    main.innerHTML = "";
    main.style.maxWidth = "";

    var page = el("div", "page page--read");
    var col = el("div", "content-col");

    var head = el("header", "group-head");
    head.innerHTML =
      '<p class="eyebrow"><a class="back" href="#/">← สารบัญ</a> กลุ่มที่ ' + g.n + " · " + esc(g.range) + "</p>" +
      "<h1>" + esc(g.title) + "</h1>" +
      '<div class="group-sub"><span>' + g.items + " ข้อ</span><span>" +
      g.sections.length + ' หัวข้อ</span><span class="read-state" data-group="' + g.n + '">' +
      (isDone(g) ? "อ่านจบแล้ว" : "อ่าน " + readCount(g) + "/" + g.sections.length) +
      "</span></div>";
    col.appendChild(head);

    if (tab === "quiz") {
      col.appendChild(quizSection(g));
      col.appendChild(pager(g));
      page.appendChild(col);
      page.appendChild(marginBlock(g));
      main.appendChild(page);
      return;
    }

    var lead = el("p", "group-lead", esc(g.lead));
    col.appendChild(lead);

    var prose = el("div", "prose");
    g.sections.forEach(function (s, i) {
      var sect = el("section", "sect");
      sect.setAttribute("data-sect", i);
      sect.id = "sect-" + g.n + "-" + i;
      var html = "<h2>" + esc(s.h) + "</h2>";
      (s.p || []).forEach(function (t) { html += "<p>" + t + "</p>"; });
      if (s.li && s.li.length) {
        html += "<ul>" + s.li.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
      }
      sect.innerHTML = html;
      prose.appendChild(sect);
    });
    col.appendChild(prose);

    var focus = el("aside", "focus");
    focus.innerHTML = "<h2>จุดที่มักออกสอบ</h2><ul>" +
      g.focus.map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>";
    col.appendChild(focus);

    col.appendChild(termsBlock(g));

    var bar = el("div", "read-bar");
    bar.innerHTML =
      '<button class="check-btn" id="readAll" type="button" data-group="' + g.n +
      '" aria-pressed="' + (isDone(g) ? "true" : "false") + '">' +
      '<span class="box"></span><span class="label">' +
      (isDone(g) ? "อ่านจบกลุ่มนี้แล้ว" : "ทำครบทั้งกลุ่ม") + "</span></button>" +
      '<a class="check-btn" href="#/g/' + g.n + '/quiz">ทำแบบทดสอบ ' + g.quiz.length + " ข้อ</a>" +
      '<span class="read-note">วงกลมจะถูกฝนอัตโนมัติเมื่อเลื่อนผ่านแต่ละหัวข้อ</span>';
    col.appendChild(bar);

    col.appendChild(sourcesBlock(g));
    col.appendChild(pager(g));

    page.appendChild(col);
    page.appendChild(marginBlock(g));
    main.appendChild(page);

    document.getElementById("readAll").addEventListener("click", function () {
      setGroupRead(g, !isDone(g));
      toast(isDone(g) ? "ฝนครบ " + g.items + " ข้อของกลุ่มนี้แล้ว" : "ล้างเครื่องหมายของกลุ่มนี้แล้ว");
    });

    observeSections(g);
  }

  /* right-hand margin: section index, progress, quiz shortcut (desktop only) */
  function marginBlock(g) {
    var m = el("aside", "margin");
    m.setAttribute("aria-label", "เครื่องมือในกลุ่มนี้");

    var read = state.read[g.n] || [];
    var nav = g.sections.map(function (s, i) {
      return '<li><button type="button" class="m-jump" data-jump="' + i +
        '" data-sect-link="' + i + '">' +
        '<span class="m-num">' + pad(i + 1) + "</span>" +
        '<span class="m-text">' + esc(s.h) + "</span>" +
        '<span class="m-dot' + (read.indexOf(i) !== -1 ? " on" : "") +
          '" data-read-dot="' + i + '" data-group="' + g.n + '"></span>' +
      "</button></li>";
    }).join("");

    var bubs = "";
    for (var i = 0; i < g.items; i++) {
      bubs += '<span class="bub' + (i < groupFilled(g) ? " on" : "") +
        '" data-bubble data-group="' + g.n + '" data-item="' + i + '"></span>';
    }

    m.innerHTML =
      '<div class="m-block">' +
        '<p class="m-label">ในกลุ่มนี้</p>' +
        '<ol class="m-nav">' + nav + "</ol>" +
      "</div>" +
      '<div class="m-block">' +
        '<p class="m-label">ความคืบหน้า</p>' +
        '<p class="m-progress"><b id="mRead" data-group="' + g.n + '">' + readCount(g) +
          "</b> / " + g.sections.length + " หัวข้อ</p>" +
        '<div class="m-bubs" aria-hidden="true">' + bubs + "</div>" +
        '<p class="m-note" id="mFilled" data-group="' + g.n + '">ฝนแล้ว ' +
          groupFilled(g) + " จาก " + g.items + " ข้อ</p>" +
      "</div>" +
      '<a class="m-cta" href="#/g/' + g.n + '/quiz">ทำแบบทดสอบ ' + g.quiz.length + " ข้อ</a>";

    m.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest("[data-jump]") : null;
      if (!b) return;
      var s = document.getElementById("sect-" + g.n + "-" + b.getAttribute("data-jump"));
      if (s) s.scrollIntoView({ block: "start" });
    });

    return m;
  }

  function termsBlock(g) {
    var box = el("section", "terms");
    box.innerHTML = "<h2>ศัพท์ที่ต้องแม่น</h2><dl>" +
      g.terms.map(function (t) {
        return "<dt>" + t.t + "</dt><dd>" + t.d + "</dd>";
      }).join("") + "</dl>";
    return box;
  }

  /* PDF sources live next to the site folder on this machine only;
     on a hosted copy (GitHub Pages) show the file name without a dead link. */
  var HOSTED = /^https?:$/.test(location.protocol) &&
    location.hostname !== "localhost" && location.hostname !== "127.0.0.1";

  function isLocalSource(href) {
    return href.indexOf("../") === 0 || href.indexOf("file:") === 0;
  }

  function sourcesBlock(g) {
    var box = el("section", "sources");
    var hidLocal = false;
    var items = g.sources.map(function (s) {
      var label = esc(s.label) +
        (s.pg ? ' <span class="pg">· ' + esc(s.pg) + "</span>" : "");
      if (HOSTED && isLocalSource(s.href)) {
        hidLocal = true;
        return "<li>" + label + "</li>";
      }
      return '<li><a href="' + encodeURI(s.href) + '" target="_blank" rel="noopener">' +
        label + "</a></li>";
    }).join("");
    box.innerHTML = "<h2>อ่านต้นฉบับ</h2><ul>" + items + "</ul>" +
      (hidLocal
        ? '<p class="sources-note">ไฟล์สไลด์ต้นฉบับอยู่ในเครื่องนี้ — เว็บออนไลน์จึงแสดงเฉพาะชื่อไฟล์</p>'
        : "");
    return box;
  }

  function pager(g) {
    var prev = GROUPS[g.n - 2];
    var next = GROUPS[g.n];
    var box = el("nav", "pager");
    box.setAttribute("aria-label", "กลุ่มก่อนหน้าและถัดไป");
    box.innerHTML =
      (prev
        ? '<a href="#/g/' + prev.n + '"><span class="dir">กลุ่มก่อนหน้า</span>' + esc(prev.short) + "</a>"
        : '<span class="empty"></span>') +
      (next
        ? '<a class="next" href="#/g/' + next.n + '"><span class="dir">กลุ่มถัดไป</span>' + esc(next.short) + "</a>"
        : '<span class="empty"></span>');
    return box;
  }

  function observeSections(g) {
    if (observer) observer.disconnect();
    if (typeof IntersectionObserver === "undefined") return;
    var waits = {};
    var setActive = function (i) {
      document.querySelectorAll("[data-sect-link]").forEach(function (a) {
        var on = Number(a.getAttribute("data-sect-link")) === i;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "true");
        else a.removeAttribute("aria-current");
      });
    };
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var i = Number(e.target.getAttribute("data-sect"));
        if (e.isIntersecting) {
          setActive(i);
          /* don't fill the sheet just for opening the page: wait for a real scroll */
          if (window.scrollY > 40 && !waits[i]) {
            waits[i] = setTimeout(function () {
              waits[i] = null;
              markSection(g, i);
            }, 1200);
          }
        } else if (waits[i]) {
          clearTimeout(waits[i]);
          waits[i] = null;
        }
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0 });
    document.querySelectorAll("[data-sect]").forEach(function (s) { observer.observe(s); });
  }

  /* ---------------- quiz ---------------- */

  function quizSection(g, showHead, scoreHost) {
    var wrap = el("section", "quiz-wrap");
    var head = el("div", "quiz-head");
    head.innerHTML = "<h2>แบบทดสอบ กลุ่มที่ " + g.n + "</h2><p>เลือกคำตอบแล้วดูเฉลยทันที · " +
      g.quiz.length + " ข้อ</p>";
    if (showHead !== false) wrap.appendChild(head);

    var answered = {};
    var right = 0;
    var scoreM = null;

    g.quiz.forEach(function (q, qi) {
      var box = el("article", "q");
      box.innerHTML = '<div class="q-num">ข้อ ' + (qi + 1) + " / " + g.quiz.length + "</div>" +
        '<p class="q-text">' + q.q + "</p>";

      var choices = el("div", "choices");
      q.c.forEach(function (c, ci) {
        var b = el("button", "choice");
        b.type = "button";
        b.innerHTML = '<span class="key">' + "ABCD".charAt(ci) + "</span><span>" + c + "</span>";
        b.addEventListener("click", function () {
          if (answered[qi]) return;
          answered[qi] = true;
          var ok = ci === q.a;
          if (ok) right++;
          var all = choices.querySelectorAll(".choice");
          all.forEach(function (x, xi) {
            x.disabled = true;
            if (xi === q.a) x.classList.add("correct");
          });
          if (!ok) b.classList.add("wrong");
          var ex = el("p", "explain");
          ex.innerHTML = "<b>" + (ok ? "ถูก" : "ยังไม่ถูก") + "</b> — " + q.x;
          box.appendChild(ex);
          [scoreEl, scoreM].forEach(function (s) {
            if (!s) return;
            s.querySelector("b").textContent = right;
            s.querySelector("span").textContent =
              "ตอบถูก · ตอบแล้ว " + answeredCount() + "/" + g.quiz.length + " ข้อ";
          });
          if (g.n > 0 && answeredCount() === g.quiz.length) {
            state.quiz[g.n] = { right: right, total: g.quiz.length };
            save();
          }
        });
        choices.appendChild(b);
      });
      box.appendChild(choices);
      wrap.appendChild(box);
    });

    var answeredCount = function () { return Object.keys(answered).length; };

    var scoreEl = el("div", "score score--flow");
    scoreEl.innerHTML = "<b>0</b><span>ตอบถูก · ยังไม่ได้ตอบ</span>";
    wrap.appendChild(scoreEl);

    if (scoreHost) {
      scoreM = el("div", "score score--margin");
      scoreM.innerHTML = "<b>0</b><span>ตอบถูก · ยังไม่ได้ตอบ</span>";
      scoreHost.appendChild(scoreM);
    }

    return wrap;
  }

  function renderQuizPage(g) {
    document.title = "ทดสอบ กลุ่ม " + pad(g.n) + " · " + g.short;
    var main = document.getElementById("main");
    main.innerHTML = "";
    main.style.maxWidth = "";

    var page = el("div", "page page--quiz");
    var col = el("div", "content-col");

    var head = el("header", "group-head");
    head.innerHTML =
      '<p class="eyebrow"><a class="back" href="#/">← สารบัญ</a> กลุ่มที่ ' + g.n + " · " + esc(g.range) + "</p>" +
      "<h1>ทดสอบ กลุ่มที่ " + g.n + "</h1>" +
      '<div class="group-sub"><span>' + g.quiz.length + " ข้อ</span>" +
      '<a href="#/g/' + g.n + '">กลับไปอ่านสรุป</a></div>';
    col.appendChild(head);

    var margin = el("aside", "margin");
    margin.setAttribute("aria-label", "เครื่องมือแบบทดสอบ");
    margin.innerHTML =
      '<div class="m-block">' +
        '<p class="m-label">คะแนน</p>' +
        '<div class="score-host"></div>' +
      "</div>" +
      '<div class="m-block">' +
        '<p class="m-label">ทบทวน</p>' +
        '<a class="m-link" href="#/g/' + g.n + '">อ่านสรุปกลุ่ม ' + pad(g.n) + "</a>" +
        '<a class="m-link" href="#/">สารบัญทั้ง 11 กลุ่ม</a>' +
      "</div>";

    col.appendChild(quizSection(g, false, margin.querySelector(".score-host")));
    col.appendChild(pager(g));
    page.appendChild(col);
    page.appendChild(margin);
    main.appendChild(page);
  }

  function renderMock() {
    document.title = "สุ่มทดสอบ 25 ข้อ · 69-1IDTLM TCT1";
    var pool = [];
    GROUPS.forEach(function (g) {
      g.quiz.forEach(function (q) {
        pool.push({ q: q.q, c: q.c, a: q.a, x: q.x, g: g.n });
      });
    });
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var picked = pool.slice(0, 25);

    var main = document.getElementById("main");
    main.innerHTML = "";
    main.style.maxWidth = "";

    var page = el("div", "page page--quiz");
    var col = el("div", "content-col");

    var head = el("header", "group-head");
    head.innerHTML =
      '<p class="eyebrow">ทดสอบรวม · สุ่มจากทุกกลุ่ม</p>' +
      "<h1>สุ่มทดสอบ 25 ข้อ</h1>" +
      '<div class="group-sub"><span>' + picked.length + " ข้อ</span>" +
      '<a href="#/">กลับหน้าสารบัญ</a></div>';
    col.appendChild(head);

    var margin = el("aside", "margin");
    margin.setAttribute("aria-label", "เครื่องมือแบบทดสอบ");
    margin.innerHTML =
      '<div class="m-block">' +
        '<p class="m-label">คะแนนรอบนี้</p>' +
        '<div class="score-host"></div>' +
      "</div>" +
      '<div class="m-block">' +
        '<p class="m-label">หมายเหตุ</p>' +
        '<p class="m-note">ชุดนี้สุ่มใหม่ทุกครั้งที่เปิดหน้า กด “สุ่มชุดใหม่” เพื่อเปลี่ยนคำถาม</p>' +
      "</div>";

    var fake = {
      n: 0, short: "", title: "",
      quiz: picked.map(function (p) {
        return {
          q: '<span class="q-num" style="display:inline">กลุ่ม ' + p.g + "</span> " + p.q,
          c: p.c, a: p.a, x: p.x
        };
      })
    };
    col.appendChild(quizSection(fake, false, margin.querySelector(".score-host")));

    var again = el("div", "read-bar");
    again.innerHTML = '<button class="check-btn" id="resample" type="button">สุ่มชุดใหม่</button>' +
      '<a class="check-btn" href="#/">กลับสารบัญ</a>';
    col.appendChild(again);

    page.appendChild(col);
    page.appendChild(margin);
    main.appendChild(page);

    document.getElementById("resample").addEventListener("click", function () {
      renderMock();
      window.scrollTo(0, 0);
    });
  }

  /* ---------------- cram ---------------- */

  function renderCram() {
    document.title = "โหมดโค้งสุดท้าย · 69-1IDTLM TCT1";
    var main = document.getElementById("main");
    main.innerHTML = "";
    main.style.maxWidth = "";

    var page = el("div", "page page--cram");

    var intro = el("header", "cram-intro");
    intro.innerHTML =
      '<p class="eyebrow">ก่อนเข้าห้องสอบ</p>' +
      "<h1>จุดที่มักออกสอบ ทั้ง 11 กลุ่ม</h1>" +
      '<p class="cover-lede">ตัดเนื้อหาทั้งหมดเหลือเฉพาะประเด็นที่ออกสอบบ่อย อ่านรอบเดียวจบใน ' +
      "10 นาที — เหมาะกับคืนก่อนสอบหรืออ่านบนรถ</p>";
    page.appendChild(intro);

    var grid = el("div", "cram-grid");
    GROUPS.forEach(function (g) {
      var box = el("section", "cram-group");
      box.innerHTML =
        "<h2><a href=\"#/g/" + g.n + "\">" + pad(g.n) + " · " + esc(g.short) + "</a></h2>" +
        "<ul>" + g.focus.map(function (f) { return "<li>" + f + "</li>"; }).join("") + "</ul>";
      grid.appendChild(box);
    });
    page.appendChild(grid);

    var back = el("div", "read-bar");
    back.innerHTML = '<a class="check-btn" href="#/">กลับหน้าสารบัญ</a>' +
      '<a class="check-btn" href="#/mock">สุ่มทดสอบ 25 ข้อ</a>';
    page.appendChild(back);

    main.appendChild(page);
  }

  /* ---------------- router ---------------- */

  function route() {
    var h = location.hash.replace(/^#/, "");
    var parts = h.split("/").filter(Boolean);

    /* in-page anchors (#sect-9-0) are not routes; let the browser scroll */
    if (h.charAt(0) !== "/" && h !== "") return;

    document.getElementById("cramBtn").setAttribute("aria-pressed", parts[0] === "cram" ? "true" : "false");

    if (parts[0] === "g" && parts[1]) {
      var n = Number(parts[1]);
      var g = groupByN(n);
      renderRail(n);
      if (parts[2] === "quiz") renderQuizPage(g);
      else renderGroup(n, "read");
    } else if (parts[0] === "mock") {
      renderRail(null);
      renderMock();
    } else if (parts[0] === "cram") {
      renderRail(null);
      renderCram();
    } else {
      renderRail(null);
      renderHome();
    }

    window.scrollTo(0, 0);
  }

  /* ---------------- boot ---------------- */

  function boot() {
    GROUPS.sort(function (a, b) { return a.n - b.n; });

    document.getElementById("cramBtn").addEventListener("click", function () {
      location.hash = location.hash === "#/cram" ? "#/" : "#/cram";
    });

    window.addEventListener("hashchange", route);
    route();
    tick();
    setInterval(tick, 60000);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
