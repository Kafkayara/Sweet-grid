const BOARD_SIZE = 8;
const CANDY_TYPES = 6;

const STARTING_MOVES = 30;
const TARGET_SCORE = 1000;

const SCORE_PER_CANDY = 10;

const POP_DELAY = 220;
const FALL_DELAY = 480;

const NEW_CANDY_DROP_BUFFER = 3;

const HINT_DELAY = 5000;

const boardElement = document.getElementById("board");

const scoreElement = document.getElementById("score");
const movesElement = document.getElementById("moves");
const targetElement = document.getElementById("target");

const messageElement = document.getElementById("message");

const restartButton =
  document.getElementById("restartBtn");

const gameOverlay =
  document.getElementById("gameOverlay");

const overlayTitle =
  document.getElementById("overlayTitle");

const overlayMessage =
  document.getElementById("overlayMessage");

const finalScoreElement =
  document.getElementById("finalScore");

const overlayRestartButton =
  document.getElementById("overlayRestartBtn");

const gameStatus =
  document.getElementById("gameStatus");

const modeTargetButton =
  document.getElementById("modeTargetBtn");

const modeUnlimitedButton =
  document.getElementById("modeUnlimitedBtn");

const particleLayer =
  document.getElementById("particleLayer");

let board = [];

let score = 0;
let moves = STARTING_MOVES;

let selectedCandy = null;

let gameLocked = false;
let gameOver = false;

let gameMode = "target";

let hintTimer = null;
let hintClearTimer = null;

let idleHintCells = [];

const candyClasses = [
  "candy-red",
  "candy-blue",
  "candy-yellow",
  "candy-green",
  "candy-purple",
  "candy-pink"
];

function createCandy(type = randomCandy()) {

  return {
    type,
    special: null
  };
}

function randomCandy() {

  return Math.floor(
    Math.random() * CANDY_TYPES
  );
}

function cloneCandy(candy) {

  if (!candy) {
    return null;
  }

  return {
    type: candy.type,
    special: candy.special
  };
}

function createEmptyBoard() {

  board = [];

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    board.push(
      Array(BOARD_SIZE).fill(null)
    );
  }
}

function createBoard() {

  let attempts = 0;

  do {

    createEmptyBoard();

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      for (
        let column = 0;
        column < BOARD_SIZE;
        column++
      ) {

        let type;

        do {

          type = randomCandy();

        } while (
          createsStartingMatch(row, column, type)
        );

        board[row][column] =
          createCandy(type);
      }
    }

    attempts++;

  } while (
    !hasPossibleMove() &&
    attempts < 100
  );
}

function createsStartingMatch(row, column, type) {

  const horizontalMatch =
    column >= 2 &&
    board[row][column - 1]?.type === type &&
    board[row][column - 2]?.type === type;

  const verticalMatch =
    row >= 2 &&
    board[row - 1][column]?.type === type &&
    board[row - 2][column]?.type === type;

  return horizontalMatch || verticalMatch;
}

function renderBoard(
  fallOffsets = null
) {

  boardElement.innerHTML = "";

  const fallingCandies = [];

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let column = 0;
      column < BOARD_SIZE;
      column++
    ) {

      const candyData =
        board[row][column];

      const candy =
        document.createElement("button");

      candy.type = "button";

      candy.classList.add("candy");

      if (candyData) {

        if (candyData.special === "color-bomb") {

          candy.classList.add(
            "candy-color-bomb"
          );

        } else {

          candy.classList.add(
            candyClasses[candyData.type]
          );
        }

        if (
          candyData.special ===
          "striped-horizontal"
        ) {

          candy.classList.add(
            "candy-striped-horizontal"
          );
        }

        if (
          candyData.special ===
          "striped-vertical"
        ) {

          candy.classList.add(
            "candy-striped-vertical"
          );
        }

        if (
          candyData.special ===
          "wrapped"
        ) {

          candy.classList.add(
            "candy-wrapped"
          );
        }

        if (candyData.justCreated) {

          candy.classList.add(
            "special-born"
          );

          delete candyData.justCreated;
        }
      }

      candy.dataset.row = row;
      candy.dataset.column = column;

      if (
        selectedCandy &&
        selectedCandy.row === row &&
        selectedCandy.column === column
      ) {

        candy.classList.add("selected");
      }

      if (
        idleHintCells.some(
          cell =>
            cell.row === row &&
            cell.column === column
        )
      ) {

        candy.classList.add("hint");
      }

      candy.setAttribute(
        "aria-label",
        createCandyLabel(
          row,
          column,
          candyData
        )
      );

      candy.setAttribute(
        "role",
        "gridcell"
      );

      candy.addEventListener(
        "click",
        () => {
          handleCandyClick(row, column);
        }
      );

      boardElement.appendChild(candy);

      if (
        fallOffsets &&
        fallOffsets[row][column] > 0
      ) {

        fallingCandies.push({
          element: candy,
          distance: fallOffsets[row][column]
        });
      }
    }
  }

  updateUI();

  if (fallingCandies.length > 0) {

    applyFallAnimation(
      fallingCandies
    );
  }
}

