//A single point of reference for loading and caching assets
export const coreAssetList = [
    '/assets/animations/dungeon_player_anim.json'
]

class AssetsSingleton{
    constructor(){
        this.assetsCache = new Map();
        this.subscribers = [];
    }

    // subscribe(listener){
    //     this.subscribers.push(listener);
    // }

    // async downloadCoreAssets(){
    //     //Maybe in a future version the server can host custom assets :)
    //     const promises = coreAssetList.map(p => this.download(p));
    //     const assets = await Promise.all(promises);

    //     for(let i = 0; i < this.subscribers.length; ++i){
    //         this.subscribers[i].onAssetsDownloaded(assets);
    //     }
    // }

    // async download(path){
    //     if(this.assetsCache.has(path))
    //         return this.assetsCache.get(path);

    //     console.log(`Downloading ${path} from server...`);

    //     const response = await fetch(path);
    //     const data = await response.json();

    //     this.assetsCache.set(path, data);
    //     return data;
    // }
}

export const Assets = new AssetsSingleton();

async function load(path){

}