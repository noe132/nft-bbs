declare namespace NodeJS {
  interface ProcessEnv {
    SSR: string
    NODE_ENV: 'development' | 'production'
  }
}
