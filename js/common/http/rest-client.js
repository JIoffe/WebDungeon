class RestClientSingleton{
    constructor(){
        
    }

    async getJSON(path){
        const response = await fetch(path);
        const asset = await response.json();
        asset.category = asset.category || path.match(/assets\/(.*)\//)[1];

        return asset;
    }
}

export const RestClient = new RestClientSingleton();