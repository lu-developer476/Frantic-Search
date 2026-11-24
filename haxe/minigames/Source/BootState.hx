import flixel.FlxG;
import flixel.FlxState;
import flixel.FlxSprite;
import flixel.text.FlxText;
import flixel.text.FlxText.FlxTextAlign;
import flixel.util.FlxColor;
#if js
import js.Browser;
#end

class BootState extends FlxState {
  override public function create():Void {
    super.create();
    FlxG.camera.bgColor = FlxColor.fromRGB(20, 34, 28);
    var backdrop = new FlxSprite(0, 360).makeGraphic(960, 180, FlxColor.fromRGB(33, 54, 39));
    add(backdrop);
    var title = new FlxText(0, 220, 960, "FRANTIC SEARCH // HAXEFLIXEL", 22);
    title.alignment = FlxTextAlign.CENTER;
    title.color = FlxColor.fromRGB(216, 243, 106);
    add(title);
    #if js
    Browser.window.parent.postMessage({ type: "frantic-engine-ready" }, "*");
    #end
  }
}
