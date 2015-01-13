/////////////////////////////////////////////////////////////////////////
// Utility methods
/////////////////////////////////////////////////////////////////////////

var TAU = 6.28318530717958647692;

var extend = function( base, sub, instanceProps, classProps ) {
  var constructor = function() {
    base.apply( this, arguments );
    sub.apply( this, arguments );
  };

  constructor.prototype = Object.create( base.prototype );
  constructor.prototype.constructor = sub;
  if ( !_.isUndefined( instanceProps ) ) _.extend( constructor.prototype, instanceProps );
  if ( !_.isUndefined( classProps ) ) _.extend( constructor, classProps );

  return constructor;
};

function getUrlParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++)
    {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam)
        {
            return sParameterName[1];
        }
    }
}

Math.clamp = function( value, min, max ) {
  if ( min === undefined ) min = 0.0;
  if ( max === undefined ) max = 1.0;

  return Math.min( value, Math.max( value, min ), max );
}

var BrushPoint = function( x, y, time ) {
  this.v = vec2.fromValues( x, y );
  this.time = time;
};

var Timer = function( startTime ) {
  this.startTime = startTime;
}
_.extend( Timer.prototype, {
  getElapsedSeconds: function() {
    return (new Date().getTime() - this.startTime) / 1000.0;
  }
});

/////////////////////////////////////////////////////////////////////////
// Views
/////////////////////////////////////////////////////////////////////////

var views = {};

//-----------------------------------------------------------------------
// Base view
//-----------------------------------------------------------------------
views.Base = function() {
};
_.extend( views.Base.prototype, {
  update: function( time ){
  },
  resize: function( w, h ) {
  },
  onMouseMove: function() {
  }

});
//-----------------------------------------------------------------------
// Paint view
//-----------------------------------------------------------------------

views.Paint = extend( views.Base, function( stage, w, h, timer ) {
  this.timer = timer;

  this.gfx = new PIXI.Graphics();
  stage.addChild( this.gfx );

  this.gfx.hitArea = new PIXI.Rectangle( 0, 0, w, h );
  this.gfx.interactive = true;
  this.gfx.mousemove = this.gfx.touchmove = this.onMouseMove.bind( this );
  this.gfx.mouseup = this.onMouseUp.bind( this );

  this.pts = [];
}, {
  update: function( time ) {
    var pt = this.pts[ 0 ];
    while( pt !== undefined && (time - pt.time) > 0.25 ) {
      this.pts.shift();
      pt = this.pts[ 0 ];
    }

    var avg = vec2.create();
    for ( var i = 0; i < (this.pts.length - 1); ++i ) {
      var pt = this.pts[ i ],
          next = this.pts[ i + 1 ];

      var delta = vec2.sub( vec2.create(), next.v, pt.v );
      vec2.add( avg, avg, vec2.scale( vec2.create(), delta, 1.0 / this.pts.length ) );
    }

    var last = this.pts.length !== 0 ? this.pts[ this.pts.length - 1 ].v : vec2.create();
    var lastPlusAvg = vec2.add( vec2.create(), last, avg );

    this.gfx.clear();
    this.gfx.beginFill( 0x000000, 1.0 );
    this.gfx.lineStyle( 2, 0x000000, 1.0 );
    this.gfx.moveTo( last[0], last[1] );
    this.gfx.lineTo( lastPlusAvg[0], lastPlusAvg[1] );
    this.gfx.endFill();
  },

  onMouseMove: function( ev ) {
    var pt = ev.getLocalPosition( this.gfx );
    this.pts.push( new BrushPoint( pt.x, pt.y, this.timer.getElapsedSeconds() ) );
  },

  onMouseUp: function( ev ) {
  }
});

/////////////////////////////////////////////////////////////////////////
// Application initialization
/////////////////////////////////////////////////////////////////////////
var init = function( $container ) {
  var w = $container.width(), h = $container.height();

  var stage = new PIXI.Stage( 0xFF0000, true /* interactive */ );
  var renderer = PIXI.autoDetectRenderer( w, h, {
    view: $container[0], antialias: true
  } );

  var timer = new Timer( new Date().getTime() );

  var view = new views.Paint( stage, w, h, timer );

  requestAnimFrame( animate );

  return {
    stage: stage,
    renderer: renderer,
    view: view
  };


  function animate() {
    requestAnimFrame( animate );

    view.update( timer.getElapsedSeconds() );
    renderer.render( stage );
  }
};

$(function(){
  window.app = init( $("#render-container") );
});
