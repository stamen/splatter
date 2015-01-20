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

function hexToRGB( hexInt ) {
  var r = (hexInt >> 16) & 255;
  var g = (hexInt >> 8) & 255;
  var b = hexInt & 255;

  return [ r / 255.0, g / 255.0, b / 255 ];
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
  // for some reason, touchstart is necessary to get touchmove
  this.mouseTrap.touchstart = this.onTouchStart.bind( this );
  this.mouseTrap.mousemove = this.mouseTrap.touchmove = this.onMouseMove.bind( this );
  this.mouseTrap.mouseup = this.onMouseUp.bind( this );

  this.pts = [];

  this.gfx = new PIXI.Graphics();
  var tex_bg = PIXI.Texture.fromImage( "canvas.png" );
  this.background = new PIXI.TilingSprite( tex_bg, w, h );
  // this.background.tileScale = new PIXI.Point( 1.0 / 2.0, 1.0 / 2.0 );

  this.tex_in = new PIXI.RenderTexture( w, h );
  this.tex_out = new PIXI.RenderTexture( w, h );
  this.texSprite_in = new PIXI.Sprite( this.tex_in );
  this.texSprite_out = new PIXI.Sprite( this.tex_out );

  stage.addChild( this.background );
  stage.addChild( this.texSprite_out );
  this.offscreenContainer = new PIXI.DisplayObjectContainer();
  this.offscreenContainer.addChild( this.texSprite_in );
  this.brushPoints = new PIXI.DisplayObjectContainer();
  this.offscreenContainer.addChild( this.brushPoints );
  this.tex_brushPoint = PIXI.Texture.fromImage( "radial-alpha-gradient.png" );


  // Filters broken? https://github.com/GoodBoyDigital/pixi.js/issues/843
  // this.texSprite_out.filters = [ new MetaballFilter() ];
  var filter = new MetaballFilter();
  this.texSprite_out.shader = filter;
  filter.uniforms.uThreshold.value = 0.75;

  this.texDirty = false;
  this.wasStationary = false;
  this.tintFilter = new ColorChangeFilter();
  this.tintFilter.uniforms.uColor.value = hexToRGB( ColorPalette.rand() );
}, {
  update: function( time ) {
    // dump old points
    var pt = this.pts[ 0 ];
    while( pt !== undefined && (time - pt.time) > 0.2 ) {
      this.pts.shift();
      pt = this.pts[ 0 ];
    }

    // add points if the brush is still
    if ( this.last && (time - this.last.time) > 0.075 ) {
      this.pts.push( new BrushPoint( this.last.v[0], this.last.v[1], time ) );
      this.wasStationary = true;
    }

    // find the average over the window
    var avg = vec2.create();
    for ( var i = 0; i < (this.pts.length - 1); ++i ) {
      var pt = this.pts[ i ],
          next = this.pts[ i + 1 ];

      var delta = vec2.sub( vec2.create(), next.v, pt.v );
      vec2.scale( delta, delta, (1.0 / this.pts.length) * this.sensitivity );
      vec2.add( avg, avg, delta );
    }
    var velocity = vec2.length( avg );

    if ( velocity > 5.0 && this.wasStationary ) {
      this.tintFilter.uniforms.uColor.value = hexToRGB( ColorPalette.rand() );
      this.wasStationary = false;
    }


    if ( this.pts.length ) {
      var last = this.pts[ this.pts.length - 1 ].v;

      var nDrops = Math.min( Math.floor( Math.random() * velocity * 0.5 + 75.0 ), 1000 );

      this.brushPoints.removeChildren();
      for ( var i = 0; i < nDrops; ++i ) {
        var scatterDistance = Math.pow( Math.random(), 4 ) * velocity * 0.05;
        var scatterSpread = (Math.random() - 0.5) * TAU / 3.0;
        var radius = Math.pow( Math.random(), 4 ) * // random factor, tends to be closer to 1
          Math.min(1.0 / scatterDistance, 1.0) * // the further the scatter, the smaller
          velocity * 0.50 + // when velocity is higher, make it bigger
          Math.max( (1.0 - Math.log( velocity ) / Math.log( 20.0 )) * 3.0, 0.0 ); // and when velocity is very small, make it bigger for stationary brush

        var xy = vec2.scale( vec2.create(), avg, scatterDistance );
        var rotation = mat2d.rotate( mat2d.create(), mat2d.create(), scatterSpread );
        vec2.transformMat2d( xy, xy, rotation );
        vec2.add( xy, last, xy );

        var sprite = new PIXI.Sprite( this.tex_brushPoint );
        sprite.shader = this.tintFilter;
        sprite.anchor.x = 0.5;
        sprite.anchor.y = 0.5;
        sprite.position.x = xy[0];
        sprite.position.y = xy[1];
        sprite.scale = new PIXI.Point(
          (radius * 2) / this.tex_brushPoint.width,
          (radius * 2) / this.tex_brushPoint.height
        );
        this.brushPoints.addChild( sprite );
      }

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

  clear: function () {
    this.tex_in.clear();
  },

  onMouseMove: function( ev ) {
    var pt = ev.getLocalPosition( this.gfx );
    this.last = new BrushPoint( pt.x, pt.y, this.timer.getElapsedSeconds() );
    this.pts.push( this.last );
  },

  onMouseUp: function( ev ) {
  },

  onTouchStart: function( ev ) {
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

  var sensitivity = getUrlParameter( "sensitivity" ) || 1.0;
  var view = new views.Paint( stage, w, h, timer, sensitivity );

  requestAnimFrame( animate );

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
});
