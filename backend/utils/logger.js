const log = (level, message) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
};

export const info = (msg) => log('INFO', msg);
export const warn = (msg) => log('WARN', msg);
export const error = (msg) => log('ERROR', msg);