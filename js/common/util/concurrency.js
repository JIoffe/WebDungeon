export class MutexLock{
    constructor(){
        this.queue = [];
    }

    //Should have some kind of timeout / rejection / cancel mechanism
    acquire(){
        const ref = {};
        this.queue.push(ref);
        return new Promise((resolve, reject) => {
            //My bones tell me that this is better than a while(True)
            //equivalent but who knows. Maybe JS sleeps on its own.
            const _this = this;
            function tick(){
                if(_this.queue[0] === ref){
                    resolve(_this);
                }
                setTimeout(tick, 2);
            }
            tick();
        });
    }

    release(){
        this.queue.shift();
    }
}
export class KeyedMutex{
    constructor(){
        this.locks = new Map();
    }

    async acquire(key){
        if(this.locks.has(key)){
            return await this.locks.get(key).acquire();
        }

        let lock = new MutexLock();
        this.locks.set(key, lock);
        return await lock.acquire();
    }
}