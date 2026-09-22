/* =========================================
   SWEET GRID
   Premium Match-3 Game
========================================= */


/* =========================================
   CONFIG
========================================= */

const BOARD_SIZE = 8;
const CANDY_TYPES = 6;

const STARTING_MOVES = 30;
const TARGET_SCORE = 1000;

const SCORE_PER_CANDY = 10;

const SWAP_DELAY = 120;
const POP_DELAY = 220;
const FALL_DELAY = 150;

const HINT_DELAY = 5000;


/* =========================================
   DOM
========================================= */

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


/* =========================================
   GAME STATE
========================================= */

let board = [];

let score = 0;
let moves = STARTING_MOVES;

let selectedCandy = null;

let gameLocked = false;
let gameOver = false;

let hintTimer = null;
let hintClearTimer = null;

let idleHintCells = [];


/* =========================================
   CANDY CLASSES
========================================= */

const candyClasses = [
  "candy-red",
  "candy-blue",
  "candy-yellow",
  "candy-green",
  "candy-purple",
  "candy-pink"
];


/* =========================================
   CANDY FACTORY
========================================= */

/*
  Candy sekarang bukan hanya angka.

  Contoh candy biasa:

  {
    type: 2,
    special: null
  }

  Special:

  {
    type: 2,
    special: "striped-horizontal"
  }

  Color bomb:

  {
    type: null,
    special: "color-bomb"
  }
*/

function createCandy(type = randomCandy()) {

  return {
    type,
    special: null
  };
}


/* =========================================
   RANDOM CANDY
========================================= */

function randomCandy() {

  return Math.floor(
    Math.random() * CANDY_TYPES
  );
}


/* =========================================
   CLONE CANDY
========================================= */

function cloneCandy(candy) {

  if (!candy) {
    return null;
  }

  return {
    type: candy.type,
    special: candy.special
  };
}


/* =========================================
   CREATE EMPTY BOARD
========================================= */

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


/* =========================================
   CREATE BOARD
========================================= */

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


/* =========================================
   STARTING MATCH CHECK
========================================= */

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


/* =========================================
   RENDER BOARD
========================================= */

function renderBoard() {

  boardElement.innerHTML = "";

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


        /* Special candy styling */

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
      }


      candy.dataset.row = row;
      candy.dataset.column = column;


      /* Selected */

      if (
        selectedCandy &&
        selectedCandy.row === row &&
        selectedCandy.column === column
      ) {

        candy.classList.add("selected");
      }


      /* Hint */

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
    }
  }


  updateUI();
}


/* =========================================
   CANDY ACCESSIBILITY LABEL
========================================= */

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


/* =========================================
   UPDATE UI
========================================= */

function updateUI() {

  scoreElement.textContent = score;

  movesElement.textContent = moves;

  if (targetElement) {
    targetElement.textContent =
      TARGET_SCORE;
  }

  if (finalScoreElement) {
    finalScoreElement.textContent =
      score;
  }
}


/* =========================================
   HANDLE CLICK
========================================= */

function handleCandyClick(row, column) {

  if (gameLocked || gameOver) {
    return;
  }

  if (moves <= 0) {
    return;
  }


  clearHint();


  /* First candy */

  if (!selectedCandy) {

    selectedCandy = {
      row,
      column
    };

    renderBoard();

    return;
  }


  /* Same candy */

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


  /* Not adjacent */

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


  /* Valid swap */

  performMove(
    selectedCandy,
    currentCandy
  );

  selectedCandy = null;
}


/* =========================================
   CHECK ADJACENT
========================================= */

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


/* =========================================
   SWAP CANDIES
========================================= */

function swapCandies(first, second) {

  const temporary =
    board[first.row][first.column];

  board[first.row][first.column] =
    board[second.row][second.column];

  board[second.row][second.column] =
    temporary;
}


/* =========================================
   PERFORM MOVE
========================================= */

