/**
 * Baut Pfade zu Dateien aus /public relativ zur App-Basis.
 * Auf GitHub Pages laeuft die Seite unter /<repo>/, absolute '/foo.png'-Pfade
 * würden dort ins Leere zeigen.
 */
export const useAssetPath = () => {
    const { app } = useRuntimeConfig()

    return (path: string) => `${app.baseURL}${path.replace(/^\/+/, '')}`
}