function applyFallAnimation(
  fallingCandies
) {

  const sample =
    boardElement.children[0];

  if (!sample) {
    return;
  }

  const cellHeight =
    sample.getBoundingClientRect().height;

  const gapPx =
    parseFloat(
      getComputedStyle(
        boardElement
      ).getPropertyValue("--gap")
    ) || 0;

  const rowPitch =
    cellHeight + gapPx;

  for (
    const { element, distance } of fallingCandies
  ) {

    element.style.transition = "none";

    element.style.transform =
      `translateY(${-distance * rowPitch}px)`;
  }

  void boardElement.offsetHeight;

  requestAnimationFrame(() => {

    requestAnimationFrame(() => {

      for (
        const { element, distance } of fallingCandies
      ) {

        const duration =
          Math.min(
            0.24 + distance * 0.022,
            0.52
          );

        element.style.transition =
          `transform ${duration}s cubic-bezier(0.55, 0.055, 0.675, 0.19)`;

        element.style.transform =
          "translateY(0)";

        element.addEventListener(
          "transitionend",
          function onLand() {

            element.removeEventListener(
              "transitionend",
              onLand
            );

            element.classList.add(
              "candy-land"
            );
          },
          { once: true }
        );
      }
    });
  });
}

function animateSwapPositions(
  first,
  second
) {

  const sample =
    boardElement.children[0];

  if (!sample) {
    return Promise.resolve();
  }

  const cellRect =
    sample.getBoundingClientRect();

  const gapPx =
    parseFloat(
      getComputedStyle(
        boardElement
      ).getPropertyValue("--gap")
    ) || 0;

  const colPitch =
    cellRect.width + gapPx;

  const rowPitch =
    cellRect.height + gapPx;

  const rowDelta =
    second.row - first.row;

  const colDelta =
    second.column - first.column;

  const firstIndex =
    first.row * BOARD_SIZE +
    first.column;

  const secondIndex =
    second.row * BOARD_SIZE +
    second.column;

  const firstElement =
    boardElement.children[firstIndex];

  const secondElement =
    boardElement.children[secondIndex];

  if (
    !firstElement ||
    !secondElement
  ) {

    return Promise.resolve();
  }

  firstElement.style.transition = "none";

  firstElement.style.transform =
    `translate(${colDelta * colPitch}px, ${rowDelta * rowPitch}px)`;

  secondElement.style.transition = "none";

  secondElement.style.transform =
    `translate(${-colDelta * colPitch}px, ${-rowDelta * rowPitch}px)`;

  void boardElement.offsetHeight;

  const duration = 0.16;

  return new Promise(resolve => {

    requestAnimationFrame(() => {

      requestAnimationFrame(() => {

        firstElement.style.transition =
          `transform ${duration}s ease-in-out`;

        firstElement.style.transform =
          "translate(0, 0)";

        secondElement.style.transition =
          `transform ${duration}s ease-in-out`;

        secondElement.style.transform =
          "translate(0, 0)";

        setTimeout(
          resolve,
          duration * 1000
        );
      });
    });
  });
}

function createCandyLabel(
  row,
  column,
  candy
) {

  const position =
    `Permen baris ${row + 1}, kolom ${column + 1}`;

  if (!candy) {
    return position;
  }

  if (candy.special === "color-bomb") {
    return `${position}, bom warna`;
  }

  if (
    candy.special ===
    "striped-horizontal"
  ) {
    return `${position}, permen bergaris horizontal`;
  }

  if (
    candy.special ===
    "striped-vertical"
  ) {
    return `${position}, permen bergaris vertikal`;
  }

  if (candy.special === "wrapped") {
    return `${position}, permen bungkus`;
  }

  return position;
}

function updateUI() {

  scoreElement.textContent = score;

  movesElement.textContent = moves;

  if (targetElement) {
    targetElement.textContent =
      gameMode === "unlimited"
        ? "\u221E"
        : TARGET_SCORE;
  }

  if (finalScoreElement) {
    finalScoreElement.textContent =
      score;
  }
}

function handleCandyClick(row, column) {

  if (gameLocked || gameOver) {
    return;
  }

  if (moves <= 0) {
    return;
  }

  clearHint();

  if (!selectedCandy) {

    selectedCandy = {
      row,
      column
    };

    renderBoard();

    return;
  }

  if (
    selectedCandy.row === row &&
    selectedCandy.column === column
  ) {

    selectedCandy = null;

    renderBoard();

    return;
  }

  const currentCandy = {
    row,
    column
  };

  if (
    !isAdjacent(
      selectedCandy,
      currentCandy
    )
  ) {

    selectedCandy =
      currentCandy;

    renderBoard();

    return;
  }

  performMove(
    selectedCandy,
    currentCandy
  );

  selectedCandy = null;
}

function isAdjacent(first, second) {

  const rowDifference =
    Math.abs(
      first.row - second.row
    );

  const columnDifference =
    Math.abs(
      first.column - second.column
    );

  return (
    rowDifference +
    columnDifference === 1
  );
}

function swapCandies(first, second) {

  const temporary =
    board[first.row][first.column];

  board[first.row][first.column] =
    board[second.row][second.column];

  board[second.row][second.column] =
    temporary;
}

async function performMove(
  first,
  second
) {

  gameLocked = true;

  clearHint();

  swapCandies(first, second);

  renderBoard();

  await animateSwapPositions(
    first,
    second
  );

  const specialCombo =
    getSpecialCombination(
      first,
      second
    );

  if (specialCombo) {

    moves--;

    await resolveSpecialCombination(
      first,
      second,
      specialCombo
    );

    finishMove();

    return;
  }

  const matches =
    findMatches();

  if (matches.size === 0) {

    swapCandies(first, second);

    renderBoard();

    await animateSwapPositions(
      first,
      second
    );

    setMessage(
      "Swap itu tidak menghasilkan match."
    );

    await wait(180);

    gameLocked = false;

    startHintTimer();

    return;
  }

  moves--;

  await resolveMatches(
    matches,
    first,
    second
  );

  finishMove();
}