async function performMove(
  first,
  second
) {

  gameLocked = true;

  clearHint();


  /* Swap */

  swapCandies(first, second);

  renderBoard();

  await wait(SWAP_DELAY);


  /*
    Special + special combinations
    dapat diproses walaupun tidak ada
    match normal.
  */

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


  /* Normal match check */

  const matches =
    findMatches();


  /*
    Invalid swap
  */

  if (matches.size === 0) {

    swapCandies(first, second);

    renderBoard();

    setMessage(
      "Swap itu tidak menghasilkan match."
    );

    await wait(180);

    gameLocked = false;

    startHintTimer();

    return;
  }


  /* Valid move */

  moves--;

  await resolveMatches(
    matches,
    first,
    second
  );


  finishMove();
}


/* =========================================
   FINISH MOVE
========================================= */

function finishMove() {

  selectedCandy = null;

  renderBoard();


  if (score >= TARGET_SCORE) {

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


/* =========================================
   FIND MATCHES
========================================= */

function findMatches() {

  const matches = new Set();


  /* =======================================
     HORIZONTAL
  ======================================= */

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


  /* =======================================
     VERTICAL
  ======================================= */

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


/* =========================================
   SAME CANDY TYPE
========================================= */

function sameCandyType(
  first,
  second
) {

  if (!first || !second) {
    return false;
  }

  /*
    Color bomb tidak dianggap sebagai
    candy biasa ketika mencari match.
  */

  if (
    first.special === "color-bomb" ||
    second.special === "color-bomb"
  ) {

    return false;
  }

  return first.type === second.type;
}


/* =========================================
   FIND MATCH GROUPS
========================================= */

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

      const candy =
        board[row][column];

      if (
        !candy ||
        candy.special === "color-bomb"
      ) {
        continue;
      }


      const horizontal =
        getHorizontalRun(
          row,
          column
        );

      const vertical =
        getVerticalRun(
          row,
          column
        );


      if (
        horizontal.length < 3 &&
        vertical.length < 3
      ) {

        continue;
      }


      const cells =
        new Set([
          ...horizontal,
          ...vertical
        ]);


      for (const position of cells) {
        visited.add(position);
      }


      groups.push({
        cells,
        horizontal,
        vertical,
        type: candy.type
      });
    }
  }

  return groups;
}


/* =========================================
   HORIZONTAL RUN
========================================= */

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


/* =========================================
   VERTICAL RUN
========================================= */

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


/* =========================================
   RESOLVE MATCHES
========================================= */

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


    /* Expand matches with special candy effects */

    const expanded =
      expandSpecialEffects(matches);


    /*
      Score dihitung dari expanded.size, bukan
      matches.size, supaya permen yang ikut hancur
      karena efek permen spesial juga dihitung.
    */

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


    /* Animate */

    animateMatches(expanded);

    await wait(POP_DELAY);


    /* Remove */

    for (
      const position of expanded
    ) {

      const [row, column] =
        position
          .split(",")
          .map(Number);

      board[row][column] = null;
    }


    /*
      Create special candies after
      removal.
    */

    createSpecialCandies(
      specialCreates,
      expanded
    );


    collapseBoard();

    fillEmptySpaces();

    renderBoard();

    await wait(FALL_DELAY);


    matches =
      findMatches();
  }
}


