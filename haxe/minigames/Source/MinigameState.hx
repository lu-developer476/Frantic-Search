import flixel.FlxG;
import flixel.FlxState;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.text.FlxText.FlxTextBorderStyle;
import flixel.util.FlxColor;
#if js
import js.Browser;
#end

class MinigameState extends FlxState {
  public static var current:MinigameState;
  public var mode(default, null):String;
  public var role(default, null):String;
  public var locale(default, null):String;
  public var paused(default, null):Bool = false;
  public var finished(default, null):Bool = false;

  var player:FlxSprite;
  var ground:FlxSprite;
  var hud:FlxText;
  var subHud:FlxText;
  var enemies:Array<FlxSprite> = [];
  var hazards:Array<FlxSprite> = [];
  var bullets:Array<FlxSprite> = [];
  var elapsedTotal:Float = 0;
  var spawnTimer:Float = 0;
  var attackCooldown:Float = 0;
  var invulnerability:Float = 0;
  var jumpVelocity:Float = 0;
  var jumpHeight:Float = 0;
  var worldDistance:Float = 0;
  var health:Int = 5;
  var score:Int = 0;
  var wave:Int = 1;
  var lane:Int = 1;
  var raceProgress:Float = 0;
  var checkpoint:Float = 0;
  var playerAsset:String = "references/adult-velociraptor-nublarensis.png";

  public function new(gameMode:String, options:Dynamic, gameLocale:String) {
    super();
    mode = gameMode;
    role = mode == "race"
      ? optionString(options, "character", "gala")
      : optionString(options, "role", "hunter");
    locale = gameLocale == "en" ? "en" : "es";
  }

  public static function forMode(mode:String, options:Dynamic, locale:String):FlxState {
    return switch (mode) {
      case "persecution": new PersecutionState(options, locale);
      case "hunting": new HuntingState(options, locale);
      case "ambush": new AmbushState(options, locale);
      case "race": new RaceState(options, locale);
      default: new AmbushState(options, locale);
    };
  }

  static function optionString(options:Dynamic, key:String, fallback:String):String {
    if (options == null) return fallback;
    var value:Dynamic = Reflect.field(options, key);
    return value == null || Std.string(value) == "" ? fallback : Std.string(value);
  }

  override public function create():Void {
    super.create();
    current = this;
    FlxG.camera.bgColor = FlxColor.fromRGB(27, 43, 34);
    drawEnvironment();
    buildActors();

    hud = new FlxText(18, 12, 920, "", 17);
    hud.color = FlxColor.fromRGB(242, 242, 222);
    hud.borderStyle = FlxTextBorderStyle.OUTLINE;
    hud.borderColor = FlxColor.fromRGB(18, 28, 22);
    add(hud);
    subHud = new FlxText(18, 40, 920, "", 11);
    subHud.color = FlxColor.fromRGB(216, 243, 106);
    subHud.borderStyle = FlxTextBorderStyle.OUTLINE;
    subHud.borderColor = FlxColor.fromRGB(18, 28, 22);
    add(subHud);
    refreshHud();
  }

  function drawEnvironment():Void {
    add(new FlxSprite(0, 0).makeGraphic(960, 540, FlxColor.fromRGB(119, 158, 142)));
    for (index in 0...7) {
      var hillColor = index % 2 == 0
        ? FlxColor.fromRGB(69, 111, 83)
        : FlxColor.fromRGB(81, 124, 91);
      add(new FlxSprite(index * 170 - 30, 195 + (index % 3) * 26).makeGraphic(210, 190, hillColor));
    }
    add(new FlxSprite(0, 335).makeGraphic(960, 92, FlxColor.fromRGB(42, 75, 54)));
    ground = new FlxSprite(0, 420).makeGraphic(960, 120, FlxColor.fromRGB(39, 49, 37));
    add(ground);
    add(new FlxSprite(0, 420).makeGraphic(960, 5, FlxColor.fromRGB(181, 194, 126)));
    for (index in 0...36) {
      add(new FlxSprite(index * 29, 426 + (index % 3) * 7).makeGraphic(14, 2, FlxColor.fromRGB(119, 150, 93)));
    }
  }

  function makeActor(x:Float, y:Float, asset:String, fallbackColor:FlxColor, width:Int, height:Int):FlxSprite {
    var sprite = new FlxSprite(x, y);
    try {
      sprite.loadGraphic(asset);
      sprite.setGraphicSize(width, height);
      sprite.updateHitbox();
    } catch (_:Dynamic) {
      sprite.makeGraphic(width, height, fallbackColor);
    }
    return sprite;
  }

