function main() {
	var scene = new g.Scene({game: g.game});
	scene.loaded.add(function () {
		var rect = new g.FilledRect({
			scene: scene,
			cssColor: "black",
			width: g.game.width / 2,
			height: g.game.height / 2
		});
		scene.append(rect);
	});
	g.game.pushScene(scene);
}
module.exports = main;
