_global.where.large_splat_size = 150;

_global.where.set_splat_pos (Stage.width/2, Stage.height/2, 0, -50, _global.where.large_splat_size);

_global.where.img._visible = false;
_global.where.img_splat._visible = false;
_global.where.nav._visible = false;


_global.where.onMouseDown = function(){

	if (_global.where.img._visible == true){
			_global.where.img._visible = false;
			_global.where.img_splat._visible = false;
			_global.where.nav._visible = false;
			_global.where.set_splat_pos (Stage.width/2, Stage.height/2, 0, -50, _global.where.large_splat_size);

			//
			_global.where.title._visible = true;
		} else {
			_global.where.img._visible = true;
			_global.where.img_splat._visible = true;
			_global.where.nav._visible = true;
			_global.where.set_splat_pos (Stage.width/2, Stage.height, -100, 40, 150);
			//
			_global.where.title._visible = false;
		}
	
	
}