function finishMove() {

  selectedCandy = null;

  renderBoard();

  if (
    gameMode === "target" &&
    score >= TARGET_SCORE
  ) {

    endGame(true);

    return;
  }

  if (moves <= 0) {

    endGame(false);

    return;
  }

  if (!hasPossibleMove()) {

    setMessage(
      "Tidak ada kombinasi tersisa. Mengacak papan..."
    );

    shuffleBoard();

    renderBoard();

    gameLocked = false;

    startHintTimer();

    return;
  }

  setMessage(
    "Nice! Cari kombinasi berikutnya."
  );

  gameLocked = false;

  startHintTimer();
}

function findMatches() {

  const matches = new Set();

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    let start = 0;

    for (
      let column = 1;
      column <= BOARD_SIZE;
      column++
    ) {

      const current =
        column < BOARD_SIZE
          ? board[row][column]
          : null;

      const previous =
        board[row][start];

      if (
        column < BOARD_SIZE &&
        sameCandyType(
          current,
          previous
        )
      ) {

        continue;
      }

      const length =
        column - start;

      if (length >= 3) {

        for (
          let position = start;
          position < column;
          position++
        ) {

          matches.add(
            `${row},${position}`
          );
        }
      }

      start = column;
    }
  }

  for (
    let column = 0;
    column < BOARD_SIZE;
    column++
  ) {

    let start = 0;

    for (
      let row = 1;
      row <= BOARD_SIZE;
      row++
    ) {

      const current =
        row < BOARD_SIZE
          ? board[row][column]
          : null;

      const previous =
        board[start][column];

      if (
        row < BOARD_SIZE &&
        sameCandyType(
          current,
          previous
        )
      ) {

        continue;
      }

      const length =
        row - start;

      if (length >= 3) {

        for (
          let position = start;
          position < row;
          position++
        ) {

          matches.add(
            `${position},${column}`
          );
        }
      }

      start = row;
    }
  }

  return matches;
}

function sameCandyType(
  first,
  second
) {

  if (!first || !second) {
    return false;
  }

  if (
    first.special === "color-bomb" ||
    second.special === "color-bomb"
  ) {

    return false;
  }

  return first.type === second.type;
}

function findMatchGroups() {

  const groups = [];
  const visited = new Set();

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let column = 0;
      column < BOARD_SIZE;
      column++
    ) {

      const key = `${row},${column}`;

      if (visited.has(key)) {
        continue;
      }

      const candy = board[row][column];

      if (
        !candy ||
        candy.special === "color-bomb"
      ) {
        continue;
      }

      if (
        getHorizontalRun(row, column).length < 3 &&
        getVerticalRun(row, column).length < 3
      ) {
        continue;
      }

      const componentCells = new Set();
      const stack = [key];

      while (stack.length > 0) {

        const currentKey = stack.pop();

        if (componentCells.has(currentKey)) {
          continue;
        }

        const [r, c] =
          currentKey
            .split(",")
            .map(Number);

        const currentCandy =
          board[r]?.[c];

        if (
          !currentCandy ||
          !sameCandyType(currentCandy, candy)
        ) {
          continue;
        }

        const isPartOfRun =
          getHorizontalRun(r, c).length >= 3 ||
          getVerticalRun(r, c).length >= 3;

        if (!isPartOfRun) {
          continue;
        }

        componentCells.add(currentKey);

        stack.push(
          `${r - 1},${c}`,
          `${r + 1},${c}`,
          `${r},${c - 1}`,
          `${r},${c + 1}`
        );
      }

      for (const cellKey of componentCells) {
        visited.add(cellKey);
      }

      const columnsByRow = new Map();
      const rowsByColumn = new Map();

      for (const cellKey of componentCells) {

        const [r, c] =
          cellKey
            .split(",")
            .map(Number);

        if (!columnsByRow.has(r)) {
          columnsByRow.set(r, []);
        }

        columnsByRow.get(r).push(c);

        if (!rowsByColumn.has(c)) {
          rowsByColumn.set(c, []);
        }

        rowsByColumn.get(c).push(r);
      }

      let bestHorizontal = [];

      for (const [r, columns] of columnsByRow) {

        const run =
          longestConsecutiveRun(columns);

        if (run.length > bestHorizontal.length) {

          bestHorizontal =
            run.map(c => `${r},${c}`);
        }
      }

      let bestVertical = [];

      for (const [c, rows] of rowsByColumn) {

        const run =
          longestConsecutiveRun(rows);

        if (run.length > bestVertical.length) {

          bestVertical =
            run.map(r => `${r},${c}`);
        }
      }

      groups.push({
        cells: componentCells,
        horizontal: bestHorizontal,
        vertical: bestVertical,
        type: candy.type
      });
    }
  }

  return groups;
}

function longestConsecutiveRun(numbers) {

  const sorted =
    [...numbers].sort((a, b) => a - b);

  let best = [];
  let current = [];

  for (const number of sorted) {

    const previous =
      current[current.length - 1];

    if (
      current.length === 0 ||
      number === previous + 1
    ) {

      current.push(number);
    } else {

      if (current.length > best.length) {
        best = current;
      }

      current = [number];
    }
  }

  if (current.length > best.length) {
    best = current;
  }

  return best;
}

