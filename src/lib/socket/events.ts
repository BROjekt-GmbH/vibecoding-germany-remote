export const TERMINAL_EVENTS = {
  CONNECT: 'terminal:connect',
  READY: 'terminal:ready',
  DATA: 'terminal:data',
  RESIZE: 'terminal:resize',
  DISCONNECT: 'terminal:disconnect',
  ERROR: 'terminal:error',
  CONNECT_SHARED: 'terminal:connect-shared',
} as const;

export const UPDATE_EVENTS = {
  SESSIONS_STATE: 'sessions:state',
  HOST_STATUS: 'host:status',
  NOTIFICATIONS_ALERT: 'notifications:alert',
} as const;
