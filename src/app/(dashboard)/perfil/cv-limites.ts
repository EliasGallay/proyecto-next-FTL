// Debe coincidir con serverActions.bodySizeLimit en next.config.ts
export const CV_BODY_LIMIT = '5mb'

// El body del Server Action incluye el overhead de multipart/form-data, así que
// el archivo tiene que quedar un poco por debajo de bodySizeLimit para no ser cortado por Next.js
export const CV_MAX_BYTES = 5 * 1024 * 1024 - 64 * 1024