function getHorizontalRun(
  row,
  column
) {

  const candy =
    board[row][column];

  if (
    !candy ||
    candy.special === "color-bomb"
  ) {

    return [];
  }

  const result = [];

  let start = column;

  while (
    start > 0 &&
    sameCandyType(
      board[row][start - 1],
      candy
    )
  ) {

    start--;
  }

  let end = column;

  while (
    end + 1 < BOARD_SIZE &&
    sameCandyType(
      board[row][end + 1],
      candy
    )
  ) {

    end++;
  }

  for (
    let current = start;
    current <= end;
    current++
  ) {

    result.push(
      `${row},${current}`
    );
  }

  return result;
}

function getVerticalRun(
  row,
  column
) {

  const candy =
    board[row][column];

  if (
    !candy ||
    candy.special === "color-bomb"
  ) {

    return [];
  }

  const result = [];

  let start = row;

  while (
    start > 0 &&
    sameCandyType(
      board[start - 1][column],
      candy
    )
  ) {

    start--;
  }

  let end = row;

  while (
    end + 1 < BOARD_SIZE &&
    sameCandyType(
      board[end + 1][column],
      candy
    )
  ) {

    end++;
  }

  for (
    let current = start;
    current <= end;
    current++
  ) {

    result.push(
      `${current},${column}`
    );
  }

  return result;
}

async function resolveMatches(
  initialMatches,
  swapFirst,
  swapSecond
) {

  let combo = 0;

  let matches =
    initialMatches;

  while (
    matches.size > 0
  ) {

    combo++;

    const groups =
      findMatchGroups();

    const specialCreates =
      determineSpecialCreates(
        groups,
        swapFirst,
        swapSecond
      );

    const expanded =
      expandSpecialEffects(matches);

    const comboMultiplier =
      1 + (combo - 1) * 0.5;

    const gained =
      Math.round(
        expanded.size *
        SCORE_PER_CANDY *
        comboMultiplier
      );

    score += gained;

    setMessage(
      combo > 1
        ? `COMBO x${combo}`
        : `Match! +${gained}`
    );

    if (combo > 1) {

      showComboPopup(combo);
    }

    showScorePopup(
      gained,
      expanded
    );

    animateMatches(expanded);

    await wait(POP_DELAY);

    for (
      const position of expanded
    ) {

      const [row, column] =
        position
          .split(",")
          .map(Number);

      board[row][column] = null;
    }

    createSpecialCandies(
      specialCreates,
      expanded
    );

    const fallOffsets =
      computeFallOffsets();

    collapseBoard();

    fillEmptySpaces();

    renderBoard(fallOffsets);

    await wait(FALL_DELAY);

    matches =
      findMatches();
  }
}

function determineSpecialCreates(
  groups,
  swapFirst,
  swapSecond
) {

  const creates = [];

  for (const group of groups) {

    const size =
      group.cells.size;

    const hasHorizontal =
      group.horizontal.length >= 3;

    const hasVertical =
      group.vertical.length >= 3;

    if (
      hasHorizontal &&
      hasVertical
    ) {

      const position =
        parsePosition(
          chooseSpecialPosition(
            group,
            swapFirst,
            swapSecond
          )
        );

      const candy =
        board[
          position.row
        ][
          position.column
        ];

      creates.push({
        ...position,
        special: "wrapped",
        type: candy?.type ?? group.type
      });

      continue;
    }

    if (size >= 5) {

      const position =
        chooseSpecialPosition(
          group,
          swapFirst,
          swapSecond
        );

      creates.push({
        ...parsePosition(position),
        special: "color-bomb",
        type: null
      });

      continue;
    }

    if (
      group.horizontal.length >= 4
    ) {

      const position =
        parsePosition(
          chooseSpecialPosition(
            group,
            swapFirst,
            swapSecond
          )
        );

      creates.push({
        ...position,
        special: "striped-horizontal",
        type: group.type
      });

      continue;
    }

    if (
      group.vertical.length >= 4
    ) {

      const position =
        parsePosition(
          chooseSpecialPosition(
            group,
            swapFirst,
            swapSecond
          )
        );

      creates.push({
        ...position,
        special: "striped-vertical",
        type: group.type
      });
    }
  }

  return creates;
}

function chooseSpecialPosition(
  group,
  swapFirst,
  swapSecond
) {

  const candidates = [
    swapSecond,
    swapFirst
  ];

  for (const candidate of candidates) {

    if (!candidate) {
      continue;
    }

    const key =
      `${candidate.row},${candidate.column}`;

    if (
      group.cells.has(key)
    ) {

      return key;
    }
  }

  return [...group.cells][
    Math.floor(
      group.cells.size / 2
    )
  ];
}

function parsePosition(position) {

  const [row, column] =
    position
      .split(",")
      .map(Number);

  return {
    row,
    column
  };
}

function createSpecialCandies(
  creates,
  removed
) {

  for (
    const special of creates
  ) {

    const key =
      `${special.row},${special.column}`;

    if (
      !removed.has(key)
    ) {

      continue;
    }

    board[
      special.row
    ][
      special.column
    ] = {
      type: special.type,
      special: special.special,
      justCreated: true
    };
  }
}

function expandSpecialEffects(
  matches
) {

  const expanded =
    new Set(matches);

  let changed = true;

  while (changed) {

    changed = false;

    for (const position of [
      ...expanded
    ]) {

      const { row, column } =
        parsePosition(position);

      const candy =
        board[row][column];

      if (!candy) {
        continue;
      }

      const affected =
        getSpecialAffectedCells(
          row,
          column,
          candy
        );

      for (
        const affectedPosition
        of affected
      ) {

        if (
          !expanded.has(
            affectedPosition
          )
        ) {

          expanded.add(
            affectedPosition
          );

          changed = true;
        }
      }
    }
  }

  return expanded;
}

