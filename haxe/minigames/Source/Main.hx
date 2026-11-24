import flixel.FlxGame;
import flixel.FlxG;
import openfl.display.Sprite;
#if js
import js.Browser;
import js.html.MessageEvent;
#end

class Main extends Sprite {
  public function new() {
    super();
    #if js
    Browser.window.addEventListener("message", handleMessage);
    #end
    addChild(new FlxGame(960, 540, BootState, 60, 60, true, false));
  }

  #if js
  private function handleMessage(event:MessageEvent):Void {
    if (event.source != Browser.window.parent) return;
    var message:Dynamic = event.data;
    if (message == null || Reflect.field(message, "type") != "frantic-minigame") return;

    var command = Std.string(Reflect.field(message, "command"));
    var mode = Std.string(Reflect.field(message, "mode"));
    switch (command) {
      case "open":
        FlxG.switchState(new BootState());
      case "start":
        var options:Dynamic = Reflect.field(message, "options");
        var locale = Std.string(Reflect.field(message, "locale"));
        FlxG.switchState(MinigameState.forMode(mode, options, locale));
      case "pause":
        if (MinigameState.current != null) MinigameState.current.setPaused(true);
      case "resume":
        if (MinigameState.current != null) MinigameState.current.setPaused(false);
      case "locale":
        if (MinigameState.current != null) MinigameState.current.setLocale(Std.string(Reflect.field(message, "locale")));
      case "exit":
        MinigameState.current = null;
        FlxG.switchState(new BootState());
      default:
    }
  }
  #end
}
