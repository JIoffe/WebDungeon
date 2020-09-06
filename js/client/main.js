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
            pos: vec3.create(),
            rot: quat.create(),
            rRot: quat.create() //RENDER ROTATION
        })

        scene.level = {
            w: 8,
            h: 8,
            spacing: 30,
            tiles: [0,0,0,0,0,0,0,0,
                    0,1,1,1,1,1,1,0,
                    0,1,1,1,1,1,1,0,
                    0,0,0,0,0,1,1,0,
                    0,1,1,1,1,1,1,0,
                    0,1,1,1,0,1,1,0,
                    0,1,1,1,0,1,1,0,
                    0,0,0,0,0,0,0,0]
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