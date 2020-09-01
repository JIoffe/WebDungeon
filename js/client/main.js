import { vec3, quat, mat4 } from "gl-matrix"
import { Camera } from '../common/camera'
import { Renderer } from "../common/renderer";
import { Assets } from "../common/io/assets";

(function(d){
    const mainCamera = new Camera(vec3.fromValues(0, 0, 30));

    var renderer;
    var timePrev = 0;

    d.addEventListener('DOMContentLoaded', () => {
        renderer = new Renderer(d.getElementById('main-viewport'));

        renderer.init();

        Assets.downloadCoreAssets();
        window.requestAnimationFrame(mainLoop);
    });

    function mainLoop(time){
        //Delta Time in MILLISECONDS
        const dT = time - timePrev;
        timePrev = time;

        renderer.render(null, mainCamera, time, dT);
        window.requestAnimationFrame(mainLoop);
    }
})(document)