class_name LevelRenderer extends RefCounted

const TILE_SIZE := 16
const CATALOG_PATH := "res://config/tiles.json"
const VISUALS_PATH := "res://config/tile_visuals.json"

static var _catalog: Dictionary = {}
static var _visuals: Dictionary = {}
static var _configs_loaded: bool = false

static func render_area(parent: Node, csv_path: String, map_style: int) -> Vector2i:
	_ensure_configs()
	var grid := _parse_csv(csv_path)
	var max_cols := 0
	for row_idx in grid.size():
		var row: Array = grid[row_idx]
		max_cols = maxi(max_cols, row.size())
		for col_idx in row.size():
			var cell: String = row[col_idx]
			var px := Vector2(col_idx * TILE_SIZE, row_idx * TILE_SIZE)
			_spawn_cell(parent, cell, px, col_idx, row_idx, map_style)
	return Vector2i(max_cols, grid.size())

static func _ensure_configs() -> void:
	if _configs_loaded:
		return
	_catalog = _load_json(CATALOG_PATH)
	_visuals = _load_json(VISUALS_PATH)
	_configs_loaded = true

static func _parse_csv(path: String) -> Array:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Cannot open CSV: %s" % path)
		return []
	var grid: Array = []
	while not file.eof_reached():
		var line := file.get_line()
		if line.strip_edges().is_empty():
			continue
		var cells: Array = []
		for cell in line.split(","):
			cells.append(cell.strip_edges())
		grid.append(cells)
	return grid

static func _spawn_cell(parent: Node, cell: String, px: Vector2, col: int, row: int, map_style: int) -> void:
	if cell.is_empty() or cell == "0":
		return
	if cell.begins_with("*"):
		_spawn_complex(parent, cell, px, col, row, map_style)
		return
	_spawn_tile(parent, cell, px, col, row, map_style)

static func _spawn_tile(parent: Node, id_str: String, px: Vector2, col: int, row: int, map_style: int) -> void:
	var meta: Dictionary = _catalog.get(id_str, {})
	if meta.is_empty():
		push_warning("Unknown tile id: %s at (%d,%d)" % [id_str, col, row])
		return

	var root := Node2D.new()
	root.position = px + Vector2(TILE_SIZE / 2.0, TILE_SIZE / 2.0)
	root.name = "Tile_%s_%d_%d" % [str(meta.get("name", id_str)), col, row]

	var sprite := Sprite2D.new()
	sprite.texture = _load_tile_texture(id_str, map_style, meta)
	root.add_child(sprite)

	if bool(meta.get("solid", false)):
		var body := StaticBody2D.new()
		var shape_node := CollisionShape2D.new()
		var rect := RectangleShape2D.new()
		rect.size = Vector2(TILE_SIZE, TILE_SIZE)
		shape_node.shape = rect
		body.add_child(shape_node)
		root.add_child(body)

	parent.add_child(root)

static func _load_tile_texture(id_str: String, map_style: int, meta: Dictionary) -> Texture2D:
	var style_key := str(map_style)
	var visuals: Dictionary = _visuals.get(id_str, {})
	var tex_path: String = visuals.get(style_key, "")
	if tex_path != "" and ResourceLoader.exists(tex_path):
		return load(tex_path) as Texture2D
	return _placeholder_texture(meta)

static func _placeholder_texture(meta: Dictionary) -> ImageTexture:
	var img := Image.create(TILE_SIZE, TILE_SIZE, false, Image.FORMAT_RGBA8)
	img.fill(_palette_color(str(meta.get("name", ""))))
	for i in range(TILE_SIZE):
		img.set_pixel(i, 0, Color(0, 0, 0, 0.4))
		img.set_pixel(i, TILE_SIZE - 1, Color(0, 0, 0, 0.4))
		img.set_pixel(0, i, Color(0, 0, 0, 0.4))
		img.set_pixel(TILE_SIZE - 1, i, Color(0, 0, 0, 0.4))
	return ImageTexture.create_from_image(img)

static func _palette_color(name: String) -> Color:
	match name:
		"ground":   return Color(0.55, 0.3, 0.1)
		"brick":    return Color(0.8, 0.35, 0.15)
		"question": return Color(0.95, 0.75, 0.2)
		"pipe_tl", "pipe_tr", "pipe_bl", "pipe_br":
			return Color(0.1, 0.7, 0.2)
		"cloud":    return Color(1.0, 1.0, 1.0)
		"bush":     return Color(0.2, 0.75, 0.25)
		"hill":     return Color(0.25, 0.55, 0.2)
	return Color(0.9, 0.1, 0.9)

static func _spawn_complex(parent: Node, spec: String, px: Vector2, col: int, row: int, map_style: int) -> void:
	print("[LevelRenderer] complex entry '%s' at tile (%d,%d) style=%d — not yet handled" % [spec, col, row, map_style])

static func _load_json(path: String) -> Dictionary:
	var file := FileAccess.open(path, FileAccess.READ)
	if file == null:
		push_error("Cannot open: %s" % path)
		return {}
	var parsed = JSON.parse_string(file.get_as_text())
	if typeof(parsed) != TYPE_DICTIONARY:
		push_error("Invalid JSON: %s" % path)
		return {}
	return parsed
