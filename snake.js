(function($, Bacon) {
  var GRID_WIDTH = 21
  var GRID_HEIGHT = 21
  var CELL_SIZE = 10
  var STARTING_POSITION = [10, 10]
  var STARTING_SIZE = 5

  var LEFT = [-1, 0]
  var UP = [0, -1]
  var RIGHT = [1, 0]
  var DOWN = [0, 1]
  var DIRECTION_NONE = [0, 0]

  var add = function(a,b) { return a+b }
  var vectorEquals = function(a,b) { return a[0] === b[0] && a[1] === b[1] }
  var gameEnd = new Bacon.Bus()
  var insideGrid = function(pos) {
    return pos[0] >= 0 && pos[0] < GRID_WIDTH && pos[1] >= 0 && pos[1] < GRID_HEIGHT
  }
  var vectorAdd = function(a, b) {
    return [a[0] + b[0], a[1] + b[1]]
  }
  var coordToPx = function(i) { return (i * CELL_SIZE) + "px" }
  var append = function(parent, child) { return parent.append(child) }
  var createPiece = function(color) {
    return $('<div>').css({
      position: "absolute",
      background: color,
      width: coordToPx(1),
      height: coordToPx(1)
    })
  }
  var $head = createPiece('green')
  var $apple = createPiece('red')
  var createTailPiece = function() { return createPiece('green').addClass('tail') }
  var randomPosition = function() {
    return [Math.floor(Math.random() * GRID_WIDTH), Math.floor(Math.random() * GRID_HEIGHT)]
  }
  var setPosition = function(element) {
    return function(pos) {
      element.css({
        left: coordToPx(pos[0]),
        top: coordToPx(pos[1])
      })
    }
  }
  var equals = function(x) { return function(y) { return x === y }}
  var ticks = Bacon.interval(150).takeUntil(gameEnd)
  var tickCounter = ticks.map(1).scan(0, add)
  var $counter = $('#counter')
  var keyPresses = $(document).asEventStream('keydown').map('.keyCode')
  var isArrowKey = function(x) { return x >= 37 && x <= 40 }
  var directionIntentions = keyPresses.filter(isArrowKey).decode({
    37: LEFT,
    38: UP,
    39: RIGHT,
    40: DOWN
  })
  var changeDirectionIfLegal = function(old, intent) {
    var going = function(vec) { return vectorEquals(old, vec) }
    var intends = function(vec) { return vectorEquals(intent, vec) }
    if (going(DIRECTION_NONE)) {
      return intent
    } else if (going(LEFT) || going(RIGHT)) {
      return intends(UP) || intends(DOWN) ? intent : old
    } else {
      return intends(LEFT) || intends(RIGHT) ? intent : old
    }
  }
  var direction = directionIntentions.scan(DIRECTION_NONE, changeDirectionIfLegal)
  var headPosition = direction.sampledBy(ticks).scan(STARTING_POSITION, vectorAdd)
  var headOutsideGrid = headPosition.filter(function(pos) { return !insideGrid(pos) })
  var applePosition = new Bacon.Bus()
  var appleEaten = headPosition.combine(applePosition, vectorEquals).filter(equals(true))
  var tailSize = appleEaten.scan(STARTING_SIZE, function(x) { return x + 1 })
  appleEaten.onValue(function() { applePosition.push(randomPosition()) })
  var tail = headPosition.scan([], function(memo, pos) { return memo.concat([pos]) }).combine(tailSize, function(headHistory, tailSize) {
    return _(headHistory).chain().last(tailSize).initial().value()
  })
  var headCollidesWithTail = function(headPos, direction, tail) {
    var isMoving = !vectorEquals(direction, DIRECTION_NONE)
    return isMoving && _(tail).any(function(tailPos) { return vectorEquals(tailPos, headPos) })
  }
  var tailCollision = Bacon.combineWith(headCollidesWithTail, headPosition, direction, tail).sampledBy(headPosition).filter(equals(true))
  tailCollision.onValue(function() {
    gameEnd.push(true)
  })
  headOutsideGrid.onValue(function() {
    gameEnd.push(true)
  })
  gameEnd.onValue(function() {
    $('#grid').empty()
  })
  $('#grid').css({
    "position": "relative",
    "width": coordToPx(GRID_WIDTH),
    "height": coordToPx(GRID_HEIGHT),
    "border": "1px solid black"
  }).append($head, $apple)
  var applesEaten = appleEaten.scan(0, function(x) { return x + 1 })
  applesEaten.assign($counter, 'text')
  headPosition.onValue(setPosition($head))
  applePosition.onValue(setPosition($apple))
  applePosition.push(randomPosition())
  var tailPieces = tailSize.map(function(size) {
    return _(size).chain().range().map(createTailPiece).value()
  })
  Bacon.combineTemplate({ tail: tail, pieces: tailPieces }).onValue(function(data) {
    $('#grid .tail').remove()
    _(data.tail).each(function(pos, index) {
      var piece = data.pieces[index]
      $('#grid').append(piece)
      setPosition(piece)(pos)
    })
  })
})(jQuery, Bacon)