function getSpecialAffectedCells(
  row,
  column,
  candy
) {

  const cells = [];

  if (
    candy.special ===
    "striped-horizontal"
  ) {

    for (
      let current = 0;
      current < BOARD_SIZE;
      current++
    ) {

      cells.push(
        `${row},${current}`
      );
    }
  }

  if (
    candy.special ===
    "striped-vertical"
  ) {

    for (
      let current = 0;
      current < BOARD_SIZE;
      current++
    ) {

      cells.push(
        `${current},${column}`
      );
    }
  }

  if (
    candy.special === "wrapped"
  ) {

    for (
      let rowOffset = -1;
      rowOffset <= 1;
      rowOffset++
    ) {

      for (
        let columnOffset = -1;
        columnOffset <= 1;
        columnOffset++
      ) {

        const targetRow =
          row + rowOffset;

        const targetColumn =
          column + columnOffset;

        if (
          targetRow >= 0 &&
          targetRow < BOARD_SIZE &&
          targetColumn >= 0 &&
          targetColumn < BOARD_SIZE
        ) {

          cells.push(
            `${targetRow},${targetColumn}`
          );
        }
      }
    }
  }

  return cells;
}

function getSpecialCombination(
  first,
  second
) {

  const firstCandy =
    board[first.row][first.column];

  const secondCandy =
    board[second.row][second.column];

  if (
    !firstCandy ||
    !secondCandy
  ) {

    return null;
  }

  const firstSpecial =
    firstCandy.special;

  const secondSpecial =
    secondCandy.special;

  if (
    firstSpecial === "color-bomb" &&
    secondSpecial === "color-bomb"
  ) {

    return "color-color";
  }

  if (
    (firstSpecial === "color-bomb" && secondSpecial === null) ||
    (secondSpecial === "color-bomb" && firstSpecial === null)
  ) {

    return "color-normal";
  }

  if (
    firstSpecial === "color-bomb" ||
    secondSpecial === "color-bomb"
  ) {

    return "color-special";
  }

  if (
    isStriped(firstCandy) &&
    isStriped(secondCandy)
  ) {

    return "striped-striped";
  }

  if (
    isStriped(firstCandy) &&
    secondSpecial === "wrapped"
  ) {

    return "striped-wrapped";
  }

  if (
    firstSpecial === "wrapped" &&
    isStriped(secondCandy)
  ) {

    return "striped-wrapped";
  }

  if (
    firstSpecial === "wrapped" &&
    secondSpecial === "wrapped"
  ) {

    return "wrapped-wrapped";
  }

  return null;
}

function isStriped(candy) {

  if (!candy) {
    return false;
  }

  return (
    candy.special ===
      "striped-horizontal" ||
    candy.special ===
      "striped-vertical"
  );
}

async function resolveSpecialCombination(
  first,
  second,
  combination
) {

  const cells = new Set();

  if (
    combination ===
    "color-color"
  ) {

    spawnBoardFlash();

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      for (
        let column = 0;
        column < BOARD_SIZE;
        column++
      ) {

        cells.add(
          `${row},${column}`
        );
      }
    }
  }

  if (
    combination ===
    "color-normal"
  ) {

    const normalPosition =
      board[
        first.row
      ][
        first.column
      ].special === "color-bomb"
        ? second
        : first;

    const targetType =
      board[
        normalPosition.row
      ][
        normalPosition.column
      ].type;

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      for (
        let column = 0;
        column < BOARD_SIZE;
        column++
      ) {

        const candy =
          board[row][column];

        if (
          candy &&
          candy.type === targetType &&
          candy.special !== "color-bomb"
        ) {

          cells.add(
            `${row},${column}`
          );
        }
      }
    }

    cells.add(
      `${first.row},${first.column}`
    );

    cells.add(
      `${second.row},${second.column}`
    );
  }

  if (
    combination ===
    "color-special"
  ) {

    const specialPosition =
      board[
        first.row
      ][
        first.column
      ].special === "color-bomb"
        ? second
        : first;

    const bombPosition =
      specialPosition === second
        ? first
        : second;

    const targetCandy =
      board[
        specialPosition.row
      ][
        specialPosition.column
      ];

    const targetType =
      targetCandy.type;

    const targetSpecial =
      targetCandy.special;

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      for (
        let column = 0;
        column < BOARD_SIZE;
        column++
      ) {

        const candy =
          board[row][column];

        if (
          candy &&
          candy.type === targetType &&
          candy.special !== "color-bomb"
        ) {

          cells.add(
            `${row},${column}`
          );

          const affected =
            getSpecialAffectedCells(
              row,
              column,
              { special: targetSpecial }
            );

          for (
            const position of affected
          ) {

            cells.add(position);
          }
        }
      }
    }

    cells.add(
      `${bombPosition.row},${bombPosition.column}`
    );
  }

  if (
    combination ===
    "striped-striped"
  ) {

    for (
      let current = 0;
      current < BOARD_SIZE;
      current++
    ) {

      cells.add(
        `${first.row},${current}`
      );

      cells.add(
        `${current},${first.column}`
      );

      cells.add(
        `${second.row},${current}`
      );

      cells.add(
        `${current},${second.column}`
      );
    }
  }

  if (
    combination ===
    "striped-wrapped"
  ) {

    for (
      let rowOffset = -1;
      rowOffset <= 1;
      rowOffset++
    ) {

      for (
        let columnOffset = -1;
        columnOffset <= 1;
        columnOffset++
      ) {

        const row =
          first.row + rowOffset;

        const column =
          first.column + columnOffset;

        if (
          row >= 0 &&
          row < BOARD_SIZE &&
          column >= 0 &&
          column < BOARD_SIZE
        ) {

          for (
            let current = 0;
            current < BOARD_SIZE;
            current++
          ) {

            cells.add(
              `${row},${current}`
            );

            cells.add(
              `${current},${column}`
            );
          }
        }
      }
    }
  }

  if (
    combination ===
    "wrapped-wrapped"
  ) {

    for (
      let rowOffset = -2;
      rowOffset <= 2;
      rowOffset++
    ) {

      for (
        let columnOffset = -2;
        columnOffset <= 2;
        columnOffset++
      ) {

        const row =
          first.row + rowOffset;

        const column =
          first.column + columnOffset;

        if (
          row >= 0 &&
          row < BOARD_SIZE &&
          column >= 0 &&
          column < BOARD_SIZE
        ) {

          cells.add(
            `${row},${column}`
          );
        }
      }
    }
  }

  const specialGained =
    cells.size *
    SCORE_PER_CANDY *
    2;

  score += specialGained;

  showScorePopup(
    specialGained,
    cells
  );

  animateMatches(cells);

  await wait(POP_DELAY);

  for (
    const position of cells
  ) {

    const { row, column } =
      parsePosition(position);

    board[row][column] = null;
  }

  const fallOffsets =
    computeFallOffsets();

  collapseBoard();

  fillEmptySpaces();

  renderBoard(fallOffsets);

  await wait(FALL_DELAY);

  const matches =
    findMatches();

  if (
    matches.size > 0
  ) {

    await resolveMatches(
      matches
    );
  }
}

