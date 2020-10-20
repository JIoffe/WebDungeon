import { AggressiveTrash } from "./enemies/aggressive-trash";

class ActorFactorySingleton{
    constructor(){

    }

    create(actorDef){
        switch(actorDef.type){
            default:
                return new AggressiveTrash(actorDef.type, actorDef.pos, actorDef.angle, actorDef.state);
        }
    }
}

export const ActorFactory = new ActorFactorySingleton();