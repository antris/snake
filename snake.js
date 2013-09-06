(function($, Bacon) {
  var GRID_WIDTH = 11
  var GRID_HEIGHT = 11
  var CELL_SIZE = 10
  var keysAsDirections = {
    37: [-1, 0],
    38: [0, -1],
    39: [1, 0],
    40: [0, 1]
  }
  var add = function(a,b) { return a+b }
  var second = function(a,b) { return b }
  var positionEquals = function(a,b) { return a[0] === b[0] && a[1] === b[1] }
  var gameEnd = new Bacon.Bus()
  var insideGrid = function(pos) {
    return pos[0] >= 0 && pos[0] < GRID_WIDTH && pos[1] >= 0 && pos[1] < GRID_HEIGHT
  }
  var incrementDirection = function(pos, direction) {
    var newPos = [pos[0] + direction[0], pos[1] + direction[1]]
    if (!insideGrid(newPos)) gameEnd.push(true)
    return newPos
  }
  var coordToPx = function(i) { return (i * CELL_SIZE) + "px" }
  var append = function(parent, child) { return parent.append(child) }
  var $head = $('<div>').css({
    "position": "absolute",
    "background": "green",
    "width": coordToPx(1),
    "height": coordToPx(1)
  })
  var $apple = $('<div>').css({
    "position": "absolute",
    "background": "red",
    "width": coordToPx(1),
    "height": coordToPx(1)
  })
  var createTailPiece = function() {
    return $('<div>').addClass('tail').css({
      "position": "absolute",
      "background": "green",
      "width": coordToPx(1),
      "height": coordToPx(1)
    })
  }
  var randomPosition = function() {
    return [Math.floor(Math.random() * GRID_WIDTH), Math.floor(Math.random() * GRID_HEIGHT)]
  }
  var equals = function(x) { return function(y) { return x === y }}
  var ticks = Bacon.interval(150).takeUntil(gameEnd)
  var tickCounter = ticks.map(1).scan(0, add)
  var $counter = $('#counter')
  var keyPresses = $(document).asEventStream('keydown').map('.keyCode')
  var isArrowKey = function(x) { return x >= 37 && x <= 40 }
  var directionChanges = keyPresses.filter(isArrowKey).decode(keysAsDirections)
  var direction = directionChanges.scan([0, 0], second)
  var headPosition = direction.sampledBy(ticks).scan([5, 5], incrementDirection)
  var applePosition = new Bacon.Bus()
  var appleEaten = headPosition.combine(applePosition, positionEquals).filter(equals(true))
  var tailSize = appleEaten.scan(1, function(x) { return x + 1 })
  appleEaten.onValue(function() { applePosition.push(randomPosition()) })
  var tail = headPosition.scan([], function(memo, pos) { return memo.concat([pos]) }).combine(tailSize, function(headPosition, tailSize) {
    return _(headPosition).last(tailSize)
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
  tickCounter.assign($counter, 'text')
  headPosition.onValue(function(pos) { $head.css({ "left": coordToPx(pos[0]), "top": coordToPx(pos[1]) }) })
  applePosition.onValue(function(pos) { $apple.css({ "left": coordToPx(pos[0]), "top": coordToPx(pos[1]) }) })
  applePosition.push(randomPosition())
  var tailPieces = tailSize.map(function(size) {
    return _(size).chain().range().map(createTailPiece).value()
  })
  Bacon.combineTemplate({ tail: tail, pieces: tailPieces }).onValue(function(data) {
    $('#grid .tail').remove()
    _(data.tail).each(function(pos, index) {
      var piece = data.pieces[index]
      $('#grid').append(piece)
      piece.css({
        left: coordToPx(pos[0]),
        top: coordToPx(pos[1])
      })
    })
  })
})(jQuery, Bacon)