const SHARD_COLORS = [
  "var(--red)",
  "var(--blue)",
  "var(--yellow-candy)",
  "var(--green)",
  "var(--purple)",
  "var(--pink)"
];

const COMBO_LABELS = {
  2: "Manis!",
  3: "Lezat!",
  4: "Luar Biasa!"
};

const COMBO_LABEL_MAX = "Fantastis!";

function showComboPopup(
  combo
) {

  if (
    !particleLayer ||
    prefersReducedMotion()
  ) {

    return;
  }

  const label =
    COMBO_LABELS[combo] ??
    COMBO_LABEL_MAX;

  const popup =
    document.createElement("span");

  popup.className = "combo-popup";

  popup.textContent = label;

  particleLayer.appendChild(popup);

  setTimeout(
    () => popup.remove(),
    700
  );
}

function showScorePopup(
  points,
  cellsSet
) {

  if (
    !particleLayer ||
    prefersReducedMotion() ||
    points <= 0
  ) {

    return;
  }

  const layerRect =
    particleLayer.getBoundingClientRect();

  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (
    const position of cellsSet
  ) {

    const { row, column } =
      parsePosition(position);

    const index =
      row * BOARD_SIZE +
      column;

    const el =
      boardElement.children[index];

    if (!el) {
      continue;
    }

    const rect =
      el.getBoundingClientRect();

    sumX +=
      rect.left +
      rect.width / 2 -
      layerRect.left;

    sumY +=
      rect.top +
      rect.height / 2 -
      layerRect.top;

    count++;
  }

  if (count === 0) {
    return;
  }

  const popup =
    document.createElement("span");

  popup.className = "score-popup";

  popup.textContent = `+${points}`;

  popup.style.left = `${sumX / count}px`;
  popup.style.top = `${sumY / count}px`;

  particleLayer.appendChild(popup);

  setTimeout(
    () => popup.remove(),
    650
  );
}

function prefersReducedMotion() {

  return Boolean(
    window.matchMedia &&
    window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches
  );
}

function spawnPopEffect(
  candyElement,
  candyData
) {

  if (
    !particleLayer ||
    prefersReducedMotion()
  ) {

    return;
  }

  const candyRect =
    candyElement.getBoundingClientRect();

  const layerRect =
    particleLayer.getBoundingClientRect();

  const centerX =
    candyRect.left +
    candyRect.width / 2 -
    layerRect.left;

  const centerY =
    candyRect.top +
    candyRect.height / 2 -
    layerRect.top;

  const special =
    candyData?.special ?? null;

  const color =
    special === "color-bomb"
      ? null
      : SHARD_COLORS[
          candyData?.type ?? 0
        ] ?? "#ffffff";

  const isColorBomb =
    special === "color-bomb";

  const shardCount =
    isColorBomb ? 10 : 5;

  const sparkCount =
    isColorBomb ? 8 : 4;

  const burstRadius =
    isColorBomb ? 34 : 22;

  for (
    let i = 0;
    i < shardCount;
    i++
  ) {

    const angle =
      (Math.PI * 2 * i) / shardCount +
      Math.random() * 0.6;

    const distance =
      burstRadius + Math.random() * 14;

    const shardColor =
      color ??
      SHARD_COLORS[i % SHARD_COLORS.length];

    spawnParticle(
      "shard",
      centerX,
      centerY,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      { background: shardColor },
      500,
      Math.round(
        Math.random() * 280 - 140
      )
    );
  }

  for (
    let i = 0;
    i < sparkCount;
    i++
  ) {

    const angle =
      Math.random() * Math.PI * 2;

    const distance =
      16 + Math.random() * 18;

    spawnParticle(
      "spark",
      centerX,
      centerY,
      Math.cos(angle) * distance,
      Math.sin(angle) * distance,
      null,
      450
    );
  }

  if (special === "wrapped") {

    spawnShockwave(centerX, centerY);
  }

  if (
    special === "striped-horizontal" ||
    special === "striped-vertical"
  ) {

    spawnStreak(
      special === "striped-horizontal"
        ? "horizontal"
        : "vertical",
      centerX,
      centerY
    );
  }
}

