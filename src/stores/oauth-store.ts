import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';

export const useOAuthStore = defineStore('oauth', {
  state: () => ({
    _token: useLocalStorage('pinia/oauth/token', ''),
  }),
  getters: {
    token: (state) => state._token,
  },
  actions: {
    updateToken(token: string) {
      this._token = token;
    },
  },
});
