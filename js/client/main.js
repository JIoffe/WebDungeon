import { vec3, quat, mat4 } from "gl-matrix"
import { Renderer } from "../common/renderer";
import { coreAssetList } from "../common/io/assets";
import { Scene } from "../common/scene/scene";
import { MessageBus } from "../common/messaging/message-bus";
import { MessageType } from "../common/messaging/message-type";
import { RestClient } from "../common/http/rest-client";


var matrix = mat4.create();
var q = quat.create();

console.log('MATRICES');
quat.fromEuler(q, 0, 270 * Math.PI/180, 0);
mat4.fromRotationTranslation(matrix, q, [32, 0, 0]);
console.log(JSON.stringify(Array.from(matrix)));

quat.fromEuler(q, 0, 180 * Math.PI/180, 0);
mat4.fromRotationTranslation(matrix, q, [32, 0, 32]);
console.log(JSON.stringify(Array.from(matrix)));

quat.fromEuler(q, 0, 90 * Math.PI/180, 0);
mat4.fromRotationTranslation(matrix, q, [0, 0, 32]);
console.log(JSON.stringify(Array.from(matrix)));

console.log('END MATRICES');

(function(d){
    var renderer;
    var scene = new Scene();
    var timePrev = 0;

    //Some debug methods
    window.whereAmI = () => {
        console.log(scene.localPlayer.pos, scene.localPlayer.rot);
    }

    window.agroEveryone = () => {
        scene.actors.forEach(a => {
            a.state = 1;
        });
    }

    d.addEventListener('DOMContentLoaded', async () => {
        renderer = new Renderer(d.getElementById('main-viewport'));
        renderer.init();

        let i = coreAssetList.length;
        while(i--){
            const asset = await RestClient.getJSON(coreAssetList[i]);   
            await renderer.resources.onAssetLoaded(asset);
            scene.onAssetLoaded(asset);
        }

        MessageBus.post(MessageType.PLAYER_ADDED, {
            name: "SELF",
            gear: ['sword0', 'mail0_torso', 'leather0_legs', null],
            head: 'head0',
            body: 'arms0',
            state: 0,
            prevState: 0,
            skin: 'human0',
            pos: vec3.fromValues(180,0,80),
            rot: quat.create(),
            rRot: quat.create() //RENDER ROTATION
        })

        //Easier to visualize
        const X = 0;

        scene.onLevelLoaded({
            w: 24,
            h: 24,
            spacing: 5,
            fixedLights: [],
            tiles: [X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,
                    X,X,X,X,X,X,X,X,X,X,X,1,1,1,X,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,X,1,1,1,X,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,X,1,1,1,X,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,X,1,1,1,X,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,X,1,1,1,X,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,X,X,X,X,X,
                    X,X,X,X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,X,X,X,X,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,X,X,X,X,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,X,X,X,X,X,
                    X,1,1,1,1,1,1,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    X,1,1,1,1,1,1,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    X,1,1,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    X,1,1,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    X,1,1,X,X,X,X,X,X,X,X,X,X,X,X,X,1,1,1,1,1,1,1,X,
                    X,1,1,X,X,X,X,X,X,X,X,X,X,1,1,1,1,1,1,1,1,1,1,X,
                    X,1,1,1,1,1,1,1,1,X,X,X,X,1,1,1,1,1,1,1,1,1,1,X,
                    X,1,1,1,1,1,1,1,1,X,X,X,X,1,1,1,1,1,1,1,1,1,1,X,
                    X,1,1,1,1,1,1,1,1,X,X,X,X,1,1,1,1,1,1,X,X,X,X,X,
                    X,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X]
        });

        window.requestAnimationFrame(mainLoop);
    });

    function mainLoop(time){
        //Delta Time in MILLISECONDS
        const dT = time - timePrev;
        timePrev = time;

        scene.update(time, dT);
        renderer.render(scene, scene.mainCamera, time, dT);

        window.requestAnimationFrame(mainLoop);
    }
})(document)