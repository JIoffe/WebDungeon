import { AggressiveTrash } from "./enemies/aggressive-trash";

class ActorFactorySingleton{
    constructor(){

    }

    create(actorDef){
        switch(actorDef.type){
            case 'crabby':
                return new AggressiveTrash(actorDef.type, actorDef.pos, actorDef.angle, actorDef.state);
            default:
                return null;
        }
    }
}

export const ActorFactory = new ActorFactorySingleton();