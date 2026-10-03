import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL,key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
if(key?.startsWith('sb_secret_'))throw new Error('Use somente a chave pública do Supabase neste aplicativo.');
export const supabase=url&&key?createClient(url,key,{auth:{storageKey:'inventario-4-mares-auth',persistSession:true,autoRefreshToken:true}}):null;
