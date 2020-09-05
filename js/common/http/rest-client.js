class RestClientSingleton{
    constructor(){
        
    }

    async getJSON(path){
        const response = await fetch(path);
        return await response.json();
    }
}

export const RestClient = new RestClientSingleton();