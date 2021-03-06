const MLEFT = 0;
const MUP = 1;
const MRIGHT = 2;
const MDOWN = 3;
const MAIN_ATTACK = 4;

const defaultKeys = [
    MLEFT, 37,
    MUP, 38,
    MRIGHT, 39,
    MDOWN, 40,
    MAIN_ATTACK, 32
]

class InputSingleton{
    constructor(document){
        this.keyMap = new Map()
        this.state = new Uint8Array(5);

        this.axisH = 0;
        this.axisV = 0;

        this.restoreDefaultKeys();

        document.addEventListener('keydown', ev => {
            if(!this.keyMap.has(ev.keyCode))
                return;

            const action = this.keyMap.get(ev.keyCode);
            this.state[action] = true;

            if(action === MLEFT)
                this.axisH = -1;
            else if(action === MRIGHT)
                this.axisH = 1;
            else if(action === MUP)
                this.axisV = 1;
            else if(action === MDOWN)
                this.axisV = -1;
        });

        document.addEventListener('keyup', ev => {
            if(!this.keyMap.has(ev.keyCode))
                return;

            const action = this.keyMap.get(ev.keyCode);
            this.state[action] = false;

            if(action === MLEFT && this.axisH === -1)
                this.axisH = 0;
            else if(action === MRIGHT && this.axisH === 1)
                this.axisH = 0;
            else if(action === MUP && this.axisV === 1)
                this.axisV = 0;
            else if(action === MDOWN && this.axisV === -1)
                this.axisV = 0;
        });
    }

    restoreDefaultKeys(){
        for(let i = 0; i < defaultKeys.length; i += 2){
            this.keyMap.set(defaultKeys[i + 1], defaultKeys[i]);
        }
    }
}

export const Input = new InputSingleton(document);