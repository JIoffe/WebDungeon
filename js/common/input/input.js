const MLEFT = 0;
const MUP = 1;
const MRIGHT = 2;
const MDOWN = 3;

const defaultKeys = [
    MLEFT, 37,
    MUP, 38,
    MRIGHT, 39,
    MDOWN, 40
]

class InputSingleton{
    constructor(document){
        this.keyMap = new Map()
        this.state = new Uint8Array(4);

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
        });

        document.addEventListener('keyup', ev => {
            if(!this.keyMap.has(ev.keyCode))
                return;

            const action = this.keyMap.get(ev.keyCode);
            this.state[action] = false;

            if(action === MLEFT || action === MRIGHT)
                this.axisH = 0;
        });
    }

    restoreDefaultKeys(){
        for(let i = 0; i < defaultKeys.length; i += 2){
            this.keyMap.set(defaultKeys[i + 1], defaultKeys[i]);
        }
    }
}

export const Input = new InputSingleton(document);