  function buildActors():Void {
    if (mode == "hunting" && role == "predator") playerAsset = "references/vastatosaurus-rex.png";
    if (mode == "ambush" && role != "hunter") playerAsset = "references/vastatosaurus-rex.png";
    if (mode == "race") {
      playerAsset = role == "vastatosaurus-rex"
        ? "references/vastatosaurus-rex.png"
        : "references/adult-velociraptor-nublarensis.png";
    }

    if ((mode == "hunting" || mode == "ambush") && role == "hunter") {
      player = new FlxSprite(160, 350).makeGraphic(38, 64, FlxColor.fromRGB(183, 190, 170));
    } else {
      player = makeActor(160, 350, playerAsset, FlxColor.fromRGB(115, 180, 108), 64, 62);
    }
    add(player);
  }

  override public function update(elapsed:Float):Void {
    super.update(elapsed);
    if (FlxG.keys.justPressed.ESCAPE) {
      sendParent({ type: "frantic-engine-exit" });
      return;
    }
    if (FlxG.keys.justPressed.P && mode != "race") setPaused(!paused);
    if (paused || finished) return;

    var delta = Math.min(elapsed, 0.04);
    elapsedTotal += delta;
    spawnTimer -= delta;
    attackCooldown = Math.max(0, attackCooldown - delta);
    invulnerability = Math.max(0, invulnerability - delta);
    switch (mode) {
      case "persecution": updatePersecution(delta);
      case "hunting": updateHunting(delta);
      case "ambush": updateAmbush(delta);
      case "race": updateRace(delta);
      default:
    }
    refreshHud();
  }

  function updatePersecution(delta:Float):Void {
    worldDistance += 240 * delta;
    if (FlxG.keys.justPressed.LEFT || FlxG.keys.justPressed.A) lane = Std.int(Math.max(0, lane - 1));
    if (FlxG.keys.justPressed.RIGHT || FlxG.keys.justPressed.D) lane = Std.int(Math.min(2, lane + 1));
    var baseY = 342 - lane * 22;
    if ((FlxG.keys.justPressed.SPACE || FlxG.keys.justPressed.UP || FlxG.keys.justPressed.W) && jumpHeight <= 0) jumpVelocity = -510;
    if (FlxG.keys.justPressed.X && attackCooldown <= 0) {
      invulnerability = 0.7;
      attackCooldown = 2.2;
      player.x = Math.min(870, player.x + 45);
    }
    jumpVelocity += 1320 * delta;
    jumpHeight = Math.min(0, jumpHeight + jumpVelocity * delta);
    if (jumpHeight >= 0) jumpVelocity = 0;
    player.y = baseY + jumpHeight;

    if (spawnTimer <= 0) {
      spawnHazard();
      spawnTimer = 1.45 + Math.random() * 1.1;
    }
    for (hazard in hazards.copy()) {
      hazard.x -= 260 * delta;
      if (hazard.x < -80) removeActor(hazards, hazard);
      else if (invulnerability <= 0 && player.overlaps(hazard)) damagePlayer("PERSECUSIÓN");
    }
    if (worldDistance >= 900) checkpoint = 900 * Math.floor(worldDistance / 900);
  }

  function updateHunting(delta:Float):Void {
    if (role == "predator") {
      movePlayer(delta, 260);
      if (FlxG.keys.justPressed.X && attackCooldown <= 0) {
        attackCooldown = 0.62;
        for (enemy in enemies.copy()) {
          if (Math.abs(enemy.x - player.x) < 120 && Math.abs(enemy.y - player.y) < 85) {
            removeActor(enemies, enemy);
            score++;
          }
        }
      }
      if (spawnTimer <= 0) {
        spawnHunter(true);
        spawnTimer = 1.55;
      }
      for (enemy in enemies.copy()) {
        enemy.x += 110 * delta;
        if (enemy.x > 980) removeActor(enemies, enemy);
        else if (player.overlaps(enemy) && invulnerability <= 0) damagePlayer("HUNTING");
      }
    } else {
      movePlayer(delta, 230);
      if (FlxG.keys.justPressed.F || FlxG.mouse.justPressed) fireBullet();
      if (spawnTimer <= 0) {
        spawnPrey();
        spawnTimer = 1.0 + Math.random() * 0.5;
      }
      updateCombat(delta);
      if (score >= 12) finish("EXTRACCIÓN COMPLETADA // 12 PRESAS");
    }
  }

