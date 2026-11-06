// Browser receives identity/status only. OAuth and Firestore run on the backend.
import type { User, Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import { getAdminSession, setStoredAdminToken, unlinkFirebaseAccount } from './api';
import type { AdminUser } from '../types';
let currentUser: User | null = null;
let connected = false;
const subscribers = new Set<(user: User | null) => void>();
export const getFirebaseAuth = (): Auth | null => null;
export const getFirebaseDb = (): Firestore | null => null;
export const getLoadedFirebaseConfig = () => null;
export async function ensureApp(): Promise<{app: FirebaseApp; config: any}> { throw new Error('Firebase được quản lý tại backend.'); }
export async function ensureAuth(): Promise<Auth> { throw new Error('Hãy dùng OAuth backend.'); }
export async function ensureFirestore(): Promise<Firestore> { throw new Error('Hãy dùng API backend.'); }
export enum OperationType { CREATE='create', UPDATE='update', DELETE='delete', LIST='list', GET='get', WRITE='write' }
export function handleFirestoreError(error: unknown, _operation: OperationType, _path: string | null, _auth?: Auth | null): never { throw error instanceof Error ? error : new Error('Cloud request failed'); }
export function googleSignIn(mode: 'login'|'link'|'sheets' = 'login'): Promise<{user: User; accessToken: string}> {
  return new Promise((resolve,reject) => {
    const popup = window.open(`/api/auth/google/start?mode=${mode}`, 'cms-oauth', 'width=520,height=680');
    if(!popup)return reject(new Error('Cho phép cửa sổ đăng nhập Google.'));
    let finished=false;
    const cleanup=()=>{finished=true;window.removeEventListener('message', receive);clearInterval(timer);clearTimeout(timeout);};
    const receive=async(event:MessageEvent)=>{
      if(event.origin!==location.origin || event.source!==popup || event.data?.type!=='cms-oauth-complete' || finished)return;
      cleanup();
      try {setStoredAdminToken('cookie-session');const result=await getAdminSession();currentUser={uid:result.user.firebaseUid || result.user.email,email:result.user.firebaseEmail || result.user.email,displayName:result.user.displayName} as User;connected=true;subscribers.forEach(callback=>callback(currentUser));resolve({user:currentUser,accessToken:'server-managed'});}catch(error){reject(error);}
    };
    window.addEventListener('message',receive);
    const timer=window.setInterval(()=>{if(popup.closed && !finished){cleanup();reject(new Error('Cửa sổ đăng nhập đã đóng.'));}},500);
    const timeout=window.setTimeout(()=>{cleanup();popup.close();reject(new Error('Phiên đăng nhập đã hết hạn.'));},300000);
  });
}
export const linkCurrentUserAccount = async(): Promise<{user:AdminUser;firebaseUser:User}> => {const result=await googleSignIn('link');return {user:(await getAdminSession()).user,firebaseUser:result.user};};
export const unlinkCurrentUserAccount = async() => (await unlinkFirebaseAccount()).user;
export const getAccessToken = () => connected ? 'server-managed' : null;
export const setAccessToken = (_token: string | null) => {};
export const logoutUser = async() => {currentUser=null;connected=false;subscribers.forEach(callback=>callback(null));};
export const signOutFirebase = logoutUser;
export const onAuthStateChangedListener = (callback:(user: User | null)=>void) => {subscribers.add(callback);callback(currentUser);return ()=>{subscribers.delete(callback);};};
export const initAuth = (success?:(user:User,token:string|null)=>void,failure?:()=>void) => onAuthStateChangedListener(user=>user?success?.(user,'server-managed'):failure?.());
