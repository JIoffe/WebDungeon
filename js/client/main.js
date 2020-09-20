import { vec3, quat, mat4 } from "gl-matrix"
import { Renderer } from "../common/renderer";
import { Assets, coreAssetList } from "../common/io/assets";
import { Scene } from "../common/scene/scene";
import { MessageBus } from "../common/messaging/message-bus";
import { MessageType } from "../common/messaging/message-type";
import { RestClient } from "../common/http/rest-client";
import { Animations } from "../common/rendering/animation";
import { DegToRad } from "../common/math";

(function(d){
    var renderer;
    var scene = new Scene();
    var timePrev = 0;

    //Some debug methods
    window.whereAmI = () => {
        console.log(scene.localPlayer.pos, scene.localPlayer.rot);
    }

    d.addEventListener('DOMContentLoaded', async () => {
        renderer = new Renderer(d.getElementById('main-viewport'));
        renderer.init();

        let i = coreAssetList.length;
        while(i--){
            const asset = await RestClient.getJSON(coreAssetList[i]);   
            await renderer.resources.onAssetLoaded(asset);
            Animations.onAssetLoaded(asset);
        }

        MessageBus.post(MessageType.PLAYER_ADDED, {
            name: "SELF",
            ///gear: ['bare_head0', 'mail0_torso', 'leather0_legs', 'bare_arm']
            gear: [null, 'mail0_torso', 'leather0_legs', null],
            head: 'head0',
            body: 'arms0',
            state: 0,
            prevState: 0,
            skin: 'human0',
            pos: vec3.fromValues(180,0,60),
            rot: quat.create(),
            rRot: quat.create() //RENDER ROTATION
        })

        //To mark the tile empty
        const X = -1;
        const A = 10;
        const B = 11;
        const C = 12;
        const D = 13;
        const E = 14;
        const F = 15;

        scene.level = {
            w: 24,
            h: 24,
            spacing: 5,
            tiles: [X,5,5,5,4,5,5,4,5,5,5,4,5,5,4,5,5,5,4,5,4,5,5,X,
                    8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,
                    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,A,
                    8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,
                    X,7,7,7,7,7,7,7,7,7,C,0,0,0,D,7,7,7,7,7,7,7,7,X,
                    X,X,X,X,X,X,X,X,X,X,1,0,0,0,6,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,8,0,0,0,6,X,X,X,X,X,X,X,X,X,
                    X,X,X,X,X,X,X,X,X,X,1,0,0,0,6,X,X,X,X,X,X,X,X,X,
                    X,X,X,1,5,5,4,5,4,5,B,0,0,0,2,5,4,5,X,X,X,X,X,X,
                    X,X,X,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,X,X,X,X,X,
                    X,5,5,B,0,0,0,0,0,0,0,0,0,0,0,0,0,0,A,X,X,X,X,X,
                    1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,A,X,X,X,X,X,
                    8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,X,X,X,X,X,
                    1,0,0,0,0,0,0,D,7,7,7,7,7,7,7,7,7,7,X,X,X,X,X,X,
                    1,0,0,0,0,0,0,6,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    1,0,0,D,7,7,7,1,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,X,
                    8,0,0,6,X,X,X,X,X,X,X,X,X,X,X,X,5,5,5,4,4,5,5,X,
                    1,0,0,A,X,X,X,X,X,X,X,X,1,4,5,B,0,0,0,0,0,0,0,6,
                    8,0,0,2,5,4,5,4,5,X,X,X,8,0,0,0,0,0,0,0,0,0,0,A,
                    1,0,0,0,0,0,0,0,0,6,X,X,1,0,0,0,0,0,0,0,0,0,0,A,
                    1,0,0,0,0,0,0,0,0,A,X,X,8,0,0,0,0,0,0,0,0,0,0,6,
                    8,0,0,0,0,0,0,0,0,2,4,5,B,0,0,0,0,0,0,D,7,7,7,X,
                    8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,X,X,X,X,
                    X,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,X,X,X,X]
        }

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