  function updateAmbush(delta:Float):Void {
    movePlayer(delta, 250);
    if (role == "hunter") {
      if (FlxG.keys.justPressed.F || FlxG.mouse.justPressed) fireBullet();
    } else if (FlxG.keys.justPressed.X && attackCooldown <= 0) {
      attackCooldown = 0.55;
      for (enemy in enemies.copy()) {
        if (Math.abs(enemy.x - player.x) < 120 && Math.abs(enemy.y - player.y) < 90) {
          removeActor(enemies, enemy);
          score++;
        }
      }
    }
    if (spawnTimer <= 0) {
      if (role == "hunter") spawnPrey(); else spawnHunter(false);
      spawnTimer = Math.max(0.42, 1.6 - wave * 0.045);
    }
    updateCombat(delta);
    if (enemies.length == 0 && elapsedTotal > wave * 7) {
      wave++;
      health = Std.int(Math.min(5, health + 1));
    }
  }

  function updateRace(delta:Float):Void {
    if (FlxG.keys.justPressed.UP || FlxG.keys.justPressed.W) lane = Std.int(Math.max(0, lane - 1));
    if (FlxG.keys.justPressed.DOWN || FlxG.keys.justPressed.S) lane = Std.int(Math.min(4, lane + 1));
    if (FlxG.keys.justPressed.SPACE && jumpHeight <= 0) jumpVelocity = -470;
    if (FlxG.keys.justPressed.X && attackCooldown <= 0) {
      attackCooldown = 1.2;
      invulnerability = 0.8;
    }
    jumpVelocity += 1180 * delta;
    jumpHeight = Math.min(0, jumpHeight + jumpVelocity * delta);
    if (jumpHeight >= 0) jumpVelocity = 0;
    player.y = 115 + lane * 62 + jumpHeight;
    raceProgress += 92 * delta;
    worldDistance = raceProgress;

    if (spawnTimer <= 0) {
      var hazard = new FlxSprite(980, 430).makeGraphic(36, 34, FlxColor.fromRGB(126, 87, 54));
      hazards.push(hazard);
      add(hazard);
      spawnTimer = 2.0 + Math.random() * 1.5;
    }
    for (item in hazards.copy()) {
      item.x -= 180 * delta;
      if (item.x < -50) removeActor(hazards, item);
      else if (player.overlaps(item) && invulnerability <= 0) {
        raceProgress = Math.max(0, raceProgress - 36);
        invulnerability = 0.8;
      }
    }
    if (raceProgress >= 10000) finish("META CRUZADA // 10.000 M");
  }

  function movePlayer(delta:Float, speed:Float):Void {
    var horizontal = 0;
    var vertical = 0;
    if (FlxG.keys.pressed.LEFT || FlxG.keys.pressed.A) horizontal--;
    if (FlxG.keys.pressed.RIGHT || FlxG.keys.pressed.D) horizontal++;
    if (FlxG.keys.pressed.UP || FlxG.keys.pressed.W) vertical--;
    if (FlxG.keys.pressed.DOWN || FlxG.keys.pressed.S) vertical++;
    player.x = Math.max(20, Math.min(870, player.x + horizontal * speed * delta));
    player.y = Math.max(110, Math.min(370, player.y + vertical * speed * delta));
    if (FlxG.keys.justPressed.SPACE && jumpHeight <= 0) jumpVelocity = -330;
    jumpVelocity += 1050 * delta;
    jumpHeight = Math.min(0, jumpHeight + jumpVelocity * delta);
    if (jumpHeight >= 0) jumpVelocity = 0;
    player.y += jumpHeight;
  }

  function spawnHazard():Void {
    var hazard = new FlxSprite(990, 358 - lane * 22).makeGraphic(38, 38, FlxColor.fromRGB(140, 93, 56));
    hazards.push(hazard);
    add(hazard);
  }

  function spawnPrey():Void {
    var enemy = makeActor(990, 350 + (Std.random(3) - 1) * 24, "references/adult-velociraptor-nublarensis.png", FlxColor.fromRGB(163, 178, 107), 54, 52);
    enemy.flipX = true;
    enemies.push(enemy);
    add(enemy);
  }

  function spawnHunter(fromLeft:Bool):Void {
    var x = fromLeft ? -70 : 990;
    var enemy = new FlxSprite(x, 345 + Std.random(40)).makeGraphic(48, 58, FlxColor.fromRGB(135, 61, 47));
    enemies.push(enemy);
    add(enemy);
  }

