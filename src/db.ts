import {openDB} from 'idb';
export type MediaItem={id:string;blob:Blob;kind:'photo'|'video';created:number;name:string;width?:number;height?:number;edited?:boolean;liveGroup?:string};
const dbPromise=openDB('ultra-media',1,{upgrade(db){db.createObjectStore('media',{keyPath:'id'});}});
export async function saveMedia(item:MediaItem){(await dbPromise).put('media',item);}
export async function getMedia(){return (await dbPromise).getAll('media') as Promise<MediaItem[]>;}
export async function deleteMedia(id:string){(await dbPromise).delete('media',id);}
export async function getOne(id:string){return (await dbPromise).get('media',id) as Promise<MediaItem|undefined>;}
