


// load the sound file

function load_sound_file(loc, array){
	_global.where.snd_hold.snd.loadMovie(loc);
	_global.where.snd_hold.where = where;
	_global.where.snd_hold.onEnterFrame = function(){
		// trace ("frame: " + this.snd._currentframe);
		// this.where.bar._yscale = this.where.amplitude_array[this.snd._currentframe] * 2;
	};
}

_global.where.load_sound_file("audio_collage.swf");



//  set up the array that holds the locations of each segment
_global.where.snd_location_array = new Array();

// attach the clip that sets the various positions, on enterframe
ctrl_mc = "ctrl";
_global.where.attachMovie("empty", ctrl_mc, 100);

_global.where[ctrl_mc].onEnterFrame = function(){
		_global.where.generate_snd_points();
}



_global.where.splat_mc._xscale = _global.where.splat_mc._yscale = 0;


_global.where.splat_ctrl.onEnterFrame = function(){
	_global.where.splat_mc.new_x = this.set_x;
	_global.where.splat_mc.new_y = this.set_y;
	_global.where.splat_mc.new_scale = this.new_scale;
}

function set_splat_pos (x_pos, y_pos, x_offset, y_offset, new_scale){
	_global.where.splat_ctrl.set_x = x_pos - x_offset;
	_global.where.splat_ctrl.set_y = y_pos - y_offset;
	_global.where.splat_ctrl.new_scale = new_scale;
}


_global.where.splat_mc.onEnterFrame = function(){


	this.diff_scale =  this._xscale - this.new_scale;
	this._xscale = this._yscale = Math.floor(this._xscale - (this.diff_scale / 3));

	var clipBounds = this.getBounds();
	var left_x = clipBounds.xMin;
	var right_x = clipBounds.xMax;
	var top_y = clipBounds.yMin;
	var bottom_y = clipBounds.yMax;
	
	
	var mc_width = (right_x + left_x) * (100/this._xscale);
	var mc_height = (bottom_y + top_y) * (100/this._yscale);

	this.diff_x = this._x - this.new_x;
	this.diff_y = this._y - this.new_y;
		
	this._x = Math.floor(this._x - (this.diff_x / 5));
	this._y = Math.floor(this._y - (this.diff_y / 5));
	

	

}

// generate the points to use 
function generate_snd_points(){
	
	_global.where.splat_mc.clear();

	for (var i=0; i < _global.where.line_numbers; i+=1){
		var snd_index = _global.where.snd_hold.snd._currentframe;
		// trace ("snd_index = " + snd_index);
		_global.where.snd_location_array[i] = _global.where.amplitude_array[snd_index - i];
		// trace ("_global.where.snd_location_array[" + i + "] = " + _global.where.snd_location_array[i]);
		
		
		// call the functions that draw the lines; use either one or the other
		if (i > 0){
			_global.where.get_snd_spread(i); 
		}
	}

	
}

// find the current point, and the one preceding it, so that we can draw lines between them
function get_snd_spread(m){
	
	var start_x = _global.left_offset - ((m-1)*_global.tic_spacing) + (_global.where.snd_location_array[m-1] * 3);
	// var start_x = _global.left_offset + ((m-1)*(_global.where.snd_location_array[m-1]*5));
	
	var start_y = _global.top_offset - (_global.where.snd_location_array[m-1] * 2);
	

	//

	var end_x = _global.left_offset - ((m)*_global.tic_spacing)  + (_global.where.snd_location_array[m] * 3);
	// var end_x = _global.left_offset + ((m)*(_global.where.snd_location_array[m]*5));
	
	var end_y = _global.top_offset - (_global.where.snd_location_array[m] * 2);
	
	
	
	
	
	_global.where.get_splat_pos(start_x, start_y, end_x, end_y, m);
}




// this attaches the dots; wrote it to try this out
function attach_tics(j){
	tic_mc = "tic" + j;
	_global.where.attachMovie("tic", tic_mc, j);
	// trace ("mc = " + _global.where[tic_mc]);
	_global.where[tic_mc]._x = _global.left_offset + (j * 10);
	_global.where[tic_mc]._y = _global.top_offset + _global.where.snd_location_array[j];
}