/* =========================================
   DETERMINE SPECIAL CREATES
========================================= */

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


    /* =====================================
       5+ MATCH → COLOR BOMB
    ===================================== */

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


    /* =====================================
       T / L → WRAPPED
    ===================================== */

    if (
      hasHorizontal &&
      hasVertical
    ) {

      const position =
        chooseSpecialPosition(
          group,
          swapFirst,
          swapSecond
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


    /* =====================================
       4 HORIZONTAL
    ===================================== */

    if (
      group.horizontal.length >= 4
    ) {

      const position =
        chooseSpecialPosition(
          group,
          swapFirst,
          swapSecond
        );

      creates.push({
        ...position,
        special: "striped-horizontal",
        type: group.type
      });

      continue;
    }


    /* =====================================
       4 VERTICAL
    ===================================== */

    if (
      group.vertical.length >= 4
    ) {

      const position =
        chooseSpecialPosition(
          group,
          swapFirst,
          swapSecond
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


/* =========================================
   CHOOSE SPECIAL POSITION
========================================= */

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


/* =========================================
   PARSE POSITION
========================================= */

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


/* =========================================
   CREATE SPECIAL CANDIES
========================================= */

function createSpecialCandies(
  creates,
  removed
) {

  for (
    const special of creates
  ) {

    const key =
      `${special.row},${special.column}`;


    /*
      Jika posisi tidak lagi tersedia,
      cari posisi yang masih kosong.
    */

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
      special: special.special
    };
  }
}


/* =========================================
   EXPAND SPECIAL EFFECTS
========================================= */

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


/* =========================================
   SPECIAL AFFECTED CELLS
========================================= */

function getSpecialAffectedCells(
  row,
  column,
  candy
) {

  const cells = [];


  /* =====================================
     STRIPED HORIZONTAL
  ===================================== */

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


  /* =====================================
     STRIPED VERTICAL
  ===================================== */

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


  /* =====================================
     WRAPPED
  ===================================== */

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


/* =========================================
   SPECIAL COMBINATION
========================================= */

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


/* =========================================
   IS STRIPED
========================================= */

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


/* =========================================
   RESOLVE SPECIAL COMBINATION
========================================= */

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


    /* Color bomb-nya sendiri ikut hilang */

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


    /*
      Setiap permen sejenis "berubah" menjadi
      salinan permen spesial pasangannya, lalu
      langsung diledakkan (bukan diundi dengan
      Math.random()), supaya hasilnya konsisten.
    */

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


    /* Color bomb-nya sendiri ikut hilang */

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


  score +=
    cells.size *
    SCORE_PER_CANDY *
    2;


  animateMatches(cells);

  await wait(POP_DELAY);


  for (
    const position of cells
  ) {

    const { row, column } =
      parsePosition(position);

    board[row][column] = null;
  }


  collapseBoard();

  fillEmptySpaces();

  renderBoard();

  await wait(FALL_DELAY);


  /*
    Special combinations dapat
    menghasilkan match lanjutan.
  */

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


/* =========================================
   ANIMATE MATCHES
========================================= */

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
    }
  }
}


/* =========================================
   COLLAPSE BOARD
========================================= */

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


/* =========================================
   FILL EMPTY SPACES
========================================= */

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


/* =========================================
   CHECK POSSIBLE MOVE
========================================= */

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

      /* Right */

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


      /* Down */

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


/* =========================================
   TEST SWAP
========================================= */

function testSwap(
  first,
  second
) {

  /*
    Kombinasi permen spesial (mis. color bomb
    dengan permen biasa) adalah langkah valid
    walaupun tidak menghasilkan match biasa,
    jadi dicek dulu sebelum menukar papan.
  */

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


/* =========================================
   FIND A POSSIBLE MOVE
========================================= */

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


/* =========================================
   SHUFFLE BOARD
========================================= */

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


/* =========================================
   SHUFFLE ARRAY
========================================= */

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


/* =========================================
   HINT SYSTEM
========================================= */

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


/* =========================================
   SHOW HINT
========================================= */

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


/* =========================================
   CLEAR HINT
========================================= */

function clearHint() {

  clearTimeout(hintTimer);

  hintTimer = null;


  clearTimeout(hintClearTimer);

  hintClearTimer = null;


  idleHintCells = [];
}


/* =========================================
   END GAME
========================================= */

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


/* =========================================
   CLOSE OVERLAY
========================================= */

function hideOverlay() {

  gameOverlay.hidden = true;

  gameOverlay.setAttribute(
    "aria-hidden",
    "true"
  );
}


/* =========================================
   MESSAGE
========================================= */

function setMessage(text) {

  messageElement.textContent =
    text;

  if (gameStatus) {

    gameStatus.textContent =
      text;
  }
}


/* =========================================
   WAIT
========================================= */

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


/* =========================================
   RESTART GAME
========================================= */

function restartGame() {

  score = 0;

  moves = STARTING_MOVES;

  selectedCandy = null;

  gameLocked = false;

  gameOver = false;

  idleHintCells = [];

  clearHint();

  hideOverlay();

  createBoard();

  renderBoard();

  setMessage(
    "Pilih dua permen yang bersebelahan untuk bertukar."
  );

  startHintTimer();
}


/* =========================================
   BUTTON EVENTS
========================================= */

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


/* =========================================
   START GAME
========================================= */

restartGame();