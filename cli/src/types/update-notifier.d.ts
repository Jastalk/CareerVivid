declare module 'update-notifier' {
    interface Package {
        name: string;
        version: string;
    }

    interface UpdateInfo {
        latest: string;
        current: string;
        type: 'latest' | 'major' | 'minor' | 'patch' | 'prerelease' | 'build';
        name: string;
    }

    interface NotifyOptions {
        message?: string;
        defer?: boolean;
        isGlobal?: boolean;
        boxenOptions?: any;
    }

    interface UpdateNotifier {
        update?: UpdateInfo;
        notify(options?: NotifyOptions): void;
    }

    interface Options {
        pkg?: Package;
        updateCheckInterval?: number;
        shouldNotifyInNpmScript?: boolean;
        distTag?: string;
    }

    export default function updateNotifier(options?: Options): UpdateNotifier;
}
