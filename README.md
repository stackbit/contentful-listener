# Contentful Listener

The Contentful listener listens for content changes in Contentful and invokes the provided callback when such changes occur.

You can use this listener with [Nextjs Hot Content Reload](https://github.com/stackbit/nextjs-hot-content-reload) package when working locally to "hot reload" your browser with fresh content.

Usage:

```typescript
import { ContentfulListener } from '@stackbit/contentful-listener';

const contentfulListener = new ContentfulListener({
    spaceId: process.env.CONTENTFUL_SPACE_ID,
    accessToken: process.env.CONTENTFUL_PREVIEW_API_KEY,
    environment: 'master',
    host: 'preview.contentful.com',
    pollingIntervalMs: 1000,
    callback: (result: CallbackResponse) => {
        // Do something
    }
});

contentfulListener.start();
```

The `result` is a an object having the following interface, very similar to Contentful's [Sync API response](https://contentful.github.io/contentful.js/contentful/9.1.5/Sync.html#.SyncCollection):

```typescript
export interface CallbackResponse {
    entries: Array<Entry<any>>;
    assets: Array<Asset>;
    deletedEntries: Array<Entry<any>>;
    deletedAssets: Array<Asset>;
}
```