function spawnShockwave(
  x,
  y
) {

  const ring =
    document.createElement("span");

  ring.className = "shockwave";

  ring.style.left = `${x}px`;
  ring.style.top = `${y}px`;

  particleLayer.appendChild(ring);

  setTimeout(
    () => ring.remove(),
    500
  );
}

function spawnBoardFlash() {

  if (
    !particleLayer ||
    prefersReducedMotion()
  ) {

    return;
  }

  const flash =
    document.createElement("span");

  flash.className = "board-flash";

  particleLayer.appendChild(flash);

  setTimeout(
    () => flash.remove(),
    500
  );
}

function spawnStreak(
  direction,
  x,
  y
) {

  const streak =
    document.createElement("span");

  streak.className =
    direction === "horizontal"
      ? "streak streak-horizontal"
      : "streak streak-vertical";

  if (direction === "horizontal") {

    streak.style.top = `${y}px`;

  } else {

    streak.style.left = `${x}px`;
  }

  particleLayer.appendChild(streak);

  setTimeout(
    () => streak.remove(),
    380
  );
}

function spawnParticle(
  className,
  x,
  y,
  tx,
  ty,
  extraStyle,
  lifespan,
  rotationDeg
) {

  const particle =
    document.createElement("span");

  particle.className = className;

  particle.style.left = `${x}px`;
  particle.style.top = `${y}px`;

  particle.style.setProperty(
    "--tx",
    `${tx}px`
  );

  particle.style.setProperty(
    "--ty",
    `${ty}px`
  );

  if (rotationDeg !== undefined) {

    particle.style.setProperty(
      "--rot",
      `${rotationDeg}deg`
    );
  }

  if (extraStyle) {

    Object.assign(
      particle.style,
      extraStyle
    );
  }

  particleLayer.appendChild(particle);

  setTimeout(
    () => particle.remove(),
    lifespan
  );
}

function animateMatches(
  matches
) {

  for (
    const position of matches
  ) {

    const { row, column } =
      parsePosition(position);

    const index =
      row * BOARD_SIZE +
      column;

    const candy =
      boardElement.children[index];

    if (candy) {

      candy.classList.add(
        "pop"
      );

      spawnPopEffect(
        candy,
        board[row][column]
      );
    }
  }
}

function computeFallOffsets() {

  const offsets = [];

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    offsets.push(
      new Array(BOARD_SIZE).fill(0)
    );
  }

  for (
    let column = 0;
    column < BOARD_SIZE;
    column++
  ) {

    const removedRows = [];
    const survivorRows = [];

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      if (board[row][column] === null) {
        removedRows.push(row);
      } else {
        survivorRows.push(row);
      }
    }

    const emptyCount =
      removedRows.length;

    if (emptyCount === 0) {
      continue;
    }

    for (
      let i = 0;
      i < survivorRows.length;
      i++
    ) {

      const originalRow =
        survivorRows[i];

      const finalRow =
        emptyCount + i;

      let shift = 0;

      for (const removedRow of removedRows) {

        if (removedRow < originalRow) {
          shift++;
        }
      }

      offsets[finalRow][column] = shift;
    }

    for (
      let finalRow = 0;
      finalRow < emptyCount;
      finalRow++
    ) {

      offsets[finalRow][column] =
        (emptyCount - finalRow) +
        NEW_CANDY_DROP_BUFFER;
    }
  }

  return offsets;
}

function collapseBoard() {

  for (
    let column = 0;
    column < BOARD_SIZE;
    column++
  ) {

    const candies = [];

    for (
      let row = BOARD_SIZE - 1;
      row >= 0;
      row--
    ) {

      if (
        board[row][column]
      ) {

        candies.push(
          board[row][column]
        );
      }
    }

    for (
      let row = BOARD_SIZE - 1;
      row >= 0;
      row--
    ) {

      const index =
        BOARD_SIZE -
        1 -
        row;

      board[row][column] =
        candies[index] ?? null;
    }
  }
}

function fillEmptySpaces() {

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let column = 0;
      column < BOARD_SIZE;
      column++
    ) {

      if (
        board[row][column] === null
      ) {

        board[row][column] =
          createCandy();
      }
    }
  }
}

function hasPossibleMove() {

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let column = 0;
      column < BOARD_SIZE;
      column++
    ) {

      if (
        column + 1 < BOARD_SIZE &&
        testSwap(
          { row, column },
          {
            row,
            column: column + 1
          }
        )
      ) {

        return true;
      }

      if (
        row + 1 < BOARD_SIZE &&
        testSwap(
          { row, column },
          {
            row: row + 1,
            column
          }
        )
      ) {

        return true;
      }
    }
  }

  return false;
}

function testSwap(
  first,
  second
) {

  if (
    getSpecialCombination(
      first,
      second
    )
  ) {

    return true;
  }

  swapCandies(
    first,
    second
  );

  const hasMatch =
    findMatches().size > 0;

  swapCandies(
    first,
    second
  );

  return hasMatch;
}

