import { createClient } from '@blinkdotnew/sdk';

export const blink = createClient({
  projectId: 'anonmask-anonymous-confession-app-g181s21v',
  authRequired: true,
});

export default blink;