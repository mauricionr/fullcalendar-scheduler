(function($) {


$.simulateByPoint = function(type, options) {
	var docEl = $(document);
	var point = options.point;
	var clientX, clientY;
	var node;

	if (point) {
		clientX = point.left - docEl.scrollLeft();
		clientY = point.top - docEl.scrollTop();
		node = document.elementFromPoint(clientX, clientY);
		$(node).simulate(type, options);
	}
};


var DEBUG_DELAY = 500;
var DEBUG_MIN_DURATION = 2000;
var DEBUG_MIN_MOVES = 100;
var DRAG_DEFAULTS = {
	point: null, // the start point
	localPoint: { left: '50%', top: '50%' },
	end: null, // can be a point or an el
	localEndPoint: { left: '50%', top: '50%' },
	dx: 0,
	dy: 0,
	moves: 5,
	duration: 100 // ms
};


$.simulate.prototype.simulateDrag = function() {
	var targetNode = this.target;
	var targetEl = $(targetNode);
	var options = $.extend({}, DRAG_DEFAULTS, this.options);
	var dx = options.dx;
	var dy = options.dy;
	var duration = options.duration;
	var moves = options.moves;
	var debug = Boolean(options.debug);
	var startPoint;
	var endEl;
	var endPoint;
	var localPoint;
	var offset;

	// compute start point
	if (options.point) {
		startPoint = options.point;
	}
	else {
		localPoint = normalizeElPoint(options.localPoint, targetEl);
		offset = targetEl.offset();
		startPoint = {
			left: offset.left + localPoint.left,
			top: offset.top + localPoint.top
		};
	}

	// compute end point
	if (options.end) {
		if (isPoint(options.end)) {
			endPoint = options.end;
		}
		else { // assume options.end is an element
			endEl = $(options.end);
			localPoint = normalizeElPoint(options.localEndPoint, endEl);
			offset = endEl.offset();
			endPoint = {
				left: offset.left + localPoint.left,
				top: offset.top + localPoint.top
			};
		}
	}

	if (endPoint) {
		dx = endPoint.left - startPoint.left;
		dy = endPoint.top - startPoint.top;
	}

	moves = Math.max(moves, debug ? DEBUG_MIN_MOVES : 1);
	duration = Math.max(duration, debug ? DEBUG_MIN_DURATION : 10);

	simulateDrag(
		this,
		targetNode,
		startPoint,
		dx,
		dy,
		moves,
		duration,
		options.callback || function() {},
		debug
	);
};


function simulateDrag(self, targetNode, startPoint, dx, dy, moveCnt, duration, callback, debug) {
	var docNode = targetNode.ownerDocument;
	var docEl = $(docNode);
	var waitTime = duration / moveCnt;
	var moveIndex = 0;
	var clientCoords;
	var intervalId;
	var dotEl;

	if (debug) {
		dotEl = $('<div>')
			.css({
				position: 'absolute',
				zIndex: 99999,
				border: '5px solid red',
				borderRadius: '5px',
				margin: '-5px 0 0 -5px'
			})
			.appendTo('body');
	}

	function updateCoords() {
		var progress = moveIndex / moveCnt;
		var left = startPoint.left + dx * progress;
		var top = startPoint.top + dy * progress;

		clientCoords = {
			clientX: left - docEl.scrollLeft(),
			clientY: top - docEl.scrollTop()
		};

		if (debug) {
			dotEl.css({ left: left, top: top });
		}
	}

	function startDrag() {
		updateCoords();
		self.simulateEvent(targetNode, 'mousedown', clientCoords);
		if (debug) {
			setTimeout(function() {
				startMoving();
			}, DEBUG_DELAY);
		}
		else {
			startMoving();
		}
	}

	function startMoving() {
		intervalId = setInterval(tick, waitTime);
	}

	function tick() { // called one interval after start
		moveIndex++;
		updateCoords(); // update clientCoords before mousemove
		self.simulateEvent(docNode, 'mousemove', clientCoords);
		if (moveIndex >= moveCnt) {
			stopMoving();
		}
	}

	function stopMoving() {
		clearInterval(intervalId);
		if (debug) {
			setTimeout(function() {
				dotEl.remove(); // do this before calling stopDrag/callback. don't want dot picked up by elementFromPoint
				stopDrag();
			}, DEBUG_DELAY);
		}
		else {
			stopDrag();
		}
	}

	function stopDrag() { // progress at 1, coords already up to date at this point
		if ($.contains(docNode, targetNode)) {
			self.simulateEvent(targetNode, 'mouseup', clientCoords);
			self.simulateEvent(targetNode, 'click', clientCoords);
		}
		else {
			self.simulateEvent(docNode, 'mouseup', clientCoords);
		}
		callback();
	}

	startDrag();
}


function normalizeElPoint(point, el) {
	var left = point.left;
	var top = point.top;

	if (/%$/.test(left)) {
		left = parseInt(left) / 100 * el.outerWidth();
	}
	if (/%$/.test(top)) {
		top = parseInt(top) / 100 * el.outerHeight();
	}

	return { left: left, top: top };
}


function isPoint(input) {
	return 'left' in input && 'top' in input;
}


})(jQuery);