function findPossibleMove() {

  for (
    let row = 0;
    row < BOARD_SIZE;
    row++
  ) {

    for (
      let column = 0;
      column < BOARD_SIZE;
      column++
    ) {

      if (
        column + 1 < BOARD_SIZE
      ) {

        const first = {
          row,
          column
        };

        const second = {
          row,
          column: column + 1
        };

        if (
          testSwap(
            first,
            second
          )
        ) {

          return {
            first,
            second
          };
        }
      }

      if (
        row + 1 < BOARD_SIZE
      ) {

        const first = {
          row,
          column
        };

        const second = {
          row: row + 1,
          column
        };

        if (
          testSwap(
            first,
            second
          )
        ) {

          return {
            first,
            second
          };
        }
      }
    }
  }

  return null;
}

function shuffleBoard() {

  const candies =
    board.flat().filter(Boolean);

  let attempts = 0;

  do {

    shuffleArray(candies);

    let index = 0;

    for (
      let row = 0;
      row < BOARD_SIZE;
      row++
    ) {

      for (
        let column = 0;
        column < BOARD_SIZE;
        column++
      ) {

        board[row][column] =
          cloneCandy(
            candies[index++]
          );
      }
    }

    attempts++;

  } while (
    (
      findMatches().size > 0 ||
      !hasPossibleMove()
    ) &&
    attempts < 100
  );
}

function shuffleArray(array) {

  for (
    let index = array.length - 1;
    index > 0;
    index--
  ) {

    const randomIndex =
      Math.floor(
        Math.random() *
        (index + 1)
      );

    [
      array[index],
      array[randomIndex]
    ] = [
      array[randomIndex],
      array[index]
    ];
  }
}

function startHintTimer() {

  clearHint();

  if (
    gameOver ||
    gameLocked
  ) {

    return;
  }

  hintTimer =
    setTimeout(
      showHint,
      HINT_DELAY
    );
}

function showHint() {

  const possibleMove =
    findPossibleMove();

  if (!possibleMove) {
    return;
  }

  idleHintCells = [
    possibleMove.first,
    possibleMove.second
  ];

  renderBoard();

  hintClearTimer =
    setTimeout(
      () => {

        if (
          idleHintCells.length > 0
        ) {

          clearHint();
        }

      },
      1500
    );
}

function clearHint() {

  clearTimeout(hintTimer);

  hintTimer = null;

  clearTimeout(hintClearTimer);

  hintClearTimer = null;

  idleHintCells = [];
}

function endGame(won) {

  gameLocked = true;
  gameOver = true;

  clearHint();

  finalScoreElement.textContent =
    score;

  if (won) {

    overlayTitle.textContent =
      "Target tercapai!";

    overlayMessage.textContent =
      "Kamu berhasil melewati target skor.";
  } else if (gameMode === "unlimited") {

    overlayTitle.textContent =
      "Langkah habis";

    overlayMessage.textContent =
      "Mode Tanpa Batas tidak punya target. Coba kalahkan skor ini di percobaan berikutnya.";
  } else {

    overlayTitle.textContent =
      "Langkah habis";

    overlayMessage.textContent =
      "Coba lagi dan pecahkan skor sebelumnya.";
  }

  gameOverlay.hidden = false;

  gameOverlay.setAttribute(
    "aria-hidden",
    "false"
  );

  setMessage(
    won
      ? "Target tercapai! Kamu menang."
      : "Langkah habis."
  );
}

function hideOverlay() {

  gameOverlay.hidden = true;

  gameOverlay.setAttribute(
    "aria-hidden",
    "true"
  );
}

function setMessage(text) {

  messageElement.textContent =
    text;

  if (gameStatus) {

    gameStatus.textContent =
      text;
  }
}

function wait(milliseconds) {

  return new Promise(
    resolve => {

      setTimeout(
        resolve,
        milliseconds
      );
    }
  );
}

function setGameMode(mode) {

  if (mode === gameMode) {
    return;
  }

  gameMode = mode;

  restartGame();
}

function updateModeButtons() {

  const isTarget =
    gameMode === "target";

  if (modeTargetButton) {

    modeTargetButton.classList.toggle(
      "is-active",
      isTarget
    );

    modeTargetButton.setAttribute(
      "aria-pressed",
      String(isTarget)
    );
  }

  if (modeUnlimitedButton) {

    modeUnlimitedButton.classList.toggle(
      "is-active",
      !isTarget
    );

    modeUnlimitedButton.setAttribute(
      "aria-pressed",
      String(!isTarget)
    );
  }
}

function restartGame() {

  score = 0;

  moves = STARTING_MOVES;

  selectedCandy = null;

  gameLocked = false;

  gameOver = false;

  idleHintCells = [];

  clearHint();

  hideOverlay();

  updateModeButtons();

  createBoard();

  renderBoard();

  setMessage(
    "Pilih dua permen yang bersebelahan untuk bertukar."
  );

  startHintTimer();
}

restartButton.addEventListener(
  "click",
  restartGame
);

if (overlayRestartButton) {

  overlayRestartButton.addEventListener(
    "click",
    restartGame
  );
}

if (modeTargetButton) {

  modeTargetButton.addEventListener(
    "click",
    () => setGameMode("target")
  );
}

if (modeUnlimitedButton) {

  modeUnlimitedButton.addEventListener(
    "click",
    () => setGameMode("unlimited")
  );
}

restartGame();