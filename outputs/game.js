(() => {
  "use strict";

  const TOTAL_QUESTIONS = 10;
  const COUNT_CYCLE = [2, 3, 4];

  const ROLE_LABEL = {
    current: "现任",
    parent: "长辈",
    family: "家人",
    close: "亲友",
    casual: "熟人",
    ambiguous: "暧昧",
    ex: "前任",
    pet: "宠物",
  };

  const ROLE_BASE = {
    current: 72,
    parent: 70,
    family: 46,
    close: 42,
    casual: 25,
    ambiguous: 18,
    ex: 6,
    pet: -90,
  };

  const ROLE_TIE = {
    current: 0.08,
    parent: 0.07,
    family: 0.06,
    close: 0.05,
    casual: 0.04,
    ambiguous: 0.03,
    ex: 0.02,
    pet: 0.01,
  };

  const ROLE_REASON = {
    current: "现任或伴侣有副驾主权",
    parent: "长辈优先能稳住场面",
    family: "家人关系近但不一定最急",
    close: "亲友够亲近，能救一点气氛",
    casual: "普通熟人不适合抢戏",
    ambiguous: "暧昧对象容易让车内升温",
    ex: "前任上副驾容易出事故",
    pet: "宠物再可爱也不该坐副驾",
  };

  const MODIFIERS = {
    carsick: {
      label: "晕车严重",
      value: 58,
      reason: "晕车是安全照顾问题，优先级会暴涨",
    },
    drunk: {
      label: "刚喝多",
      value: 34,
      reason: "需要有人盯着状态，副驾更方便照看",
    },
    birthday: {
      label: "今天过生日",
      value: 18,
      reason: "生日加一点人情分",
    },
    luggage: {
      label: "拖着两个箱子",
      value: 14,
      reason: "行李多，坐前排更好安排",
    },
    firstMeet: {
      label: "第一次见司机家人",
      value: 16,
      reason: "第一次见面需要一点体面",
    },
    coldWar: {
      label: "正在冷战",
      value: -28,
      reason: "冷战会让副驾变成审讯室",
    },
    blocked: {
      label: "刚把司机拉黑",
      value: -34,
      reason: "刚拉黑还坐副驾，空气会结冰",
    },
    oldPhoto: {
      label: "刚点赞旧合照",
      value: -26,
      reason: "旧情复燃嫌疑太明显",
    },
  };

  const SCENARIOS = [
    {
      id: "claim",
      name: "副驾主权局",
      text: "司机刚说过“副驾有人坐”，现任和前任偏偏同时到场。",
      tension: 92,
      must: ["current", "ex"],
      weights: { current: 46, parent: 12, family: 2, close: -4, ambiguous: -24, ex: -54, pet: -20 },
      force: null,
    },
    {
      id: "elder",
      name: "长辈在场局",
      text: "长辈已经站在车门边，谁上副驾决定今晚回家有没有好脸色。",
      tension: 76,
      must: ["parent", "current"],
      weights: { parent: 54, current: 6, family: 10, close: -4, ambiguous: -26, ex: -46, pet: -20 },
      force: "firstMeet",
      forceTypes: ["current", "ambiguous"],
    },
    {
      id: "carsick",
      name: "晕车警报局",
      text: "山路、晚饭、香水味同时出现，副驾突然变成救命位。",
      tension: 84,
      must: ["current"],
      weights: { parent: 18, current: 20, family: 8, close: 6, ambiguous: -8, ex: -22, pet: -30 },
      force: "carsick",
      forceTypes: ["current", "parent", "family", "close", "casual", "ex"],
    },
    {
      id: "coldWar",
      name: "冷战顺风车",
      text: "司机和某位亲密关系刚吵完架，车内每个座位都像审判席。",
      tension: 88,
      must: ["current", "close"],
      weights: { current: 16, parent: 24, family: 12, close: 20, casual: 2, ambiguous: -18, ex: -38, pet: -20 },
      force: "coldWar",
      forceTypes: ["current"],
    },
    {
      id: "airport",
      name: "机场接人局",
      text: "后备箱快满了，有人拖着箱子，有人拖着旧账。",
      tension: 69,
      must: ["current", "family"],
      weights: { current: 22, parent: 24, family: 18, close: 8, casual: 4, ambiguous: -12, ex: -28, pet: -24 },
      force: "luggage",
      forceTypes: ["current", "parent", "family", "close", "casual"],
    },
    {
      id: "reunion",
      name: "同学会散场局",
      text: "大家都听过彼此的八卦，谁坐副驾都会被解读。",
      tension: 81,
      must: ["ex", "ambiguous"],
      weights: { current: 38, parent: 26, family: 8, close: 12, casual: 8, ambiguous: -8, ex: -36, pet: -24 },
      force: "oldPhoto",
      forceTypes: ["ex", "ambiguous"],
    },
    {
      id: "lateNight",
      name: "深夜接送局",
      text: "已经很晚了，副驾不只是亲密位，也是照顾位。",
      tension: 72,
      must: ["current", "parent"],
      weights: { current: 30, parent: 28, family: 16, close: 12, casual: 2, ambiguous: -10, ex: -26, pet: -24 },
      force: "drunk",
      forceTypes: ["current", "parent", "family", "close", "ex"],
    },
    {
      id: "birthday",
      name: "生日修罗场",
      text: "有人准备了礼物，有人准备了阴阳怪气。",
      tension: 79,
      must: ["current", "ex"],
      weights: { current: 34, parent: 28, family: 12, close: 16, casual: 4, ambiguous: -14, ex: -32, pet: -20 },
      force: "birthday",
      forceTypes: ["current", "parent", "family", "close"],
    },
  ];

  const DRIVER_PROFILES = [
    {
      id: "me",
      name: "我",
      badge: "本人开车",
      partnerTerms: ["男友", "女友"],
      current: (term) => `我的${term}`,
      ex: (term) => `我的前任${term}`,
      parents: () => ["我爸", "我妈"],
      family: () => ["我哥", "我姐", "我弟"],
      close: () => "我闺蜜",
      casual: () => "我同学",
      ambiguous: () => "我的暗恋对象",
      pet: () => "我家狗（柯基）",
    },
    {
      id: "dad",
      name: "我爸",
      badge: "家庭局",
      partnerTerms: ["伴侣"],
      current: () => "我妈",
      ex: () => "我爸的初恋",
      parents: () => ["我爷爷", "我奶奶"],
      family: () => ["我"],
      close: () => "我爸的牌友",
      casual: () => "我爸的老同学",
      ambiguous: () => "我爸的舞伴",
      pet: () => "我家狗（柯基）",
    },
    {
      id: "mom",
      name: "我妈",
      badge: "家庭局",
      partnerTerms: ["伴侣"],
      current: () => "我爸",
      ex: () => "我妈的初恋",
      parents: () => ["外婆"],
      family: () => ["我"],
      close: () => "我妈的闺蜜",
      casual: () => "我妈的老同学",
      ambiguous: () => "我妈的广场舞搭子",
      pet: () => "我家猫（高冷）",
    },
    {
      id: "brother",
      name: "我哥",
      badge: "兄妹局",
      partnerTerms: ["女友"],
      current: (term) => `我哥的${term}`,
      ex: (term) => `我哥的前任${term}`,
      parents: () => ["我妈"],
      family: () => ["我"],
      close: () => "我哥的兄弟",
      casual: () => "我哥的同事",
      ambiguous: () => "我哥的暧昧对象",
      pet: () => "我哥养的猫",
    },
    {
      id: "sister",
      name: "我姐",
      badge: "姐弟局",
      partnerTerms: ["男友"],
      current: (term) => `我姐的${term}`,
      ex: (term) => `我姐的前任${term}`,
      parents: () => ["我妈"],
      family: () => ["我"],
      close: () => "我姐的闺蜜",
      casual: () => "我姐的同事",
      ambiguous: () => "我姐的暧昧对象",
      pet: () => "我姐养的狗",
    },
    {
      id: "bestie",
      name: "我闺蜜",
      badge: "朋友局",
      partnerTerms: ["男友"],
      current: (term) => `我闺蜜的${term}`,
      ex: (term) => `我闺蜜的前任${term}`,
      parents: () => ["我闺蜜的妈妈"],
      family: () => ["我"],
      close: () => "我闺蜜的死党",
      casual: () => "我闺蜜的同事",
      ambiguous: () => "我闺蜜的暧昧对象",
      pet: () => "我闺蜜的猫",
    },
    {
      id: "boyfriend",
      name: "我男友",
      badge: "恋爱局",
      partnerTerms: ["伴侣"],
      current: () => "我",
      ex: () => "我男友的前任",
      parents: () => ["我男友的妈妈"],
      family: () => ["我男友的妹妹"],
      close: () => "我男友的兄弟",
      casual: () => "我男友的同事",
      ambiguous: () => "我男友的暧昧对象",
      pet: () => "我男友的猫",
    },
    {
      id: "girlfriend",
      name: "我女友",
      badge: "恋爱局",
      partnerTerms: ["伴侣"],
      current: () => "我",
      ex: () => "我女友的前任",
      parents: () => ["我女友的妈妈"],
      family: () => ["我女友的姐姐"],
      close: () => "我女友的闺蜜",
      casual: () => "我女友的同事",
      ambiguous: () => "我女友的暧昧对象",
      pet: () => "我女友的猫",
    },
  ];

  const FLAIR = {
    current: ["刚把司机置顶", "手里拿着司机手机", "刚发了合照", "一路都没说话"],
    parent: ["已经开始问路线", "手里拎着热汤", "上车前看了司机一眼", "坐后排会继续念叨"],
    family: ["知道司机所有黑历史", "刚替司机圆过场", "一路都在观察气氛", "背着一个很沉的包"],
    close: ["知道太多内幕", "刚帮司机打过掩护", "表情已经开始憋笑", "一直在群里控场"],
    casual: ["只是顺路搭车", "和大家都不太熟", "刚被临时叫来", "手里拿着奶茶"],
    ambiguous: ["消息提醒一直在亮", "刚和司机对视了三秒", "说话过于自然", "坐哪都会被误会"],
    ex: ["刚点赞旧合照", "说只是顺路", "看起来太淡定", "一上车就开始怀旧"],
    pet: ["看谁都很无辜", "毛已经沾到座椅上", "只想吹空调", "完全不懂人类尴尬"],
  };

  const dom = {
    roundNow: document.querySelector("#roundNow"),
    scoreNow: document.querySelector("#scoreNow"),
    streakNow: document.querySelector("#streakNow"),
    sceneName: document.querySelector("#sceneName"),
    sceneText: document.querySelector("#sceneText"),
    tensionBar: document.querySelector("#tensionBar"),
    tensionText: document.querySelector("#tensionText"),
    driverSeat: document.querySelector("#driverSeat"),
    shotgunSeat: document.querySelector("#shotgunSeat"),
    driverName: document.querySelector("#driverName"),
    driverGender: document.querySelector("#driverGender"),
    passengerList: document.querySelector("#passengerList"),
    verdict: document.querySelector("#verdict"),
    nextButton: document.querySelector("#nextButton"),
    restartButton: document.querySelector("#restartButton"),
    resultPanel: document.querySelector("#resultPanel"),
    resultTitle: document.querySelector("#resultTitle"),
    resultCopy: document.querySelector("#resultCopy"),
    playAgainButton: document.querySelector("#playAgainButton"),
    reviewList: document.querySelector("#reviewList"),
  };

  const state = {
    questions: [],
    currentIndex: 0,
    score: 0,
    streak: 0,
    answered: false,
    finished: false,
    answers: [],
  };

  function randomFraction() {
    if (window.crypto && window.crypto.getRandomValues) {
      const value = new Uint32Array(1);
      window.crypto.getRandomValues(value);
      return value[0] / 4294967296;
    }
    return Math.random();
  }

  function randomInt(max) {
    return Math.floor(randomFraction() * max);
  }

  function randomItem(items) {
    return items[randomInt(items.length)];
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = randomInt(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function optionLetter(index) {
    return String.fromCharCode(65 + index);
  }

  function relationLabel(type, name) {
    if (type !== "current") return ROLE_LABEL[type];
    return ["我爸", "我妈"].includes(name) ? "伴侣" : "现任";
  }

  function addPassenger(pool, type, name) {
    if (!name || pool.some((passenger) => passenger.name === name)) return;
    pool.push({
      type,
      name,
      label: relationLabel(type, name),
      note: randomItem(FLAIR[type]),
      modifiers: [],
    });
  }

  function createDriver() {
    const profile = randomItem(DRIVER_PROFILES);
    const romanceTerm = randomItem(profile.partnerTerms || ["男友", "女友"]);
    return {
      id: profile.id,
      name: profile.name,
      badge: profile.badge,
      romanceTerm,
      profile,
    };
  }

  function buildPassengerPool(driver) {
    const profile = driver.profile;
    const pool = [];
    addPassenger(pool, "current", profile.current(driver.romanceTerm));
    addPassenger(pool, "ex", profile.ex(driver.romanceTerm));
    profile.parents().forEach((name) => addPassenger(pool, "parent", name));
    profile.family().forEach((name) => addPassenger(pool, "family", name));
    addPassenger(pool, "close", profile.close());
    addPassenger(pool, "casual", profile.casual());
    addPassenger(pool, "ambiguous", profile.ambiguous());
    addPassenger(pool, "pet", profile.pet());
    return pool.filter((passenger) => passenger.name !== driver.name);
  }

  function pickPassengerOfType(pool, selected, type) {
    const candidates = shuffle(pool).filter(
      (passenger) => passenger.type === type && !selected.includes(passenger),
    );
    return candidates[0] || null;
  }

  function pickPassengers(pool, scenario, count) {
    const selected = [];
    scenario.must.forEach((type) => {
      if (selected.length >= count) return;
      const passenger = pickPassengerOfType(pool, selected, type);
      if (passenger) selected.push(passenger);
    });

    const remaining = shuffle(pool).filter((passenger) => !selected.includes(passenger));
    while (selected.length < count && remaining.length) {
      selected.push(remaining.shift());
    }

    return shuffle(selected);
  }

  function applyModifier(passenger, modifierId) {
    const modifier = MODIFIERS[modifierId];
    if (!modifier || passenger.modifiers.some((item) => item.id === modifierId)) return;
    passenger.modifiers.push({ id: modifierId, ...modifier });
  }

  function decoratePassengers(passengers, scenario) {
    if (scenario.force) {
      const forcedPool = passengers.filter((passenger) => scenario.forceTypes.includes(passenger.type));
      const fallbackPool = passengers.filter((passenger) => passenger.type !== "pet");
      const target = randomItem(forcedPool.length ? forcedPool : fallbackPool);
      if (target) applyModifier(target, scenario.force);
    }

    passengers.forEach((passenger) => {
      if (passenger.type === "pet") return;
      if (randomFraction() > 0.22) return;

      const possible = ["birthday", "luggage", "blocked"].filter((modifierId) => {
        if (modifierId === "blocked") {
          return ["current", "ex", "ambiguous"].includes(passenger.type);
        }
        return true;
      });
      applyModifier(passenger, randomItem(possible));
    });
  }

  function scorePassenger(passenger, scenario) {
    const reasons = [];
    let score = ROLE_BASE[passenger.type] + ROLE_TIE[passenger.type];

    reasons.push(ROLE_REASON[passenger.type]);

    const scenarioValue = scenario.weights[passenger.type] || 0;
    score += scenarioValue;
    if (scenarioValue > 0) {
      reasons.push(`${scenario.name}给${passenger.label}加分`);
    } else if (scenarioValue < 0) {
      reasons.push(`${scenario.name}里${passenger.label}风险更高`);
    }

    passenger.modifiers.forEach((modifier) => {
      score += modifier.value;
      reasons.push(modifier.reason);
    });

    return {
      score,
      reasons,
      passenger,
    };
  }

  function judgeQuestion(scenario, passengers) {
    const scored = passengers
      .map((passenger, index) => ({
        index,
        ...scorePassenger(passenger, scenario),
      }))
      .sort((a, b) => b.score - a.score);

    const winner = scored[0];
    const runnerUp = scored[1];
    const reason = [
      `判定：${winner.reasons.slice(0, 3).join("；")}。`,
      runnerUp ? `相比 ${runnerUp.passenger.name}，这个选择更能让车里少炸一轮。` : "",
    ]
      .filter(Boolean)
      .join("");

    return {
      id: `p${winner.index}`,
      label: `乘客${winner.index + 1}：${winner.passenger.name}`,
      seatLabel: winner.passenger.name,
      reason,
      scored,
    };
  }

  function generateQuestion(index) {
    const driver = createDriver();
    const scenario = randomItem(SCENARIOS);
    const passengerCount = COUNT_CYCLE[index % COUNT_CYCLE.length];
    const pool = buildPassengerPool(driver);
    const passengers = pickPassengers(pool, scenario, passengerCount);
    decoratePassengers(passengers, scenario);
    const answer = judgeQuestion(scenario, passengers);

    return {
      id: `${Date.now()}-${index}-${randomInt(999999)}`,
      scenario,
      driver,
      passengers,
      passengerCount,
      answer,
    };
  }

  function createElement(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function clearElement(element) {
    while (element.firstChild) {
      element.removeChild(element.firstChild);
    }
  }

  function buildChoiceButton({ id, letter, passenger }) {
    const button = document.createElement("button");
    button.className = "choice";
    button.type = "button";
    button.dataset.optionId = id;

    const letterNode = createElement("span", "option-letter", letter);
    const chipNode = createElement("span", "relation-chip", passenger.label);
    const titleNode = createElement("span", "person-name", `乘客${Number(id.slice(1)) + 1}：${passenger.name}`);
    const modifierText = passenger.modifiers.map((modifier) => modifier.label).join("、");
    const note = modifierText ? `${passenger.note}；${modifierText}` : passenger.note;
    const noteNode = createElement("span", "person-note", note);

    button.append(letterNode, chipNode, titleNode, noteNode);
    button.addEventListener("click", () => chooseOption(id));
    return button;
  }

  function optionText(question, optionId) {
    const index = Number(optionId.slice(1));
    const passenger = question.passengers[index];
    return passenger ? `乘客${index + 1}：${passenger.name}` : "未知选项";
  }

  function updateScoreboard() {
    dom.roundNow.textContent = state.finished ? TOTAL_QUESTIONS : state.currentIndex + 1;
    dom.scoreNow.textContent = state.score;
    dom.streakNow.textContent = state.streak;
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    state.answered = false;
    updateScoreboard();

    dom.sceneName.textContent = question.scenario.name;
    dom.sceneText.textContent = question.scenario.text;
    dom.tensionBar.style.width = `${question.scenario.tension}%`;
    dom.tensionText.textContent = question.scenario.tension;
    dom.driverName.textContent = question.driver.name;
    dom.driverGender.textContent = question.driver.badge;
    dom.driverSeat.textContent = question.driver.name;
    dom.shotgunSeat.textContent = "待定";

    clearElement(dom.passengerList);
    question.passengers.forEach((passenger, index) => {
      const button = buildChoiceButton({
        id: `p${index}`,
        letter: optionLetter(index),
        passenger,
      });
      dom.passengerList.appendChild(button);
    });

    dom.verdict.hidden = true;
    dom.verdict.className = "verdict";
    dom.verdict.textContent = "";
    dom.nextButton.disabled = true;
    dom.nextButton.textContent = state.currentIndex === TOTAL_QUESTIONS - 1 ? "看成绩" : "下一题";
  }

  function markChoices(selectedId, correctId) {
    const buttons = document.querySelectorAll(".choice");
    buttons.forEach((button) => {
      const id = button.dataset.optionId;
      button.disabled = true;
      if (id === correctId) button.classList.add("correct");
      if (id === selectedId && selectedId !== correctId) button.classList.add("wrong");
      if (id !== correctId && id !== selectedId) button.classList.add("dimmed");
    });
  }

  function renderVerdict(isCorrect, question, selectedId) {
    const strong = createElement("strong", "", isCorrect ? "答对了" : "答错了");
    const detail = document.createTextNode(
      isCorrect
        ? `${question.answer.label} 是本题正解。${question.answer.reason}`
        : `你选了 ${optionText(question, selectedId)}；正解是 ${question.answer.label}。${question.answer.reason}`,
    );
    clearElement(dom.verdict);
    dom.verdict.append(strong, detail);
    dom.verdict.className = isCorrect ? "verdict good" : "verdict bad";
    dom.verdict.hidden = false;
  }

  function chooseOption(optionId) {
    if (state.answered || state.finished) return;

    const question = state.questions[state.currentIndex];
    const isCorrect = optionId === question.answer.id;

    state.answered = true;
    state.score += isCorrect ? 1 : 0;
    state.streak = isCorrect ? state.streak + 1 : 0;
    state.answers.push({
      questionId: question.id,
      scene: question.scenario.name,
      driver: question.driver.name,
      selectedId: optionId,
      correctId: question.answer.id,
      selectedText: optionText(question, optionId),
      correctText: optionText(question, question.answer.id),
      reason: question.answer.reason,
      isCorrect,
    });

    dom.shotgunSeat.textContent = question.answer.seatLabel;
    markChoices(optionId, question.answer.id);
    renderVerdict(isCorrect, question, optionId);
    updateScoreboard();
    dom.nextButton.disabled = false;
  }

  function nextQuestion() {
    if (!state.answered || state.finished) return;

    if (state.currentIndex >= TOTAL_QUESTIONS - 1) {
      finishGame();
      return;
    }

    state.currentIndex += 1;
    renderQuestion();
  }

  function finishGame() {
    state.finished = true;
    updateScoreboard();
    dom.nextButton.disabled = true;
    dom.nextButton.textContent = "已完成";
    dom.resultPanel.hidden = false;
    dom.resultTitle.textContent = `${state.score} / ${TOTAL_QUESTIONS}`;
    dom.resultCopy.textContent =
      state.score === TOTAL_QUESTIONS
        ? "完全正确，今天这辆车的情绪稳定全靠你。"
        : state.score >= 8
          ? "很强，只有一两次差点把车里气氛点着。"
          : state.score >= 5
            ? "你已经懂一些人情世故了，但前任和长辈还会偷袭你。"
            : "这一局关系太乱，建议下一局先从“谁最不能坐”开始想。";

    clearElement(dom.reviewList);
    state.answers.forEach((answer, index) => {
      const item = createElement("div", "review-item");
      const title = createElement("b", "", `${index + 1}. ${answer.isCorrect ? "正确" : "失手"} · ${answer.scene}`);
      const driver = createElement("span", "", `司机：${answer.driver}`);
      const selected = createElement("span", "", `你的选择：${answer.selectedText}`);
      const correct = createElement("span", "", `正解：${answer.correctText}`);
      item.append(title, driver, selected, correct);
      dom.reviewList.appendChild(item);
    });

    dom.resultPanel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function startGame() {
    state.questions = Array.from({ length: TOTAL_QUESTIONS }, (_, index) => generateQuestion(index));
    state.currentIndex = 0;
    state.score = 0;
    state.streak = 0;
    state.answered = false;
    state.finished = false;
    state.answers = [];
    dom.resultPanel.hidden = true;
    renderQuestion();
  }

  function validateCurrentGame() {
    const errors = [];
    if (state.questions.length !== TOTAL_QUESTIONS) {
      errors.push(`题目数量应为 ${TOTAL_QUESTIONS}，实际为 ${state.questions.length}`);
    }

    state.questions.forEach((question, index) => {
      const expectedCount = COUNT_CYCLE[index % COUNT_CYCLE.length];
      if (question.passengers.length !== expectedCount) {
        errors.push(`第 ${index + 1} 题乘客数量错误`);
      }

      if (!/^p\d+$/.test(question.answer.id)) {
        errors.push(`第 ${index + 1} 题答案必须是乘客`);
      }

      const answerIndex = Number(question.answer.id.slice(1));
      if (answerIndex < 0 || answerIndex >= question.passengers.length) {
        errors.push(`第 ${index + 1} 题答案不存在`);
      }

      const names = question.passengers.map((passenger) => passenger.name);
      if (new Set(names).size !== names.length) {
        errors.push(`第 ${index + 1} 题乘客重复`);
      }

      if (names.includes(question.driver.name)) {
        errors.push(`第 ${index + 1} 题司机重复成为乘客`);
      }

      if (names.some((name) => name.includes("都不坐") || name.includes("抢"))) {
        errors.push(`第 ${index + 1} 题出现了非乘客选项`);
      }

      if (question.driver.id === "me") {
        const hasBoyfriendLane = names.some((name) => name === "我的男友" || name === "我的前任男友");
        const hasGirlfriendLane = names.some((name) => name === "我的女友" || name === "我的前任女友");
        if (hasBoyfriendLane && hasGirlfriendLane) {
          errors.push(`第 ${index + 1} 题出现了男友线和女友线混用`);
        }
      }

      const outOfTonePairs = ["我闺蜜的女友", "我闺蜜的前任女友", "我哥的男友", "我哥的前任男友", "我姐的女友", "我姐的前任女友"];
      outOfTonePairs.forEach((pair) => {
        if (names.includes(pair)) {
          errors.push(`第 ${index + 1} 题出现了出戏关系：${pair}`);
        }
      });
    });

    return { ok: errors.length === 0, errors };
  }

  dom.nextButton.addEventListener("click", nextQuestion);
  dom.restartButton.addEventListener("click", startGame);
  dom.playAgainButton.addEventListener("click", startGame);

  window.__shotgunGameTest = {
    startGame,
    validateCurrentGame,
    answerCurrentCorrect() {
      const question = state.questions[state.currentIndex];
      chooseOption(question.answer.id);
      return this.snapshot();
    },
    answer(optionId) {
      chooseOption(optionId);
      return this.snapshot();
    },
    next() {
      nextQuestion();
      return this.snapshot();
    },
    autoplayCorrect() {
      while (!state.finished) {
        const question = state.questions[state.currentIndex];
        chooseOption(question.answer.id);
        nextQuestion();
      }
      return this.snapshot();
    },
    snapshot() {
      const question = state.questions[state.currentIndex];
      return {
        totalQuestions: state.questions.length,
        currentIndex: state.currentIndex,
        score: state.score,
        streak: state.streak,
        answered: state.answered,
        finished: state.finished,
        answerCount: state.answers.length,
        currentPassengerCount: question ? question.passengers.length : 0,
        currentAnswer: question ? question.answer.id : null,
        currentScene: question ? question.scenario.name : null,
        passengers: question ? question.passengers.map((passenger) => passenger.name) : [],
        validation: validateCurrentGame(),
      };
    },
  };

  startGame();
})();
