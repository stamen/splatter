////////////////////////////////////////////////////////////////////////////////
// Google Analytics!
////////////////////////////////////////////////////////////////////////////////
(function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
(i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
})(window,document,'script','//www.google-analytics.com/analytics.js','ga');

// see below for tracking calls

////////////////////////////////////////////////////////////////////////////////
// Utility methods
////////////////////////////////////////////////////////////////////////////////

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

function hexToRGB( hexInt ) {
  var r = (hexInt >> 16) & 255;
  var g = (hexInt >> 8) & 255;
  var b = hexInt & 255;

  return [ r / 255.0, g / 255.0, b / 255 ];
}

Math.mix = function( x, y, a ) {
  return x * (1.0 - a) + y * a;
}

// from http://en.wikipedia.org/wiki/B%C3%A9zier_curve
// B(t) = (1 - t)^2 * P0 + 2(1 - t)t * P1 + t^2 * P2, where t is between 0,1
function quadraticCurve( start, end, control, t ) {
  var x = (1.0 - t) * (1.0 - t) * start[0] + 2 * (1.0 - t) * t * control[0] + t * t * end[0];
  var y = (1.0 - t) * (1.0 - t) * start[1] + 2 * (1.0 - t) * t * control[1] + t * t * end[1];
  return vec2.fromValues( x, y );
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

var MetaballFilter = extend( PIXI.AbstractFilter, function() {
  this.passes = [this];

  this.uniforms = {
    uThreshold: { type: '1f', value: 0.0 }
  };

  this.fragmentSrc = [
    'precision highp float;',
    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',
    'uniform sampler2D uSampler;',
    'uniform float uThreshold;',
    'void main( void ) {',
    '  vec4 c = texture2D( uSampler, vTextureCoord );',
    '  float metaball = c.a > uThreshold ? 1.0 : 0.0;',
    '  c.a = metaball;',
    '  c.rgb = c.rgb * metaball;',
    '  gl_FragColor = c;',
    '}'
  ];
}, {
} );

var ColorChangeFilter = extend( PIXI.AbstractFilter, function() {
  this.passes = [this];

  this.uniforms = {
    uColor: { type: '3fv', value: [1.0, 1.0, 1.0] }
  };

  this.fragmentSrc = [
    'precision highp float;',
    'varying vec2 vTextureCoord;',
    'varying vec4 vColor;',
    'uniform sampler2D uSampler;',
    'uniform vec3 uColor;',
    'void main( void ) {',
    '  vec4 c = texture2D( uSampler, vTextureCoord );',
    '  c.rgb = uColor * c.a;',
    '  gl_FragColor = c;',
    '}'
  ];
}, {
} );

////////////////////////////////////////////////////////////////////////////////
// Views
////////////////////////////////////////////////////////////////////////////////

var views = {};

//------------------------------------------------------------------------------
// Base view
//------------------------------------------------------------------------------
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
//------------------------------------------------------------------------------
// Paint view
//------------------------------------------------------------------------------

var ColorPalette = [
  0xfa5619, 0x243470, 0xefc126, 0x0d070b, 0xfffffd
];
ColorPalette.rand = function() { return this[ Math.floor( Math.random() * this.length ) ]; }
views.Paint = extend( views.Base, function( stage, w, h, timer, sensitivity ) {
  this.timer = timer;
  this.sensitivity = sensitivity;

  this.mouseTrap = new PIXI.DisplayObject();
  stage.addChild( this.mouseTrap );

  this.mouseTrap.hitArea = new PIXI.Rectangle( 0, 0, w, h );
  this.mouseTrap.interactive = true;
  this.isDragging = false;
  this.mouseTrap.mousedown = this.mouseTrap.touchstart = this.onBrushStart.bind( this );
  this.mouseTrap.mouseup = this.mouseTrap.mouseupoutside = this.mouseTrap.touchend = this.onBrushEnd.bind( this );
  this.mouseTrap.mousemove = this.mouseTrap.touchmove = this.onBrushMove.bind( this );

  this.pts = [];

  this.gfx_debug = new PIXI.Graphics();
  this.brushPoints = new PIXI.DisplayObjectContainer();
  this.tex_brushPoint = PIXI.Texture.fromImage( "radial-alpha-gradient.png" );
  this.offscreenContainer = new PIXI.DisplayObjectContainer();

  var tex_bg = PIXI.Texture.fromImage( "canvas.png" );
  this.background = new PIXI.TilingSprite( tex_bg, w, h );
  // this.background.tileScale = new PIXI.Point( 1.0 / 2.0, 1.0 / 2.0 );

  this.tex_in = new PIXI.RenderTexture( w, h );
  this.tex_out = new PIXI.RenderTexture( w, h );
  this.texSprite_in = new PIXI.Sprite( this.tex_in );
  this.texSprite_out = new PIXI.Sprite( this.tex_out );

  stage.addChild( this.background );
  stage.addChild( this.texSprite_out );
  stage.addChild( this.gfx_debug );
  this.offscreenContainer.addChild( this.texSprite_in );
  this.offscreenContainer.addChild( this.brushPoints );

  // Filters broken? https://github.com/GoodBoyDigital/pixi.js/issues/843
  // this.texSprite_out.filters = [ new MetaballFilter() ];
  var filter = new MetaballFilter();
  this.texSprite_out.shader = filter;
  filter.uniforms.uThreshold.value = 0.75;

  this.texDirty = false;
  this.previous = undefined;
  this.tintFilter = new ColorChangeFilter();
  this.setColor( ColorPalette.rand() );
}, {
  update: function( time ) {
    // Update points ----------------------------------------------------------
    // dump old points
    var pt = this.pts[ 0 ];
    while( pt !== undefined && (time - pt.time) > 0.2 ) {
      this.pts.shift();
      pt = this.pts[ 0 ];
    }

    // add points if the brush is still
    if ( this.last && (time - this.last.time) > 0.075 ) {
      this.pts.push( new BrushPoint( this.last.v[0], this.last.v[1], time ) );
    }

    if ( this.pts.length === 0 ) return;


    var pt_first = this.pts[ 0 ],
        pt_last = this.pts[ this.pts.length - 1 ],
        v_first = pt_first.v,
        v_last = pt_last.v,
        v_prev = this.previous || this.pts[ Math.max( 0, this.pts.length - 2 ) ].v;
    this.previous = v_last;


    // Do calculations over points --------------------------------------------

    // find the average over the window
    // FIXME: maybe calculate this based on time to account for sampling rates?
    var avgDiff = vec2.create();
    for ( var i = 0; i < (this.pts.length - 1); ++i ) {
      var pt = this.pts[ i ],
          next = this.pts[ i + 1 ];

      vec2.add( avgDiff, avgDiff, vec2.sub( vec2.create(), next.v, pt.v ) );
    }
    var scale = 1.0 / this.pts.length * this.sensitivity;
    vec2.scale( avgDiff, avgDiff, scale );
    var velocity = vec2.length( avgDiff );


    // Prep for drawing -------------------------------------------------------
    this.clearTemp();

    // this.drawDebugCircle( v_first[0], v_first[1], 10, 0xFF0000 );
    // this.drawDebugCircle( v_last[0], v_last[1], 10, 0x00FF00 );
    // this.drawDebugCircle( v_first[0] + avgDiff[0], v_first[1] + avgDiff[1], 10, 0x0000FF );
    // this.drawDebugCircle( v_prev[0], v_prev[1], 10, 0xFF0000 );

    // Draw curve -------------------------------------------------------------
    var v_prevToLast = vec2.sub( vec2.create(), v_last, v_prev ),
      v_mid = vec2.add( vec2.create(), v_prev, vec2.scale( vec2.create(), v_prevToLast, 0.5 ) ),
      ctrl = vec2.add( vec2.create(), v_mid, vec2.scale( vec2.create(), avgDiff, Math.max( 0.0, 1.0 - Math.log( velocity ) ) ) ),
      thickness = Math.max( 2.0, (velocity - 10.0) * 0.25 + ((Math.random() - 0.5) * 4.0) );

    for ( var t = 0.0; t <= 1.0; t += (1.0 / vec2.length( v_prevToLast )) ) {
      var xy = quadraticCurve( v_prev, v_last, ctrl, t );
      this.drawPaintDrop( xy[0], xy[1], thickness );
    }



    // Draw spray drops --------------------------------------------------------

    // lots of drops when the velocity is high...
    var nDrops = Math.floor( Math.random() * Math.max( 0.0, velocity - 20.0 ) * 5.0 );
    // too many drops can easily stall the app
    nDrops = Math.clamp( nDrops, 0, 1000 );

    for ( var i = 0; i < nDrops; ++i ) {
      var scatterDistance = Math.mix( Math.random(),
                                      Math.pow( Math.random(), 4 ) * velocity * 0.05,
                                      Math.min( 1.0, velocity / 20.0 ) );
      var scatterSpread = (Math.random() - 0.5) * TAU / 3.0;
      var radius = Math.pow( Math.random(), 4 ) * // random factor, tends to be closer to 1
        Math.min(1.0 / scatterDistance, 1.0) * // the further the scatter, the smaller
        velocity * 0.50; // when velocity is higher, make it bigger

      var xy = vec2.scale( vec2.create(), avgDiff, scatterDistance );
      var rotation = mat2d.rotate( mat2d.create(), mat2d.create(), scatterSpread );
      vec2.transformMat2d( xy, xy, rotation );
      vec2.add( xy, v_last, xy );

      // this.drawDebugCircle( xy[0], xy[1], 7, 0xFFFFFF );
      this.drawPaintDrop( xy[0], xy[1], radius );
    }


    // Draw drippy drops -------------------------------------------------------
    nDrops = 2.0 - velocity / 5.0;
    nDrops = Math.clamp( nDrops, 0, 1000 );

    var timeDelta = pt_last.time - pt_first.time;
    for ( var i = 0; i < nDrops; ++i ) {
      var radius = Math.random() * timeDelta * 40.0;
      var size = Math.random() * timeDelta * 100.0;
      var xy = vec2.add( vec2.create(), v_last, vec2.random( vec2.create(), radius ) );
      this.drawPaintDrop( xy[0], xy[1], size );
    }

    // Finalize ----------------------------------------------------------------
    this.tex_out.render( this.offscreenContainer, undefined, true );
    this.texDirty = true;
  },

  setColor: function( color ) {
    this.color = color;
    this.tintFilter.uniforms.uColor.value = hexToRGB( color );
  },

  drawPaintDrop: function( x, y, radius ) {
    var sprite = new PIXI.Sprite( this.tex_brushPoint );
    sprite.shader = this.tintFilter;
    sprite.anchor.x = 0.5;
    sprite.anchor.y = 0.5;
    sprite.position.x = x;
    sprite.position.y = y;
    sprite.scale = new PIXI.Point(
      (radius * 2) / this.tex_brushPoint.width,
      (radius * 2) / this.tex_brushPoint.height
    );
    this.brushPoints.addChild( sprite );
  },

  drawDebugCircle: function( x, y, radius, color ) {
    this.gfx_debug.lineStyle( 5, color, 0.75 );
    this.gfx_debug.drawCircle( x, y, radius );
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

  clear: function () {
    this.clearTemp();
    this.tex_in.clear();
    this.tex_out.clear();
  },

  clearTemp: function () {
    this.brushPoints.removeChildren();
    this.gfx_debug.clear();
  },

  recordMousePosition: function( x, y ) {
    this.last = new BrushPoint( x, y, this.timer.getElapsedSeconds() );
    this.pts.push( this.last );
  },

  onBrushStart: function( ev ) {
    this.isDragging = true;

    var c = this.color;
    while ( c === this.color ) c = ColorPalette.rand();
    this.setColor( c );
  },

  onBrushEnd: function( ev ) {
    this.isDragging = false;
    this.previous   = undefined;
    this.last       = undefined;
  },

  onBrushMove: function( ev ) {
    if ( !this.isDragging ) return;

    var pt = ev.getLocalPosition( this.mouseTrap );
    this.recordMousePosition( pt.x, pt.y );
  }
});

///////////////////////////////////////////////////////////////////////////////
// Application initialization
///////////////////////////////////////////////////////////////////////////////
var init = function( $container ) {
  var w = $container.width(), h = $container.height();

  var stage = new PIXI.Stage( 0xFFFFFF, true /* interactive */ );
  var renderer = PIXI.autoDetectRenderer( w, h, {
    view: $container[0], antialias: true
  } );

  var timer = new Timer( new Date().getTime() );

  var sensitivity = getUrlParameter( "sensitivity" ) || 1.0;
  var view = new views.Paint( stage, w, h, timer, sensitivity );

  requestAnimFrame( animate );

  if ( getUrlParameter( "kiosk" ) ) {
    var regex = /^https?:/;
    $("a").each( function() {
      $a = $( this );
      var href = $a.attr("href");
      if ( regex.test( href ) ) {
        $a.contents().unwrap();
      }
    });
  }

  return {
    stage: stage,
    renderer: renderer,
    view: view,
    clear: view.clear.bind( view )
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

  var uid = getUrlParameter( "uid" );
  ga('create', 'UA-40440647-2', { 'userId': uid });
  ga('send', 'pageview');
});
