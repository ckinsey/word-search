// ----------------------------------------------- [ Module: Game ] -
(function () {

  // Persistant Data 
  var TOTAL_NUMBER_OF_WORDS_FOUND = DATA.loadValid('total-words-found', 0, DATA.int10);
  var TOTAL_NUMBER_OF_PUZZLES = DATA.loadValid('total-puzzles-solved', 0, DATA.int10);
  var TOTAL_NUMBER_OF_HINTS = DATA.loadValid('total-hints', 0, DATA.int10);
  var IS_PUZZLE_COUNTED = 0;

  // Size of notification area vs puzzle area
  var NOTIFY_WIDTH_RATIO = 0.75;
  var NOTIFY_HEIGHT_RATIO = 0.75;
  var NOTIFY_FONT_SIZE_RATIO = 0.09;

  // Size of list font compared to puzzle font size
  var LIST_FONT_SCALE = 0.75;

  // How much to offset the circles drawn around the letters
  var LETTER_OFFSET_PERCENT_X = 0.5;
  var LETTER_OFFSET_PERCENT_Y = 0.6;

  // Determines how the ui behaves if square-like
  var MIN_SIZE_RATIO = 0.68;

  // How many milliseconds to show a notification
  var NOTIFICATION_DURATION = 2000;

  // Various colors used to draw the circles around the words
  var COLORS = ['red', 'orange', 'yellow', 'lime', 'green', 'aqua', 'blue', 'purple'];

  // 0 = invisible circles, 1 = opaque circles
  var CIRCLE_ALPHA = 0.3;
  var CIRCLE_FILL = 1;

  // Interjections to randomly add to the user feedback
  var FEEDBACK_UIFAIL = 'Try again!';
  var FEEDBACK_REPEAT = 'Try again!';
  var FEEDBACK_FAIL = 'Whoops!';
  var FEEDBACK_FOUND1 = 'Correct!';
  var FEEDBACK_FINISHED = 'Great Job!'

  // Feedback for specific senarios
  var FEEDBACK_NO_MOVE = ' Click, drag, and release.';
  var FEEDBACK_DIAGONAL = ' Diagonal lines must be 45&deg;.';
  var FEEDBACK_PUZZLE_FINISHED = ' You found everything.';
  var FEEDBACK_WORD_FOUND = ' You found: ';
  var FEEDBACK_AGAIN = ' ... Again.';
  var FEEDBACK_NOT_ON_LIST = ' is not on the word list.';

  // Css hooks
  var ID_NOTIFY = '#notification';
  var CLASS_PUZZLE_LETTER = 'letter';
  var CLASS_WORD = 'word';
  var CLASS_FOUND = 'found';
  var ID_WORD_PREFIX = 'word_';
  var ID_CANVAS_PREVIEW = '#canvas-preview';
  var ID_CANVAS_RESULTS = '#canvas-results';
  var ID_LETTER_PREFIX = 'letter_';
  var ID_LETTER_SEP = '_';
  var ID_DYNAMIC_CSS = '#dynamic-css';
  var ID_DYNAMIC_CSS2 = '#dynamic-css-2';
  var ID_PUZZLE = '#word-search-puzzle';
  var ID_LIST = '#word-list';
  var ID_LIST_CONTAINER = '#word-list-container';
  var ID_BUTTON_EXIT = '#btn-exit';
  var ID_BUTTON_HIDE = '#btn-hide';
  var ID_DIALOG_NEW_PUZZLE = '#dialog-new-puzzle';
  var ID_BUTTON_NEW_PUZZLE = '#btn-new-puzzle';
  var ID_BUTTON_NO_PUZZLE = '#btn-no-puzzle';
  var ID_BUTTON_NEW = '#btn-new';

  // Global variables to be computed/set later
  var N_LETTERS_X = 8;
  var N_LETTERS_Y = 8;
  var MAX_WORD_SIZE = Math.max(N_LETTERS_X, N_LETTERS_Y);
  // Size of a letter (in pixels)
  var LETTER_WIDTH = 0;
  var LETTER_HEIGHT = 0;
  // Where the puzzle data will be stored
  var PUZZLE = null;

  // For sharing puzzles
  var PUZZLE_SEED = RANDOM.getCurrent();
  var PUZZLE_INDEX = 0;

  var MESSAGE_SHOW = 'Show';
  var MESSAGE_HIDE = 'Hide';

  // -------------------------------------------------------- [ Section: UI ] -

  // Hides the circles the user has drawn over the letters
  // and the words in the list that have been found
  function uiHideMarks() {
    var canvas = $(ID_CANVAS_RESULTS)[0];
    if(canvas.style.display === 'none') {
      canvas.style.display = 'block';
      $(ID_DYNAMIC_CSS2).styleSheet(' ');
      this.innerHTML = MESSAGE_HIDE;
    } else {
      canvas.style.display = 'none';
      $(ID_DYNAMIC_CSS2).styleSheet('.' + CLASS_FOUND + '{ display: none; }');
      this.innerHTML = MESSAGE_SHOW;
    }
  }

  // When the user wants to exit - go back
  function uiExit() {
    history.go(-1);
    // phonegap screws with the usual history so we need the following
    // to get custom 'back' buttons working...
    if(navigator && navigator.app && navigator.app.backHistory) {
      navigator.app.backHistory();
    }
  }

  // Resizes the UI
  function uiResize() {
    var $window = $(window);
    var windowSizeX = $window.width();
    var windowSizeY = $window.height();
    $('body').width(windowSizeX).height(windowSizeY);

    var $puzzle = $(ID_PUZZLE);
    var $listContainer = $(ID_LIST_CONTAINER);
    var $list = $(ID_LIST);

    // Make the puzzle the smaller of the width/height
    // but if it's squarish, make sure there is room for the word list
    var listWidth, listHeight, listTop, listLeft;
    var puzzleWidth, puzzleHeight, puzzleTop, puzzleLeft;
    var smallerSize = windowSizeX;
    if(windowSizeX > windowSizeY) {
      smallerSize = windowSizeY;
      if(smallerSize > windowSizeX * MIN_SIZE_RATIO) {
        smallerSize = windowSizeX * MIN_SIZE_RATIO;
      }
      puzzleLeft = 0;
      puzzleTop = (windowSizeY - smallerSize) / 2;
      listTop = 0;
      listLeft = smallerSize;
      listWidth = windowSizeX - smallerSize;
      listHeight = windowSizeY;
    } else {
      if(smallerSize > windowSizeY * MIN_SIZE_RATIO) {
        smallerSize = windowSizeY * MIN_SIZE_RATIO;
      }
      puzzleLeft = (windowSizeX - smallerSize) / 2;
      puzzleTop = 0;
      listLeft = 0;
      listTop = smallerSize;
      listWidth = windowSizeX;
      listHeight = windowSizeY - smallerSize;
    }
    puzzleWidth = smallerSize - 2;
    puzzleHeight = smallerSize - 2;
    $puzzle.css({
      left: puzzleLeft + 'px',
      top: puzzleTop + 'px',
      width: puzzleWidth + 'px',
      height: puzzleHeight + 'px'
    });
    $listContainer.css({
      left: listLeft + 'px',
      top: listTop + 'px',
      width: listWidth + 'px',
      height: listHeight + 'px'
    });

    // Resize the canvas
    var $canvas_preview = $(ID_CANVAS_PREVIEW);
    var $canvas_results = $(ID_CANVAS_RESULTS);
    $canvas_preview[0].width = puzzleWidth;
    $canvas_preview[0].height = puzzleHeight;
    $canvas_preview.css({
      left: puzzleLeft + 'px',
      top: puzzleTop + 'px'
    });
    $canvas_results[0].width = puzzleWidth;
    $canvas_results[0].height = puzzleHeight;
    $canvas_results.css({
      left: puzzleLeft + 'px',
      top: puzzleTop + 'px'
    });

    // Size the fonts
    var puzzleFontSize = smallerSize / N_LETTERS_X;
    if(N_LETTERS_X < N_LETTERS_Y) {
      puzzleFontSize = smallerSize / N_LETTERS_Y;
    }
    $puzzle.css({
      fontSize: puzzleFontSize + 'px'
    });

    // Resize the notification area
    $(ID_NOTIFY).css({
      width: puzzleWidth * NOTIFY_WIDTH_RATIO + 'px',
      height: puzzleHeight * NOTIFY_HEIGHT_RATIO + 'px',
      top: puzzleTop + puzzleHeight * 0.5 - puzzleHeight * NOTIFY_HEIGHT_RATIO * 0.5 + 'px',
      left: puzzleLeft + puzzleWidth * 0.5 - puzzleWidth * NOTIFY_WIDTH_RATIO * 0.5 + 'px',
      fontSize: puzzleWidth * NOTIFY_FONT_SIZE_RATIO + 'px'
    });

    var newPuzzleDialogW = windowSizeX * NOTIFY_WIDTH_RATIO;
    var newPuzzleDialogH = windowSizeY * NOTIFY_HEIGHT_RATIO;
    $(ID_DIALOG_NEW_PUZZLE).css({
      width: newPuzzleDialogW + 'px',
      height: newPuzzleDialogH + 'px',
      top: 0 + windowSizeY * 0.5 - newPuzzleDialogH * 0.5 + 'px',
      left: 0 + windowSizeX * 0.5 - newPuzzleDialogW * 0.5 + 'px',
      fontSize: puzzleWidth * NOTIFY_FONT_SIZE_RATIO + 'px'
    });

    var dynamicCss = '';

    // Adjust the size of the letters
    dynamicCss += '.' + CLASS_PUZZLE_LETTER + ' { ';
    dynamicCss += 'font-size:' + puzzleFontSize + 'px; ';
    dynamicCss += 'width:' + puzzleFontSize + 'px; ';
    dynamicCss += 'height:' + puzzleFontSize + 'px; ';
    dynamicCss += '}\n';
    LETTER_WIDTH = puzzleFontSize;
    LETTER_HEIGHT = puzzleFontSize;

    // Adjust the size of the word list
    var listFontSize = puzzleFontSize * LIST_FONT_SCALE;
    var listWordWidth = listFontSize * MAX_WORD_SIZE;
    if(listWidth - 2 * listFontSize < listFontSize * (MAX_WORD_SIZE)) {
      listWidth = listWidth - 2 * listFontSize;
      listFontSize = (listWidth) / MAX_WORD_SIZE;
      dynamicCss += ID_LIST + ' { ';
      dynamicCss += 'width:' + listWidth + 'px; ';
      //dynamicCss += 'font-size:' + listFontSize + 'px; ';
      dynamicCss += 'font-size:1.3em; ';
      dynamicCss += '}\n';
      dynamicCss += '.' + CLASS_WORD + ' { ';
      dynamicCss += 'float: none; ';
      dynamicCss += '}\n';
    } else {
      dynamicCss += ID_LIST + ' { ';
      dynamicCss += 'font-size:' + listFontSize + 'px; ';
      dynamicCss += 'width:' + Math.max(1, Math.floor(listWidth / listWordWidth)) * listWordWidth + 'px;'
      dynamicCss += '}\n';
      dynamicCss += '.' + CLASS_WORD + ' { ';
      dynamicCss += 'width: ' + listFontSize * (MAX_WORD_SIZE - 1) + 'px;';
      dynamicCss += '}\n';
    }

    $(ID_DYNAMIC_CSS).styleSheet(dynamicCss);

    // Adjust the positions of all of the puzzle letters:
    var x, y;
    for(x = 0; x < N_LETTERS_X; x += 1) {
      for(y = 0; y < N_LETTERS_Y; y += 1) {
        $('#' + ID_LETTER_PREFIX + x + ID_LETTER_SEP + y).css({
          left: x * puzzleFontSize,
          top: y * puzzleFontSize
        });
      }
    }

    // Redraw the circled words
    uiPuzzle.drawFinds(PUZZLE);
  }

  // -------------------------------------- [ Module: UI Feedback ] -
  var uiFeedback = (function () {

    // Tap on the notification area to turn off feedback but it will
    // be turned back on if you make several ui mistakes in a row
    var UI_IS_FEEDBACK_ENABLED = 0;
    var UI_ERROR_COUNT = 0;
    var UI_ERROR_THRESHOLD = 2;

    var self = {};
    self.askForNewPuzzle = function (force) {
      if(wspIsAllFound(PUZZLE) || force === 1) {
        $(ID_DIALOG_NEW_PUZZLE).fadeIn();
      }
    };

    self.stopNotifications = function () {
      UI_IS_FEEDBACK_ENABLED = 0;
      uiFeedback.hideNote();
    };

    // Function keeps track of user mistakes/behavior and offers
    // helps when appropriate
    self.isUserConfused = function (amount) {
      // if the user is making errors - add to the count first
      // this will allow: errors -> do this -> good job!
      // if we always added at the same spot:
      // error -> do this -> NOTHING!
      if(amount > 0) {
        UI_ERROR_COUNT += amount;
      }

      // Limit minimum/maximum error count
      if(UI_ERROR_COUNT < 0) {
        UI_ERROR_COUNT = 0;
      }
      if(UI_ERROR_COUNT > UI_ERROR_THRESHOLD * 2) {
        UI_ERROR_COUNT = UI_ERROR_THRESHOLD * 2;
      }

      // Turn the feedback on or off, depending on how the user is doing
      if(UI_ERROR_COUNT > UI_ERROR_THRESHOLD) {
        UI_IS_FEEDBACK_ENABLED = 1;
      } else {
        UI_IS_FEEDBACK_ENABLED = 0;
      }

      if(amount < 0) {
        UI_ERROR_COUNT += amount;
      }

      return UI_IS_FEEDBACK_ENABLED;
    };

    // Shows the user a message for a specific amount of time
    self.notify = function (message) {
      $(ID_NOTIFY).finish().html(message).fadeIn().delay(NOTIFICATION_DURATION).fadeOut();
    };

    // Quickly hides the current notification
    self.hideNote = function () {
      $(ID_NOTIFY).finish().fadeOut();
    };

    // Holds the notification so it does not automatically fade out
    self.keepNote = function () {
      $(ID_NOTIFY).finish().fadeIn();
    };

    return self;
  })();

  // ------------------------------ [ Module: Word List Scrolling ] -
  var uiWordList = (function ($) {
    // Variable for storing the starting scroll location
    var START_SCROLL_X = 0;
    var START_SCROLL_Y = 0;

    var self = {}

    self.scroll = function (ev) {
      // Prevent the browser's default scrolling
      //ev.gesture.preventDefault();

      // When the event starts, recording the starting scroll position
      if(ev.type === 'touch') {
        START_SCROLL_Y = $(this).clearQueue().scrollTop();
      }

      // When dragging, scroll to follow the finger
      if(ev.type === 'drag') {
        $(this).scrollTop(START_SCROLL_Y - ev.gesture.deltaY);
      }

      // When the event ends, use velocity to animate (NO WORK)
      if(ev.type === 'release') {
        $(this).animate({
          scrollTop: START_SCROLL_Y - ev.gesture.deltaY * ev.gesture.velocityY
        });
      }
    };

    // Makes and displays html for the puzzle's word list
    self.make = function (puzzle) {
      var htmlList = '';
      var words = puzzle.words;
      var i, l = words.length;
      for(i = 0; i < l; i += 1) {
        htmlList += '<div class="';
        htmlList += CLASS_WORD;
        htmlList += '" ';
        htmlList += 'id="';
        htmlList += ID_WORD_PREFIX + i;
        htmlList += '"';
        htmlList += '>';
        htmlList += words[i];
        htmlList += '</div>';
      }
      $(ID_LIST).html(htmlList);
    };

    // Draws a line throught the found words in the word list
    self.crossOut = function (puzzle) {
      var answers = puzzle.answers;
      var i, l = answers.length;
      var $word;
      for(i = 0; i < l; i += 1) {
        $word = $('#' + ID_WORD_PREFIX + i);
        if(answers[i].isFound) {
          $word.addClass(CLASS_FOUND);
        } else {
          $word.removeClass(CLASS_FOUND);
        }
      }
    };

    // When the user clicks a word in the word list, the answer is shown
    self.showAnswer = function (ev) {
      ev.gesture.preventDefault();
      if(MODE !== 'help') {
        return;
      }
      var id = this.id;
      var index = id.replace(ID_WORD_PREFIX, '');
      uiPuzzle.showAnswer(PUZZLE, parseInt(index, 10));
      TOTAL_NUMBER_OF_HINTS += 1;
      DATA.save('total-hints', TOTAL_NUMBER_OF_HINTS);
    };

    return self;
  })($);

  // ---------------------------------------- [ Module: UI Puzzle ] -

  var uiPuzzle = (function () {
    // Store the start and ending letters that a user circled
    // We will check if they are the start and end of a word
    var START_LETTER = null;
    var END_LETTER = null;

    var self = {};
    // When the user begins circling a letter, remember where they started
    self.touch = function (ev) {
      uiFeedback.hideNote();
      ev.gesture.preventDefault();
      START_LETTER = $.elementFromPoint(ev.gesture.center.pageX, ev.gesture.center.pageY);
    };

    // As the user is circling a word in the puzzle, provide feedback to
    // show where they are
    self.drag = function (ev) {

      // If they user is dragging they don't want the notification
      uiFeedback.hideNote();

      ev.gesture.preventDefault();
      END_LETTER = $.elementFromPoint(ev.gesture.center.pageX, ev.gesture.center.pageY);

      // If the user has dragged outsize the area we'll get
      // a null END_LETTER - so exit
      if(!END_LETTER) {
        return;
      }

      // Find the starting location
      var idStart = START_LETTER.id;
      var xyStart = idStart.slice(ID_LETTER_PREFIX.length, idStart.length).split(ID_LETTER_SEP);
      var xStart = parseInt(xyStart[0], 10) * LETTER_WIDTH + LETTER_WIDTH * LETTER_OFFSET_PERCENT_X;
      var yStart = parseInt(xyStart[1], 10) * LETTER_HEIGHT + LETTER_HEIGHT * LETTER_OFFSET_PERCENT_Y;

      // Find the ending location
      var idEnd = END_LETTER.id;
      var xyEnd = idEnd.slice(ID_LETTER_PREFIX.length, idEnd.length).split(ID_LETTER_SEP);
      var xEnd = parseInt(xyEnd[0], 10) * LETTER_WIDTH + LETTER_WIDTH * LETTER_OFFSET_PERCENT_X;
      var yEnd = parseInt(xyEnd[1], 10) * LETTER_HEIGHT + LETTER_HEIGHT * LETTER_OFFSET_PERCENT_Y;

      // Draw the preview of their circle
      var $previewCanvas = $(ID_CANVAS_PREVIEW);
      var ctx = $previewCanvas[0].getContext('2d');
      ctx.clearRect(0, 0, $previewCanvas[0].width, $previewCanvas[0].height);
      uiPuzzle.drawCircle(ctx, xStart, yStart, xEnd, yEnd, LETTER_WIDTH, '#000');
    };

    // When the user finishes circling a letter in the puzzle we need
    // to check if they found a word
    self.release = function (ev) {
      ev.gesture.preventDefault();
      END_LETTER = $.elementFromPoint(ev.gesture.center.pageX, ev.gesture.center.pageY);

      // If the user has dragged outsize the area we'll get
      // a null END_LETTER - so exit
      if(!END_LETTER) {
        return;
      }

      // Find the starting location
      var idStart = START_LETTER.id;
      var xyStart = idStart.slice(ID_LETTER_PREFIX.length, idStart.length).split(ID_LETTER_SEP);
      var xStart = parseInt(xyStart[0], 10);
      var yStart = parseInt(xyStart[1], 10);

      // Find the ending location
      var idEnd = END_LETTER.id;
      var xyEnd = idEnd.slice(ID_LETTER_PREFIX.length, idEnd.length).split(ID_LETTER_SEP);
      var xEnd = parseInt(xyEnd[0], 10);
      var yEnd = parseInt(xyEnd[1], 10);

      // Did they find something?
      wspCheckFoundWord(PUZZLE, xStart, yStart, xEnd, yEnd);

      START_LETTER = null;
      END_LETTER = null;
    };

    // Makes and displays html for the puzzle's grid
    self.make = function (puzzle) {
      var htmlPuzzle = '';
      var x, w = puzzle.width;
      var y, h = puzzle.height;
      for(x = 0; x < w; x += 1) {
        for(y = 0; y < h; y += 1) {
          htmlPuzzle += '<div class="';
          htmlPuzzle += CLASS_PUZZLE_LETTER;
          htmlPuzzle += '" id="';
          htmlPuzzle += ID_LETTER_PREFIX;
          htmlPuzzle += x;
          htmlPuzzle += ID_LETTER_SEP;
          htmlPuzzle += y;
          htmlPuzzle += '">';
          htmlPuzzle += puzzle.grid[y * puzzle.width + x].letter;
          htmlPuzzle += '</div>';
        }
      }
      $(ID_PUZZLE).html(htmlPuzzle);
    };

    // Draws a circle on `ctx` starting at `xs,ys` and ending at `xe,ye`
    // of width `w` and of color `c`. These coordinates are based on the
    // index of the letters in the puzzle grid (not absolute canvas coordinates)
    // ie uiPuzzle.drawCircleIndex(ctx, 1, 2, 8, 4, 24, '#F00')
    self.drawCircleIndex = function (ctx, xs, ys, xe, ye, w, c) {
      var xStart = xs * LETTER_WIDTH + LETTER_WIDTH * LETTER_OFFSET_PERCENT_X;
      var yStart = ys * LETTER_HEIGHT + LETTER_HEIGHT * LETTER_OFFSET_PERCENT_Y;
      var xEnd = xe * LETTER_WIDTH + LETTER_WIDTH * LETTER_OFFSET_PERCENT_X;
      var yEnd = ye * LETTER_HEIGHT + LETTER_HEIGHT * LETTER_OFFSET_PERCENT_Y;
      self.drawCircle(ctx, xStart, yStart, xEnd, yEnd, w, c);
    };

    // Draws a circle on `ctx` starting at `xs,ys` and ending at `xe,ye`
    // of width `w` and of color `c`.
    // ie uiPuzzle.drawCircle(ctx, 16, 32, 128, 64, 24, 'red')
    self.drawCircle = function (ctx, xs, ys, xe, ye, w, c) {

      // compute the 'angle' the line is going
      var dx = xe - xs;
      var dy = ye - ys;
      var lineDir = Math.atan2(dy, dx);

      // add 90 to get a perpendicular line
      var perpStart = lineDir + Math.PI / 2;
      var perpEnd = perpStart + Math.PI;

      // the 'radius' will be some fraction of the parameter w
      var r = w / 3;

      // setup canvas parameters
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = c;
      ctx.fillStyle = c;
      ctx.globalAlpha = CIRCLE_ALPHA;

      // Draw the middle rectangle
      ctx.beginPath();
      if(CIRCLE_FILL) {
        ctx.moveTo(xs + r * Math.cos(perpStart), ys + r * Math.sin(perpStart));
        ctx.lineTo(xe + r * Math.cos(perpStart), ye + r * Math.sin(perpStart));
        ctx.lineTo(xe + r * Math.cos(perpEnd), ye + r * Math.sin(perpEnd));
        ctx.lineTo(xs + r * Math.cos(perpEnd), ys + r * Math.sin(perpEnd));
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.moveTo(xs + r * Math.cos(perpStart), ys + r * Math.sin(perpStart));
        ctx.lineTo(xe + r * Math.cos(perpStart), ye + r * Math.sin(perpStart));
        ctx.moveTo(xs + r * Math.cos(perpEnd), ys + r * Math.sin(perpEnd));
        ctx.lineTo(xe + r * Math.cos(perpEnd), ye + r * Math.sin(perpEnd));
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(xs, ys, r, perpStart, perpEnd, 0);
      if(CIRCLE_FILL) {
        ctx.fill();
      } else {
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(xe, ye, r, perpStart, perpEnd, 1);
      if(CIRCLE_FILL) {
        ctx.fill();
      } else {
        ctx.stroke();
      }

      return;
    };

    // Draws the circles around words the user has circled in the puzzle
    self.drawFinds = function (puzzle) {
      var $resultCanvas = $(ID_CANVAS_RESULTS);
      var ctx = $resultCanvas[0].getContext('2d');
      ctx.clearRect(0, 0, $resultCanvas[0].width, $resultCanvas[0].height);
      var answers = puzzle.answers;
      var i, answer, l = answers.length;
      var delta;
      for(i = 0; i < l; i += 1) {
        answer = answers[i];
        if(answer.isFound) {
          delta = wspDeltaFromDir(answer.dir);
          uiPuzzle.drawCircleIndex(ctx, answer.x, answer.y, answer.x + (answer.word.length - 1) * delta.x, answer.y + (answer.word.length - 1) * delta.y, LETTER_WIDTH, COLORS[i % COLORS.length]);
        }
      }
    };

    // Draws a circle around the `index`th word 
    self.showAnswer = function(puzzle, index) {
      var answer = puzzle.answers[index];
      var xStart = answer.x;
      var yStart = answer.y;
      var l = answer.word.length - 1;
      var delta = wspDeltaFromDir(answer.dir);
      var ctx = $(ID_CANVAS_PREVIEW)[0].getContext('2d');
      uiPuzzle.drawCircleIndex(ctx, xStart, yStart, xStart + l * delta.x, yStart + l * delta.y, LETTER_WIDTH * 1.5, 'black');
    };

    return self;
  })();

  // --------------------------------------- [ Section: Word Search Puzzle  ] -

  // Returns the direction index based on the delta x and y (`dx,dy`)
  // `dx` and `dy` must be 0,1, or -1
  function wspDirFromDeltas(dx, dy) {
    var dir = 128;
    if(dx ===  1 && dy ===  0) {dir = 128;}
    if(dx ===  1 && dy === -1) {dir = 1;}
    if(dx ===  0 && dy === -1) {dir = 2;}
    if(dx === -1 && dy === -1) {dir = 4;}
    if(dx === -1 && dy ===  0) {dir = 8;}
    if(dx === -1 && dy ===  1) {dir = 16;}
    if(dx ===  0 && dy ===  1) {dir = 32;}
    if(dx ===  1 && dy ===  1) {dir = 64;}
    return dir;
  }

  // Returns an object `{x:x,y:y}` that represents the change in x and y
  // based on the `dir` index
  function wspDeltaFromDir(dir) {
    switch(dir) {
      case 128: return { x:  1, y:  0 }; // to the right
      case 1:   return { x:  1, y: -1 }; // right & up
      case 2:   return { x:  0, y: -1 }; // up
      case 4:   return { x: -1, y: -1 }; // left & up
      case 8:   return { x: -1, y:  0 }; // left
      case 16:  return { x: -1, y:  1 }; // left & down
      case 32:  return { x:  0, y:  1 }; // down
      case 64:  return { x:  1, y:  1 }; // down & right
      default:  return { x:  0, y:  0 }; // NO!
    }
  }

  // Returns a word object if `word` can be added to `puzzle` at `xStart,yStart`
  // going `dir`. If `write` is 1 the word will be written to the puzzle, if `write`
  // is 0 then the puzzle will not be updated.
  function wspCheckLocation(word, puzzle, xStart, yStart, dir, write) {
    var width = puzzle.width;
    var height = puzzle.height;
    var l = word.length;
    var d = wspDeltaFromDir(dir);
    var dx = d.x,
      dy = d.y;

    // Make sure the word fits within the bounds of the puzzle
    if(xStart + l * dx > width) {
      return null;
    }
    if(xStart + l * dx < 0) {
      return null;
    }
    if(yStart + l * dy > height) {
      return null;
    }
    if(yStart + l * dy < 0) {
      return null;
    }

    // Check if each character can go in each spot
    var x = xStart;
    var y = yStart;
    var i, spot;
    for(i = 0; i < l; i++) {
      spot = puzzle.grid[y * width + x];

      // If the letter has been decided already and the characters
      // do not match then the word cannot go here
      if(spot.set !== 0 && spot.letter !== word.charAt(i)) {
        return null;
      }

      // Write the word if told to
      if(write === 1) {
        // Note: spot.set|dir -> this is because multiple letters will be 
        // placed at this spot so we want to record all directions
        puzzle.grid[y * width + x] = {
          x: x,
          y: y,
          set: (spot.set | dir),
          letter: word.charAt(i)
        };
      }
      x += dx;
      y += dy;
    }
    return {
      word: word,
      x: xStart,
      y: yStart,
      dir: dir,
      isFound: 0
    };
  }

  // Tries to add `word` to `puzzle` in one of the `allowedDirections`.
  // Returns a object representing where the word was added on success,
  // on failure returns null.
  function wspPuzzleAddWord(word, puzzle, allowedDirections) {
    // Loop throught every possible place that the word may go
    // Generate a list of all of the valid spots and directions
    var dirs = [128, 1, 2, 4, 8, 16, 32, 64];
    var locations = [];
    var width = puzzle.width;
    var height = puzzle.height;
    var i, j, k, placed, score = 0;
    for(i = 0; i < width; i += 1) {
      for(j = 0; j < height; j += 1) {
        for(k = 0; k < 8; k++) {
          if((allowedDirections & dirs[k]) === dirs[k]) {
            placed = wspCheckLocation(word, puzzle, i, j, dirs[k], 0);
            if(placed !== null) {
              score += 1;
              locations[locations.length] = {
                x: i,
                y: j,
                d: dirs[k]
              };
            }
          }
        }
      }
    }
    //console.info(word+' has '+locations.length+' possible positions');

    // remove any locations that are filled already
    // (don't the word in the same spot twice)
    var answer, answers = puzzle.answers;
    var al = answers.length;
    var location;
    for(i = 0; i < al; i += 1) {
      answer = answers[i];
      j = locations.length;
      while(j--) {
        location = locations[j];
        if(location.x === answer.x && location.y === answer.y && location.d === answer.dir) {
          locations.splice(j, 1);
        }
      }
    }

    // if we haven't found a spot for the word exit
    if(locations.length === 0) {
      return null;
    }

    // locations has all of the possible locations that the word can fit
    // pick a random location & put the word there
    var place = Math.round(RANDOM.random() * (locations.length - 1));
    //console.info("Using the "+place+"th location");

    // write the word to the spot
    var loc = locations[place];
    return wspCheckLocation(word, puzzle, loc.x, loc.y, loc.d, 1);
  }

  // Creates and returns a new puzzle object.
  function wspCreatePuzzle(arrayOfWords, width, height, allowedDirections, maxWords, getNextWord) {

    var puzzle = {
      grid: [],
      words: [],
      answers: [],
      finds: [],
      width: width,
      height: height
    };
    var i, j;

    // Initialize the puzzle array to blank values.
    for(i = 0; i < height; i += 1) {
      for(j = 0; j < width; j += 1) {
        puzzle.grid[i * width + j] = {
          x: j,
          y: i,
          set: 0,
          letter: '-'
        };
      }
    }

    // Add words to puzzle.
    var wordsAdded = 0;
    var wordCnt = Math.min(arrayOfWords.length,999);
    var answer, word;
    for(i = 0; i < wordCnt; i++) {
      word = getNextWord(arrayOfWords,i);
      if(word === '') {
        continue;
      }
      // If we add a word to the puzzle
      answer = wspPuzzleAddWord(word, puzzle, allowedDirections);
      if(answer !== null) {
        //console.info(answer);

        // Remember the word that it added.
        puzzle.words[puzzle.words.length] = word;
        puzzle.answers[puzzle.answers.length] = answer;

        // Make sure we don't add too many words.
        wordsAdded += 1;
        if(wordsAdded >= maxWords) {
          i = wordCnt;
        }
      }
    }

    // Let's alphabetize the word list and the corresponding answers
    puzzle.words.sort(function (a, b) {
      return a.localeCompare(b);
    });
    puzzle.answers.sort(function (a, b) {
      return a.word.localeCompare(b.word);
    });

    // Add random letters to the blank spots in the puzzle
    var letters = arrayOfWords.join('');
    var c, l = letters.length;
    for(i = 0; i < height; i += 1) {
      for(j = 0; j < width; j += 1) {
        c = puzzle.grid[i * width + j];
        if(!c.set) {
          c.letter = letters.charAt(Math.floor(l * RANDOM.random()));
        }
        // = {x:j, y:i, set:0, letter: '-'};
      }
    }

    // Return the puzzle object.
    return puzzle;
  }

  // Marks `word` as being found in the puzzle.
  // Returns 0 if the word wasn't found before, 1 if it was
  function wspAddFoundWord(puzzle, word) {
    // only add words that have not be found previously
    var answers = puzzle.answers;
    var i, answer, l = answers.length;
    for(i = 0; i < l; i += 1) {
      answer = answers[i];
      if(answer.x === word.x && answer.y === word.y && answer.dir === word.dir && answer.word === word.word && answer.isFound === 0) {
        answer.isFound = 1;
        return 0;
      }
    }
    return 1;
  }

  // Returns 1 if all the words in the puzzle were found, 0 otherwise
  function wspIsAllFound(puzzle) {
    var answers = puzzle.answers;
    var i, l = answers.length;
    for(i = 0; i < l; i += 1) {
      if(!answers[i].isFound) {
        return 0;
      }
    }
    return 1;
  }

  // Checks if the letters from `(xStart,yStart)` to `(xEnd,yEnd)` are
  // a word in the puzzle. Notifies the user of success/failure.
  function wspCheckFoundWord(puzzle, xStart, yStart, xEnd, yEnd) {

    // compute delta x and delta y
    var dx = xEnd - xStart;
    var dy = yEnd - yStart;

    // what are the signs? and direction
    var dxSign = (dx === 0) ? 0 : (dx < 0) ? -1 : 1;
    var dySign = (dy === 0) ? 0 : (dy < 0) ? -1 : 1;
    var dir = wspDirFromDeltas(dxSign, dySign);

    // if we haven't moved
    if(dx === 0 && dy === 0) {
      if(uiFeedback.isUserConfused(1)) {
        uiFeedback.notify(FEEDBACK_UIFAIL + FEEDBACK_NO_MOVE);
      }
      return 0;
    }

    // if we're going diagonally
    if(dx !== 0 && dy !== 0) {
      // ensure the slope is 45*
      if(Math.abs(dx) !== Math.abs(dy)) {
        if(uiFeedback.isUserConfused(1)) {
          uiFeedback.notify(FEEDBACK_UIFAIL + FEEDBACK_DIAGONAL);
        }
        return 0;
      }
    }

    // Get the word
    var w = puzzle.width;
    var h = puzzle.height;
    var x = xStart - dxSign;
    var y = yStart - dySign;
    var word = '';
    while(x !== xEnd || y !== yEnd) {
      x += dxSign;
      y += dySign;
      word += puzzle.grid[y * w + x].letter;
    }

    // See if what the user highlighted is an answer
    var answers = puzzle.answers;
    var i, answer, l = answers.length;
    var isFound = 0;
    for(i = 0; i < l; i += 1) {
      answer = answers[i];
      if(answer.word === word) {
        isFound = 1;
        break;
      }
    }

    // Keep track of what was found and
    // inform the user of what they have done
    var wasFound;
    if(isFound) {
      wasFound = wspAddFoundWord(puzzle, {
        word: word,
        x: xStart,
        y: yStart,
        dir: dir
      });
      if(wspIsAllFound(puzzle)) {
        uiFeedback.notify(FEEDBACK_FINISHED + FEEDBACK_PUZZLE_FINISHED);
        setTimeout(function () {
          uiFeedback.askForNewPuzzle();
        }, 400 + NOTIFICATION_DURATION + 400);

        // Keep track of how many puzzles the user has solved
        if(!IS_PUZZLE_COUNTED) {
          TOTAL_NUMBER_OF_PUZZLES += 1;
          DATA.save('total-puzzles-solved', TOTAL_NUMBER_OF_PUZZLES);
          IS_PUZZLE_COUNTED = 1;
        }

      } else {
        if(wasFound) {
          if(uiFeedback.isUserConfused(1)) {
            uiFeedback.notify(FEEDBACK_REPEAT + ' ' + FEEDBACK_WORD_FOUND + '"' + word + '"' + FEEDBACK_AGAIN);
          }
        } else {
          if(uiFeedback.isUserConfused(-1)) {
            uiFeedback.notify(FEEDBACK_FOUND1 + FEEDBACK_WORD_FOUND + word);
          }
          // Keep track of how many words the user has found
          TOTAL_NUMBER_OF_WORDS_FOUND += 1;
          DATA.save('total-words-found', TOTAL_NUMBER_OF_WORDS_FOUND);
        }
      }
    } else {
      if(uiFeedback.isUserConfused(1)) {
        uiFeedback.notify(FEEDBACK_FAIL + ' "' + word + '"' + FEEDBACK_NOT_ON_LIST);
      }
    }

    // Update the UI
    uiPuzzle.drawFinds(puzzle);
    uiWordList.crossOut(puzzle);

  }

  // ----------------------------------------------- [ Section: Url Options ] -

  function nextWord(list){
    // note changing i here doesn't do anything
    switch( ORDER ){
      case "forward":
        WORD_INDEX += 1;
        break;
      case "backward":
        WORD_INDEX -= 1;
        break;
      case "random":
        WORD_INDEX = Math.floor(RANDOM.random() * list.length);
        break;
      case "shuffle":
        WORD_INDEX += 1;
        break;
    }
    if (WORD_INDEX >= list.length) {
      WORD_INDEX = 0;
    }
    if (WORD_INDEX < 0) {
      WORD_INDEX = list.length - 1;
    }
    return list[WORD_INDEX];
  }

  function uiNewPuzzle() {
    IS_PUZZLE_COUNTED = 0;
    // PUZZLE = wspCreatePuzzle("hello are are are how are you doing today".split(' '), 8, 8, 1 | 2 | 4 | 8 | 16 | 32 | 64 | 128, 10);
    PUZZLE_SEED = RANDOM.getCurrent();
    PUZZLE_INDEX = WORD_INDEX;
    PUZZLE = wspCreatePuzzle(WORD_LIST, WIDTH, HEIGHT, DIRECTIONS, MAX, nextWord);
    uiPuzzle.make(PUZZLE);
    uiWordList.make(PUZZLE);
    uiResize();
  }

  // If the user causes a vertical scroll - notifications and
  // dialog boxes become fully transparent but block other actions
  // Preventing scrolling by registering this on the
  // touchmove event seems to prevent the bug
  function uiIPhoneBugFix(ev) {
    ev.preventDefault();
  }

  // This starts the game once the word list is loaded
  function onWordListLoad(data) {
    // Clean and store the word list
    WORD_LIST = data.replace(/["<>(){}\[\]#@&]/g, '').replace(/,/g, ' ').replace(/%20/g, ' ').replace(/\+/g, ' ').split(/ +/g);

    if( ORDER === 'shuffle' ){
      RANDOM.shuffle(WORD_LIST);
    }

    // Make a new puzzle
    uiNewPuzzle();

    // Setup the ui events
    $(window).hammer()
      .on('swipe', uiFeedback.askForNewPuzzle)
      .on('resize', uiResize)
      .on('touchmove', uiIPhoneBugFix)
      .trigger('resize');
    $(ID_LIST_CONTAINER).hammer()
      .on('touch drag', uiWordList.scroll);
    $(ID_LIST).hammer()
      .on('tap', 'div', uiWordList.showAnswer);
    $(ID_PUZZLE).hammer()
      .on('touch', uiPuzzle.touch)
      .on('drag', uiPuzzle.drag)
      .on('release', uiPuzzle.release);
    $(ID_NOTIFY).hammer()
      .on('tap drag', uiFeedback.stopNotifications)
      .on('hold', uiFeedback.keepNote);
    $(ID_BUTTON_EXIT).hammer().on('tap', uiExit);
    $(ID_BUTTON_HIDE).hammer().on('tap', uiHideMarks);
    $(ID_BUTTON_NEW).hammer().on('tap', function () {
      uiFeedback.askForNewPuzzle(1);
    });
    $(ID_BUTTON_NO_PUZZLE).hammer().on('tap', function () {
      $(ID_DIALOG_NEW_PUZZLE).finish().fadeOut();
    });
    $(ID_BUTTON_NEW_PUZZLE).hammer().on('tap', function () {
      $(ID_DIALOG_NEW_PUZZLE).finish().fadeOut();
      uiNewPuzzle();
    });
  }

  var options = getUrlParmString();
  if( options === '' ){
    if(DATA.loadValid('use-custom-url', 0, DATA.int10) === 1) {
      options = DATA.load('url-parm-string', options);
    }
  }
  var gUrlParms = parseUrlParmString(options);

  // URL PARAMETERS:
  // WORDS: a comma seperated list of words
  // WIDTH: the width of the puzzle in number of characters
  // HEIGHT: the height of the puzzle in number of characters
  // MAX: the maximum number of words to show
  // SEED: an integer that will seed the random number generation
  // MODE: the method that the game should be run in
  //      game - does not show answers when a word from the list is clicked
  //      help - shows the answer when a word from the list is clicked
  // DIRS: a comma speerated list of allowed word directions
  //   By default all directions are allowed, for 'regular' left to right
  //   reading just enable 'E' east, 'W' west is 'backwards', 
  //   ALL, N, S, E, W, NE, NW, SE, SW
  // LIST: a special word list to load

  var WORD_LIST = null;
  var WORD_INDEX = 0;
  var WIDTH = 8;
  var HEIGHT = 8;
  var MAX = WIDTH * HEIGHT;
  var SEED = RANDOM.getSeed();
  var MODE = 'question';
  var DIRECTIONS = 128 | 1 | 2 | 4 | 8 | 16 | 32 | 64;
  var ORDER = 'random';

  // Have to wait until 'onload' for excanvas (ie<9 compatibility)
  $(document).ready(function () {

    // Try to load URL parameters.
    if(gUrlParms !== null) {
      if(gUrlParms.index){
        WORD_INDEX = Math.abs(parseInt(gUrlParms.index, 10));
      }
      if(gUrlParms.width) {
        WIDTH = parseInt(gUrlParms.width, 10);
        if(WIDTH < 5) {
          WIDTH = 5;
        }
        N_LETTERS_X = WIDTH;
      }
      if(gUrlParms.height) {
        HEIGHT = parseInt(gUrlParms.height, 10);
        if(HEIGHT < 5) {
          HEIGHT = 5;
        }
        N_LETTERS_Y = HEIGHT;
      }
      if(gUrlParms.max) {
        MAX = parseInt(gUrlParms.max, 10);
      } else {
        MAX = WIDTH * HEIGHT;
      }
      if(gUrlParms.seed) {
        SEED = parseInt(gUrlParms.seed, 10);
        RANDOM.setSeed(SEED);
      }
      if (gUrlParms.order) {
        ORDER = gUrlParms.order;
      }
      if(gUrlParms.mode) {
        var mode = gUrlParms.mode.toLowerCase();
        if(mode === 'questions' || mode === 'question' || mode === 'game' || mode === 'search' || mode === 'find' || mode === 'puzzle') {
          MODE = 'find';
        }
        if(mode === 'answer' || mode === 'answers' || mode === 'solution' || mode === 'solutions' || mode === 'found' || mode === 'done' || mode === 'help' || mode === 'hint') {
          MODE = 'help';
        }
      }
      if(gUrlParms.dirs) {
        var caps = gUrlParms.dirs.toUpperCase();
        var dirNum = 0;
        var i, iDir, dirs, nDirs;
        if(caps.indexOf('ALL') > -1) {
          dirNum = 128 | 1 | 2 | 4 | 8 | 16 | 32 | 64;
        } else {
          dirs = caps.split('+');
          nDirs = dirs.length;
          dirNum = 0;
          for(i = 0; i < nDirs; i += 1) {
            iDir = dirs[i];
            if(iDir === 'E') {
              dirNum |= 128;
            } else if(iDir === 'NE' || iDir === 'EN') {
              dirNum |= 1;
            } else if(iDir === 'N') {
              dirNum |= 2;
            } else if(iDir === 'NW' || iDir === 'WN') {
              dirNum |= 4;
            } else if(iDir === 'W') {
              dirNum |= 8;
            } else if(iDir === 'SW' || iDir === 'WS') {
              dirNum |= 16;
            } else if(iDir === 'S') {
              dirNum |= 32;
            } else if(iDir === 'SE' || iDir === 'ES') {
              dirNum |= 64;
            }
          }
        }
        DIRECTIONS = dirNum;
      }
    }

    // Only use the supplied words if the word list is set to custom
    var isLoadWords = gUrlParms && gUrlParms.words;
    var isLoadList = gUrlParms && gUrlParms.list && gUrlParms.list !== 'custom';
    if( isLoadWords && ! isLoadList ) {
      // Manually start with the words provided
      onWordListLoad(gUrlParms.words);
    } else {
      var list = 'quick';
      if(gUrlParms && gUrlParms.list) {
        if(gUrlParms.list === "english") {
          list = "english";
        }
        if(gUrlParms.list === "crossword") {
          list = "crossword";
        }
        if(gUrlParms.list === "names_male") {
          list = "names_male";
        }
        if(gUrlParms.list === "names_female") {
          list = "names_female";
        }
        if(gUrlParms.list === "misspell") {
          list = "misspell";
        }
        if(gUrlParms.list === "places") {
          list = "places";
        }
        if(gUrlParms.list === "constitution") {
          list = "constitution";
        }
      }
      // Load the list of words via get request (AJAX)
      $.get('../resources/word-lists/' + list, onWordListLoad);
    }

  }); // document.is.ready!
})();
