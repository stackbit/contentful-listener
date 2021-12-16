import { createClient, ContentfulClientApi, SyncCollection, Entry, Asset } from 'contentful';

export interface CallbackResponse {
    entries: Array<Entry<any>>;
    assets: Array<Asset>;
    deletedEntries: Array<Entry<any>>;
    deletedAssets: Array<Asset>;
}

export type ContentfulListenerCallback = (response: CallbackResponse) => void;

export interface ContentfulInterfaceOptions {
    spaceId: string;
    accessToken: string;
    environment?: string;
    host?: string;
    callback?: ContentfulListenerCallback;
    pollingIntervalMs?: number;
}

export class ContentfulListener {
    private readonly callback?: ContentfulListenerCallback;
    private readonly pollingIntervalMs: number;
    private pollTimeout: NodeJS.Timeout | null;
    private isRunning: boolean;
    private nextSyncToken: string | null;
    private client: ContentfulClientApi;

    constructor({
        spaceId,
        accessToken,
        environment = 'master',
        host = 'preview.contentful.com',
        callback,
        pollingIntervalMs = 1000
    }: ContentfulInterfaceOptions) {
        console.log('[ContentfulListener] init', { spaceId, environment });
        this.callback = callback;
        this.pollingIntervalMs = pollingIntervalMs;
        this.pollTimeout = null;
        this.isRunning = false;
        this.nextSyncToken = null;
        this.client = createClient({
            space: spaceId,
            environment: environment,
            accessToken: accessToken,
            host: host
        });
        this.handleTimeout = this.handleTimeout.bind(this);
    }

    start() {
        console.log('[ContentfulListener] start');
        this.isRunning = true;
        this.setPollTimeout();
    }

    stop() {
        console.log('[ContentfulListener] stop');
        this.isRunning = false;
        if (this.pollTimeout) {
            clearTimeout(this.pollTimeout);
            this.pollTimeout = null;
        }
    }

    setPollTimeout() {
        this.pollTimeout = setTimeout(this.handleTimeout, this.pollingIntervalMs);
    }

    async handleTimeout() {
        this.pollTimeout = null;
        try {
            await this.poll();
        } catch (err) {
            console.error('[ContentfulListener] error in pollCallback', { error: (<Error>err).message });
        }
        if (this.isRunning) {
            this.setPollTimeout();
        }
    }

    async poll() {
        const initial = this.nextSyncToken === null;
        let hasMoreItems = true;
        let hasItems = false;
        const callbackResponse: CallbackResponse = {
            entries: [],
            assets: [],
            deletedEntries: [],
            deletedAssets: []
        };
        while (hasMoreItems) {
            const response: SyncCollection = await this.client.sync({
                initial: this.nextSyncToken === null,
                nextSyncToken: this.nextSyncToken,
                resolveLinks: false
            });

            const filteredResponse: CallbackResponse = {
                entries: response.entries,
                assets: response.assets,
                deletedEntries: response.deletedEntries,
                deletedAssets: response.deletedAssets
            };
            const isEmptyResponse = Object.values(filteredResponse).every((value) => !Array.isArray(value) || value.length === 0);

            if (this.nextSyncToken === response.nextSyncToken || isEmptyResponse) {
                hasMoreItems = false;
            } else {
                hasItems = true;
                callbackResponse.entries = callbackResponse.entries.concat(response.entries);
                callbackResponse.assets = callbackResponse.assets.concat(response.assets);
                callbackResponse.deletedEntries = callbackResponse.deletedEntries.concat(response.deletedEntries);
                callbackResponse.deletedAssets = callbackResponse.deletedAssets.concat(response.deletedAssets);
            }
            this.nextSyncToken = response.nextSyncToken;
        }
        if (!initial && hasItems) {
            console.log(
                `[ContentListener] received sync data, entries: ${callbackResponse.entries.length}, ` +
                    `assets: ${callbackResponse.assets.length}, ` +
                    `deletedEntries: ${callbackResponse.deletedEntries.length}, ` +
                    `deletedAssets: ${callbackResponse.deletedAssets.length}`
            );
            if (this.callback) {
                try {
                    this.callback(callbackResponse);
                } catch (err) {
                    console.log(`[ContentListener] error in notificationCallback, error: ${(<Error>err).message}`);
                }
            }
        }
    }
}
