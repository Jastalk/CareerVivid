import { initializeApp, deleteApp } from 'firebase/app';
import {
    Auth,
    GoogleAuthProvider,
    getAuth,
    signInWithPopup,
    User,
} from 'firebase/auth';

const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const isGoogleProviderUser = (user: User) => (
    user.providerData.some(provider => provider.providerId === GoogleAuthProvider.PROVIDER_ID)
);

const getDriveAuthParameters = (user: User) => {
    if (isGoogleProviderUser(user) && user.email) {
        return {
            login_hint: user.email,
            prompt: 'consent',
        };
    }

    return {
        prompt: 'select_account consent',
    };
};

export const getGoogleDriveAccessToken = async (
    user: User,
    primaryAuth: Auth,
    tempAppPrefix: string
) => {
    const provider = new GoogleAuthProvider();
    provider.addScope(GOOGLE_DRIVE_FILE_SCOPE);
    provider.setCustomParameters(getDriveAuthParameters(user));

    // Ensure authDomain targets the canonical Firebase domain (<project-id>.firebaseapp.com)
    // where Google OAuth's /__/auth/handler is guaranteed to be pre-authorized by Google Cloud,
    // preventing Google Error 400 redirect_uri_mismatch.
    const projectId = primaryAuth.app.options.projectId;
    const canonicalAuthDomain = projectId ? `${projectId}.firebaseapp.com` : (primaryAuth.app.options.authDomain || 'jastalk-firebase.firebaseapp.com');

    const tempAppName = `${tempAppPrefix}-${user.uid}-${Date.now()}`;
    const tempApp = initializeApp({
        ...primaryAuth.app.options,
        authDomain: canonicalAuthDomain,
    }, tempAppName);
    const tempAuth = getAuth(tempApp);

    try {
        const result = await signInWithPopup(tempAuth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;
        if (!accessToken) throw new Error('Failed to authorize Google Drive access.');
        return accessToken;
    } finally {
        deleteApp(tempApp).catch(error => console.error('Temp App cleanup failed:', error));
    }
};
