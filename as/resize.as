Stage.align = "left";
Stage.addListener(_global.where);


onResize = function(){
	_global.where.do_resize();
}

function do_resize(){
	_global.where.img._x = Stage.width/2 - (_global.where.img._width/2);
	_global.where.img._y = Stage.height - (_global.where.img._height) - 60;
	
	_global.where.img_splat._y = Stage.height/2 - (_global.where.img_splat._height/2) + 160;
	
	_global.where.nav.box._width = Stage.width;
	_global.where.nav._y = _global.where.img._y + _global.where.img._height - 45;
	_global.where.nav.nav_btns._x = _global.where.img._x - 20;
	
	
	// _global.where.title._x = _global.where.img._x + 20;
	_global.where.title._x = Stage.width/2 - _global.where.title._width - 140;

	
	// _global.where.title._y = _global.where.img._y + 20;	
	_global.where.title._y = Stage.height/2 ;	

	
}

do_resize();

