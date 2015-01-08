// used to draw the line

// determine the start and end points of the line to be drawn, and modify it based on distance
function get_splat_pos(start_x, start_y, end_x, end_y, coloring){
	// trace ("get_splat_pos");
	mid_x = ((end_x - start_x) * (1 + _global.where.mid_point_push)) + start_x;
	mid_y = ((end_y - start_y) * (1 + _global.where.mid_point_push)) + start_y;
	
	//
	
	distance = Math.sqrt(Math.pow((end_x - start_x), 2) + Math.pow((end_y - start_y), 2));
	new_size = _global.where.max_line_width / distance;
	size = (_global.where.new_size_influence * new_size) + ((1 - _global.where.new_size_influence) * size);
	
	
	// coloring = 200 - (_global.line_numbers * coloring);
	coloring = 100;
	
	_global.where.splat(_global.where.splat_mc, start_x, start_y, end_x, end_y, mid_x, mid_y, size, coloring);
	parity = false;
}


function splat(obj, x1, y1, x2, y2, x3, y3, d, coloring)
{
	obj.lineStyle(d, 0x000000, coloring);
	obj.moveTo(x1, y1);
	obj.curveTo(x3, y3, x2, y2);
	
	
	// splotch
	dd = Math.sqrt(Math.pow((x2 - x1), 2) + Math.pow((y2 - y1), 2));

 	for (var i = 0; i<Math.floor(5*Math.pow(Math.random(), 4)); i++) {	
	// positioning of splotch varies between ±4dd, tending towards 0
		splat_range = 1;
		var x4 = dd * 1 * (Math.pow(Math.random(), splat_range) - (splat_range/2));
		var y4 = dd * 1 * (Math.pow(Math.random(), splat_range) - (splat_range/2));
		// direction of splotch varies between ±0.5
		var x5 = Math.random() - 0.5;
		var y5 = Math.random() - 0.5;
		obj.lineStyle((d*(0.5+Math.random())), 0x000000, 100);
		obj.moveTo((x1+x4), (y1+y4));
		obj.lineTo((x1+x4+x5), (y1+y4+y5));
	
	 }
	
}


