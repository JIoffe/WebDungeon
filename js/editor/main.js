import { Renderer } from '../common/renderer';
import { Camera } from '../common/camera';
import { quat, vec3 } from 'gl-matrix';

import * as _math from '../common/math';

//Key Config
//Default movement controls: WASD
const keys = {
    FORWARD: 87,
    BACKWARD: 83,
    LEFT: 65,
    RIGHT: 68
};

//Buffer to hold keys pressed this frame
const keysPressed = new Uint8Array(256).fill(0);
const mouseButtonsPressed = new Uint8Array(3).fill(0);

//Chrome is a little buggy with movementX/Y
var prevMouseX = 0;
var prevMouseY = 0;
var mouseDX = 0;
var mouseDY = 0;

var CAMERA_MOVE_SPEED = 0.025;
var CAMERA_TURN_SPEED = -0.005;

var timePrev = 0;


(function(d){
    //Keep track of different cameras per viewport
    var viewportCameras = new Map();

    var renderer;
    var scene = {
        camera: new Camera()
    }

    scene.camera.pos[2] = 20;

    //For edit controls
    var activeViewport = null;

    d.addEventListener('DOMContentLoaded', () => {
        renderer = new Renderer(d.getElementById('viewport'));

        renderer.init();
        window.requestAnimationFrame(mainLoop);

        d.querySelectorAll('.glviewport').forEach(viewport => {
            viewportCameras.set(viewport, scene.camera);
            activeViewport = viewport;

            viewport.addEventListener('mousedown', onViewPortMouseDown);
            viewport.addEventListener('mouseup', onViewPortMouseUp);
            viewport.addEventListener('mousemove', onViewPortMouseMove);
        });
    });

    d.addEventListener('keypress', ev => false);
    d.addEventListener('keydown', ev => keysPressed[ev.keyCode] = 1);
    d.addEventListener('keyup', ev => keysPressed[ev.keyCode] = 0);

    function mainLoop(time){
        //Delta Time in MILLISECONDS
        const dT = time - timePrev;
        timePrev = time;

        handleInput(dT);
        renderer.render(time, scene);

        window.requestAnimationFrame(mainLoop);
    }

    function onViewPortMouseDown(ev){
        mouseButtonsPressed[ev.button] = 1;
        prevMouseX = ev.pageX;
        prevMouseY = ev.pageY;
        mouseDX = mouseDY = 0;
    }

    function onViewPortMouseUp(ev){
        mouseButtonsPressed[ev.button] = 0;
        mouseDX = mouseDY = 0;
    }

    function onViewPortMouseMove(ev){
        mouseDX = ev.pageX - prevMouseX;
        mouseDY = ev.pageY - prevMouseY;

        prevMouseX = ev.pageX;
        prevMouseY = ev.pageY;
    }

    function handleInput(dT){
        if(!!activeViewport){
            const activeCamera = viewportCameras.get(activeViewport);

            if(keysPressed[keys.FORWARD]){
                _math.moveRelativeZ(activeCamera.pos, activeCamera.rot, dT * CAMERA_MOVE_SPEED);
            }else if(keysPressed[keys.BACKWARD]){
                _math.moveRelativeZ(activeCamera.pos, activeCamera.rot, -dT * CAMERA_MOVE_SPEED);
            }

            if(keysPressed[keys.RIGHT]){
                _math.moveRelativeX(activeCamera.pos, activeCamera.rot, dT * CAMERA_MOVE_SPEED);
            }else if(keysPressed[keys.LEFT]){
                _math.moveRelativeX(activeCamera.pos, activeCamera.rot, -dT * CAMERA_MOVE_SPEED);
            }

            if(!!mouseButtonsPressed[0]){ 
                viewportCameras.get(activeViewport).adjustToMouse(CAMERA_TURN_SPEED * dT * mouseDY,
                    CAMERA_TURN_SPEED * dT * mouseDX);
            }
        }
    }
})(document)