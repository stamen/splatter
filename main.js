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

  this.mouseTrap = new PIXI.DisplayObject();
  stage.addChild( this.mouseTrap );

  this.mouseTrap.hitArea = new PIXI.Rectangle( 0, 0, w, h );
  this.mouseTrap.interactive = true;
  this.mouseTrap.mousemove = this.mouseTrap.touchmove = this.onMouseMove.bind( this );
  this.mouseTrap.mouseup = this.onMouseUp.bind( this );

  this.pts = [];

  this.gfx = new PIXI.Graphics();
  // stage.addChild( this.gfx );

  this.tex_in = new PIXI.RenderTexture( w, h );
  this.tex_out = new PIXI.RenderTexture( w, h );
  this.texSprite_in = new PIXI.Sprite( this.tex_in );
  this.texSprite_out = new PIXI.Sprite( this.tex_out );

  stage.addChild( this.texSprite_out );
  this.offscreenContainer = new PIXI.DisplayObjectContainer();
  this.offscreenContainer.addChild( this.texSprite_in );
  this.offscreenContainer.addChild( this.gfx );

  // flip out
  this.texSprite_out.y = h;
  this.texSprite_out.scale.y = -1;

  this.texDirty = false;
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


    if ( this.pts.length ) {
      var last = this.pts[ this.pts.length - 1 ].v;

      this.gfx.clear();
      this.gfx.beginFill( 0x000000, 1.0 );
      for ( var i = 0; i < (Math.random() * 10); ++i ) {
        var xy = vec2.add( vec2.create(), last, vec2.scale( vec2.create(), avg, Math.random() ) );
        var r = Math.random() * vec2.length( avg ) * 0.5 + 3.0;
        this.gfx.drawCircle( xy[0], xy[1], r );
      }
      this.gfx.endFill();

      this.tex_out.render( this.offscreenContainer, undefined, true );
      this.texDirty = true;
    }
  },

  afterRender: function() {
    if ( this.texDirty ) {
      var temp = this.tex_in;
      this.tex_in = this.tex_out;
      this.tex_out = temp;
      this.texSprite_in.setTexture( this.tex_in );
      this.texSprite_out.setTexture( this.tex_out );
      this.texDirty = false;
    }
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

  var stage = new PIXI.Stage( 0xFFFFFF, true /* interactive */ );
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
    view.afterRender();
  }
};

$(function(){
  window.app = init( $("#render-container") );
});