  function fireBullet():Void {
    if (attackCooldown > 0) return;
    var bullet = new FlxSprite(player.x + player.width - 2, player.y + 24)
      .makeGraphic(18, 6, FlxColor.fromRGB(255, 224, 142));
    bullets.push(bullet);
    add(bullet);
    attackCooldown = role == "hunter" ? 0.24 : 0.6;
  }

  function updateCombat(delta:Float):Void {
    for (bullet in bullets.copy()) {
      bullet.x += 720 * delta;
      if (bullet.x > 980) {
        removeActor(bullets, bullet);
        continue;
      }
      for (enemy in enemies.copy()) {
        if (bullet.overlaps(enemy)) {
          removeActor(bullets, bullet);
          removeActor(enemies, enemy);
          score++;
          break;
        }
      }
    }
    for (enemy in enemies.copy()) {
      var speed = mode == "ambush" ? 120 + wave * 5 : 135;
      enemy.x -= speed * delta;
      if (enemy.x < -90) {
        removeActor(enemies, enemy);
        if (role != "hunter") damagePlayer("EMBOSCADA");
      } else if (player.overlaps(enemy) && invulnerability <= 0) {
        if (role == "hunter") damagePlayer(mode == "ambush" ? "EMBOSCADA" : "HUNTING");
        else {
          removeActor(enemies, enemy);
          score++;
        }
      }
    }
  }

  function damagePlayer(label:String):Void {
    if (invulnerability > 0) return;
    health--;
    invulnerability = 1.0;
    if (health <= 0) finish((locale == "es" ? "OPERACIÓN FALLIDA // " : "MISSION FAILED // ") + label);
  }

  function removeActor(collection:Array<FlxSprite>, actor:FlxSprite):Void {
    collection.remove(actor);
    remove(actor, true);
    actor.destroy();
  }

  function refreshHud():Void {
    var title = switch (mode) {
      case "persecution": locale == "es" ? "PERSECUSIÓN // SUPERVIVENCIA" : "PURSUIT // SURVIVAL";
      case "hunting": locale == "es" ? "CACERÍA // TIME ATTACK" : "HUNTING // TIME ATTACK";
      case "ambush": (locale == "es" ? "EMBOSCADA // OLEADA " : "AMBUSH // WAVE ") + wave;
      case "race": "BREAKING RACE // ";
      default: "FRANTIC SEARCH";
    };
    hud.text = title;
    subHud.text = switch (mode) {
      case "persecution": (locale == "es" ? "DISTANCIA " : "DISTANCE ") + Std.int(worldDistance) + " M  //  " + (locale == "es" ? "VIDA " : "HEALTH ") + health + "/5  //  CHECKPOINT " + Std.int(checkpoint);
      case "hunting": (role == "predator" ? (locale == "es" ? "DEPREDADOR" : "PREDATOR") : (locale == "es" ? "PRESAS " : "TARGETS ")) + score + "/12  //  HP " + health;
      case "ambush": (locale == "es" ? "BAJAS " : "KILLS ") + score + "  //  " + (locale == "es" ? "VIDA " : "HEALTH ") + health + "/5";
      case "race": (locale == "es" ? "DISTANCIA " : "DISTANCE ") + Std.int(raceProgress) + " / 10000 M  //  " + (locale == "es" ? "CARRIL " : "LANE ") + (lane + 1);
      default: "";
    };
  }

  public function setPaused(value:Bool):Void {
    if (finished || value == paused) return;
    paused = value;
    sendParent({ type: "frantic-engine-paused", paused: paused });
  }

  public function setLocale(value:String):Void {
    locale = value == "en" ? "en" : "es";
    refreshHud();
  }

  function finish(result:String):Void {
    if (finished) return;
    finished = true;
    paused = true;
    sendParent({ type: "frantic-engine-finished", result: result });
  }

  static function sendParent(message:Dynamic):Void {
    #if js
    Browser.window.parent.postMessage(message, "*");
    #end
  }

  override public function destroy():Void {
    if (current == this) current = null;
    super.destroy();
  }
}

class PersecutionState extends MinigameState {
  public function new(options:Dynamic, locale:String) super("persecution", options, locale);
}
class HuntingState extends MinigameState {
  public function new(options:Dynamic, locale:String) super("hunting", options, locale);
}
class AmbushState extends MinigameState {
  public function new(options:Dynamic, locale:String) super("ambush", options, locale);
}
class RaceState extends MinigameState {
  public function new(options:Dynamic, locale:String) super("race", options, locale);
}
