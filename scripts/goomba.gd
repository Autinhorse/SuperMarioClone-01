extends CharacterBody2D

const SPEED := 30.0
const GRAVITY := 490.0

@export_file("*.json") var character_json_path: String = "res://characters/goomba.json"

@onready var sprite: AnimatedSprite2D = $AnimatedSprite2D
@onready var collision: CollisionShape2D = $CollisionShape2D

var direction: float = -1.0

func _ready() -> void:
	var char_data := CharacterLoader.load_from_json(character_json_path)
	if char_data == null:
		return
	var form: CharacterLoader.FormData = char_data.forms.get(char_data.default_form, null)
	if form == null:
		return
	sprite.sprite_frames = form.sprite_frames
	sprite.offset = Vector2(0, -form.size.y / 2.0)
	collision.shape = form.shape
	collision.position = Vector2(0, -form.size.y / 2.0)
	if sprite.sprite_frames.has_animation("walk"):
		sprite.play("walk")

func _physics_process(delta: float) -> void:
	if not is_on_floor():
		velocity.y += GRAVITY * delta
	velocity.x = direction * SPEED
	move_and_slide()
	if is_on_wall():
		direction = -direction
